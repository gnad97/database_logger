const { app, BrowserWindow, ipcMain, Menu, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");

const { MongoClient } = require("mongodb");
const { Client: PgClient } = require("pg");
const mysql = require("mysql2/promise");

const ENCRYPTED_FIELDS = ["uri", "password"];
const settingsFilePath = () =>
  path.join(app.getPath("userData"), "connections.json");

function loadSettings() {
  try {
    const raw = fs.readFileSync(settingsFilePath(), "utf-8");
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.map((item) => {
      const out = { ...item };
      for (const field of ENCRYPTED_FIELDS) {
        if (out[field]) {
          try {
            out[field] = safeStorage.decryptString(
              Buffer.from(out[field], "base64")
            );
          } catch {
            out[field] = "";
          }
        }
      }
      return out;
    });
  } catch {
    return [];
  }
}

function saveSettings(list) {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error("Encryption is not available on this system.");
  }
  const encrypted = (Array.isArray(list) ? list : []).map((item) => {
    const out = { ...item };
    for (const field of ENCRYPTED_FIELDS) {
      if (out[field]) {
        out[field] = safeStorage.encryptString(String(out[field])).toString("base64");
      }
    }
    return out;
  });
  fs.mkdirSync(path.dirname(settingsFilePath()), { recursive: true });
  fs.writeFileSync(
    settingsFilePath(),
    JSON.stringify(encrypted, null, 2),
    "utf-8"
  );
}

ipcMain.handle("settings:load", () => loadSettings());
ipcMain.handle("settings:save", (_event, list) => {
  saveSettings(list);
  return true;
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    icon: path.join(__dirname, "../tequila-logo.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, "../build/index.html"));
  } else {
    win.loadURL("http://localhost:3000");
  }
  //   win.openDevTools();
  Menu.setApplicationMenu(null);
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("db-connect", async (event, { dbType, connectionInfo }) => {
  try {
    if (dbType === "mongodb") {
      const client = new MongoClient(sanitizeMongoUri(connectionInfo.uri), {
        serverSelectionTimeoutMS: 5000,
      });
      await client.connect();
      const dbs = await client.db().admin().listDatabases();
      await client.close();
      return { success: true, databases: dbs.databases.map((db) => db.name) };
    } else if (dbType === "postgresql") {
      const client = new PgClient({
        host: connectionInfo.host,
        port: connectionInfo.port,
        user: connectionInfo.username,
        password: connectionInfo.password,
        database: connectionInfo.database,
        connectionTimeoutMillis: 5000,
      });
      await client.connect();
      const res = await client.query(
        "SELECT datname FROM pg_database WHERE datistemplate = false;"
      );
      await client.end();
      return { success: true, databases: res.rows.map((r) => r.datname) };
    } else if (dbType === "sql") {
      const conn = await mysql.createConnection({
        host: connectionInfo.host,
        port: connectionInfo.port,
        user: connectionInfo.username,
        password: connectionInfo.password,
      });
      const [rows] = await conn.query("SHOW DATABASES");
      await conn.end();
      return { success: true, databases: rows.map((r) => r.Database) };
    }
    return { success: false, error: "Unknown dbType" };
  } catch (err) {
    return { success: false, error: err.message || "Connection failed" };
  }
});

const MONGO_DRIVER_UNSUPPORTED_PARAMS = new Set([
  "loadbalanced",
  "srvmaxhosts",
  "srvservicename",
]);

function sanitizeMongoUri(uri) {
  if (typeof uri !== "string") return uri;
  const qIdx = uri.indexOf("?");
  if (qIdx === -1) return uri;
  const base = uri.slice(0, qIdx);
  const query = uri.slice(qIdx + 1);
  const params = query.split("&").filter((p) => {
    if (!p) return false;
    const key = p.split("=")[0].toLowerCase();
    return !MONGO_DRIVER_UNSUPPORTED_PARAMS.has(key);
  });
  return params.length ? `${base}?${params.join("&")}` : base;
}

function serializeMongo(obj) {
  if (Array.isArray(obj)) return obj.map(serializeMongo);
  if (obj && typeof obj === "object") {
    if (obj._bsontype === "ObjectID" || obj._bsontype === "ObjectId")
      return obj.toString();
    if (obj instanceof Date) return obj.toISOString();
    const out = {};
    for (const k in obj) out[k] = serializeMongo(obj[k]);
    return out;
  }
  return obj;
}

function serializeChangeEvent(change) {
  return {
    operation: change.operationType,
    collection: change.ns && change.ns.coll,
    _id:
      change.documentKey && change.documentKey._id
        ? serializeMongo(change.documentKey._id)
        : undefined,
    time: change.clusterTime
      ? new Date(change.clusterTime.getHighBits() * 1000).toISOString()
      : new Date().toISOString(),
    fullDocument: serializeMongo(change.fullDocument),
    updateDescription: serializeMongo(change.updateDescription),
  };
}

ipcMain.handle("db-list-collections", async (_event, { uri, database }) => {
  let client;
  try {
    client = new MongoClient(sanitizeMongoUri(uri), { serverSelectionTimeoutMS: 5000 });
    await client.connect();
    const colls = await client.db(database).listCollections().toArray();
    await client.close();
    return colls.map((c) => c.name);
  } catch {
    if (client) {
      try {
        await client.close();
      } catch {}
    }
    return [];
  }
});

const mongoStreams = {};
const MAX_BACKOFF_MS = 30000;
const INITIAL_BACKOFF_MS = 1000;

function startMongoWatch({ uri, database, channel, sender }) {
  const state = {
    stopped: false,
    client: null,
    stream: null,
    resumeToken: null,
    backoffMs: INITIAL_BACKOFF_MS,
    retryTimer: null,
  };

  const safeSend = (ch, payload) => {
    if (sender && !sender.isDestroyed()) sender.send(ch, payload);
  };

  const closeResources = async () => {
    try {
      if (state.stream) await state.stream.close();
    } catch {}
    try {
      if (state.client) await state.client.close();
    } catch {}
    state.stream = null;
    state.client = null;
  };

  state.teardown = async () => {
    state.stopped = true;
    if (state.retryTimer) {
      clearTimeout(state.retryTimer);
      state.retryTimer = null;
    }
    await closeResources();
  };

  const scheduleReconnect = () => {
    if (state.stopped) return;
    const delay = Math.min(state.backoffMs, MAX_BACKOFF_MS);
    state.backoffMs = Math.min(state.backoffMs * 2, MAX_BACKOFF_MS);
    state.retryTimer = setTimeout(connect, delay);
  };

  const handleStreamError = async (err) => {
    safeSend(`${channel}-error`, (err && err.message) || "Change stream error");
    await closeResources();
    const msg = String((err && err.message) || "");
    if (err && (err.code === 40585 || /resume\s*token/i.test(msg))) {
      state.resumeToken = null;
    }
    scheduleReconnect();
  };

  async function connect() {
    if (state.stopped) return;
    state.retryTimer = null;
    try {
      state.client = new MongoClient(sanitizeMongoUri(uri), { serverSelectionTimeoutMS: 5000 });
      await state.client.connect();
      const db = state.client.db(database);
      const options = { fullDocument: "updateLookup" };
      if (state.resumeToken) options.resumeAfter = state.resumeToken;
      state.stream = db.watch([], options);
      state.backoffMs = INITIAL_BACKOFF_MS;
      state.stream.on("change", (change) => {
        state.resumeToken = change._id;
        safeSend(channel, serializeChangeEvent(change));
      });
      state.stream.on("error", handleStreamError);
    } catch (err) {
      safeSend(
        `${channel}-error`,
        (err && err.message) || "Cannot open change stream"
      );
      await closeResources();
      scheduleReconnect();
    }
  }

  mongoStreams[channel] = state;
  connect();
}

ipcMain.on("db-watch-log", (event, { uri, database, channel }) => {
  if (!channel) return;
  if (mongoStreams[channel]) {
    const prev = mongoStreams[channel];
    delete mongoStreams[channel];
    prev.teardown && prev.teardown();
  }
  startMongoWatch({ uri, database, channel, sender: event.sender });
});

ipcMain.on("db-log-unsubscribe", (_event, { channel }) => {
  if (channel && mongoStreams[channel]) {
    const state = mongoStreams[channel];
    delete mongoStreams[channel];
    state.teardown && state.teardown();
  }
});

app.on("before-quit", async () => {
  const channels = Object.keys(mongoStreams);
  await Promise.all(
    channels.map(async (ch) => {
      const state = mongoStreams[ch];
      delete mongoStreams[ch];
      try {
        await (state.teardown && state.teardown());
      } catch {}
    })
  );
});
