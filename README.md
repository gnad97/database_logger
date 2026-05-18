# Database Logger

Electron desktop app để xem log từ nhiều database (MongoDB, PostgreSQL, MySQL).

---

## Yêu cầu môi trường

Repo này pin chặt version để tránh sai lệch môi trường giữa các máy dev. **Cài đúng các version dưới đây trước khi setup.**

| Tool       | Version    | Ghi chú                                              |
| ---------- | ---------- | ---------------------------------------------------- |
| Node.js    | `20.20.2`  | Pin trong [.nvmrc](.nvmrc) và `engines` package.json |
| npm        | `11.6.2`   | Đi kèm Node 20.20.2                                  |
| OS         | macOS / Windows / Linux | Electron 30 hỗ trợ cả 3                 |

> Nếu Node/npm khác version, `npm ci` sẽ báo lỗi (do `engine-strict=true` trong [.npmrc](.npmrc)).

### Cài Node bằng nvm (khuyến nghị)

[nvm](https://github.com/nvm-sh/nvm) cho macOS/Linux hoặc [nvm-windows](https://github.com/coreybutler/nvm-windows) cho Windows:

```bash
nvm install      # cài đúng version trong .nvmrc (chỉ lần đầu)
nvm use          # switch sang version đúng mỗi khi vào repo
node --version   # phải in ra: v20.20.2
npm --version    # phải in ra: 11.6.2
```

---

## Setup

### 1. Clone repo

```bash
git clone <repo-url>
cd database_logger
```

### 2. Switch Node version

```bash
nvm use
```

### 3. Cài dependencies

**Luôn dùng `npm ci`**, KHÔNG dùng `npm install`:

```bash
npm ci
```

`npm ci` cài đúng version trong [package-lock.json](package-lock.json), không bao giờ nhảy version. Script `preinstall` sẽ chặn `npm install` để tránh nhầm lẫn.

---

## Chạy app ở chế độ dev

```bash
npm start
```

Lệnh này chạy song song:
- `react-scripts start` — dev server React tại `http://localhost:3000` (hot reload).
- `electron .` — mở cửa sổ Electron, load từ `localhost:3000` (chờ React server sẵn sàng nhờ `wait-on`).

Sửa code trong [src/](src/) → React hot-reload. Sửa code trong [public/electron.js](public/electron.js) hoặc [public/preload.js](public/preload.js) → **phải restart `npm start`** (Electron main process không hot-reload).

---

## Build production

### Build local (cho OS hiện tại)

```bash
npm run build
```

Lệnh này chạy 2 bước:
1. `react-scripts build` → output frontend vào `build/`.
2. `electron-builder` → đóng gói installer vào `dist/`.

Mặc định `electron-builder` chỉ build cho OS hiện tại. Build cho OS khác cần Wine/Mono — không khuyến nghị; dùng CI bên dưới.

### Build Windows release qua GitHub Actions

Workflow [.github/workflows/release.yml](.github/workflows/release.yml) chạy trên `windows-latest` runner. Trigger: push tag dạng `v*`.

**Tạo release mới:**

```bash
# 1. Bump version trong package.json (vd: 1.0.0 -> 1.0.1) rồi commit
git commit -am "release: v1.0.1"

# 2. Tag và push
git tag v1.0.1
git push origin main --tags
```

Workflow sẽ tự động:
1. Cài Node theo `.nvmrc` + `npm ci`.
2. Chạy `npm run build` → tạo `.exe` trong `dist/`.
3. Upload installer lên **GitHub Releases** của repo (https://github.com/gnad97/database_logger/releases).

**Build thử không tạo release:** vào tab Actions → chọn workflow "Release Windows Build" → "Run workflow" (manual dispatch). Installer sẽ nằm ở phần workflow artifacts (không lên Releases).

---

## Cấu trúc thư mục

```
database_logger/
├── public/
│   ├── electron.js       # Electron main process (IPC, kết nối DB)
│   ├── preload.js        # Bridge giữa renderer và main
│   └── index.html
├── src/                  # React renderer
│   ├── App.jsx
│   ├── components/
│   │   ├── ConnectionForm.jsx
│   │   ├── LogViewer.jsx
│   │   └── SettingManagerDialog.jsx
│   └── index.js
├── scripts/
│   └── check-install.js  # Chặn npm install, ép dùng npm ci
├── .nvmrc                # Pin Node version
├── .npmrc                # engine-strict=true
└── package.json          # engines + dependencies
```

---

## Thêm / cập nhật dependency

`npm install` mặc định bị chặn. Khi cần thêm hoặc bump package:

```bash
ALLOW_INSTALL=1 npm install <package-name>          # thêm dep
ALLOW_INSTALL=1 npm install <package-name>@<ver>    # bump version
```

Sau khi xong:
1. Verify app vẫn chạy: `npm start`.
2. **Commit cả `package.json` và `package-lock.json`** — nếu thiếu một trong hai, team khác sẽ bị lệch version.

---

## Troubleshooting

**`npm ci` báo `EBADENGINE`**
→ Node/npm sai version. Chạy `nvm use` rồi thử lại.

**`npm ci` báo `npm ci can only install packages when your package.json and package-lock.json ... are in sync`**
→ Lock file lệch với package.json. Pull lại branch mới nhất; nếu vẫn lệch thì có người commit thiếu `package-lock.json`.

**`npm install` báo `[ERROR] Use "npm ci" instead`**
→ Đúng rồi, đó là chặn cố ý. Dùng `npm ci`. Nếu thật sự cần thêm dep, prefix `ALLOW_INSTALL=1`.

**Electron không mở / báo lỗi `Cannot find module`**
→ Xóa `node_modules` và cài lại: `rm -rf node_modules && npm ci`.

**Sửa `public/electron.js` mà không thấy thay đổi**
→ Electron main process không hot-reload. Stop `npm start` (Ctrl+C) rồi chạy lại.
