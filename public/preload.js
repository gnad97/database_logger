const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  connect: (dbType, connectionInfo) =>
    ipcRenderer.invoke("db-connect", { dbType, connectionInfo }),

  listCollections: (uri, database) =>
    ipcRenderer.invoke("db-list-collections", { uri, database }),

  watchLog: (uri, database, channel) =>
    ipcRenderer.send("db-watch-log", { uri, database, channel }),

  unsubscribeLog: (channel) =>
    ipcRenderer.send("db-log-unsubscribe", { channel }),

  onLog: (channel, handler) => {
    const wrapped = (_evt, log) => handler(log);
    ipcRenderer.on(channel, wrapped);
    return () => ipcRenderer.removeListener(channel, wrapped);
  },

  onLogError: (channel, handler) => {
    const wrapped = (_evt, msg) => handler(msg);
    const errChannel = `${channel}-error`;
    ipcRenderer.on(errChannel, wrapped);
    return () => ipcRenderer.removeListener(errChannel, wrapped);
  },

  loadSettings: () => ipcRenderer.invoke("settings:load"),
  saveSettings: (list) => ipcRenderer.invoke("settings:save", list),
});
