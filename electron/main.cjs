// Dolap masaüstü uygulaması — Electron ana süreci.
// Arayüz, Vite ile derlenen dist/ klasöründen yüklenir; Node.js erişimi arayüze açılmaz.
const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const update = require('./update-core.cjs');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const ICON = path.join(__dirname, '..', 'build', 'icon.png');

const FILE_FILTERS = {
  pdf: { name: 'PDF belgesi', extensions: ['pdf'] },
  xlsx: { name: 'Excel çalışma kitabı', extensions: ['xlsx'] },
  dxf: { name: 'DXF çizimi', extensions: ['dxf'] },
  json: { name: 'Dolap proje yedeği', extensions: ['json'] },
};

// Taşınabilir sürüm: projeler .exe'nin yanındaki "Dolap-Dosyalari\veriler" klasöründe tutulur
// (başlatıcı DOLAP_PORTABLE_DATA ile bildirir). Böylece .exe ile klasör birlikte taşınınca projeler de gider.
const PORTABLE_DATA = process.env.DOLAP_PORTABLE_DATA || '';
if (PORTABLE_DATA) {
  try {
    const previous = app.getPath('userData');
    fs.mkdirSync(PORTABLE_DATA, { recursive: true });
    // İlk açılışta bu bilgisayarda daha önce kaydedilmiş projeler taşınabilir klasöre kopyalanır
    if (!fs.existsSync(path.join(PORTABLE_DATA, 'IndexedDB')) && fs.existsSync(path.join(previous, 'IndexedDB'))) {
      for (const dir of ['IndexedDB', 'Local Storage']) {
        const src = path.join(previous, dir);
        if (fs.existsSync(src)) fs.cpSync(src, path.join(PORTABLE_DATA, dir), { recursive: true });
      }
    }
    app.setPath('userData', PORTABLE_DATA);
  } catch (err) {
    console.error('Taşınabilir veri klasörü kullanılamadı', err);
  }
}

// Tek pencere: ikinci açılış mevcut pencereyi öne getirir. Güncellemeden hemen sonra açılan yeni sürüm,
// eski sürüm kapanana kadar birkaç saniye bekler.
const AFTER_UPDATE = process.argv.includes('--guncellendi');
let gotLock = app.requestSingleInstanceLock();
if (!gotLock && !AFTER_UPDATE) app.quit();

let mainWindow = null;
let splash = null;

/** Program açılırken hemen görünen küçük açılış ekranı; ana pencere hazır olunca kapanır. */
function createSplash() {
  splash = new BrowserWindow({
    width: 420, height: 260, frame: false, resizable: false, movable: true, center: true,
    show: true, skipTaskbar: false, title: 'Dolap', icon: ICON, backgroundColor: '#ffffff',
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: false },
  });
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Dolap</title><style>
    html,body{margin:0;height:100%;font-family:"Segoe UI",system-ui,sans-serif;background:#fff;color:#27272a;overflow:hidden;user-select:none}
    body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;border:1px solid #e4e4e7;box-sizing:border-box}
    .logo{width:64px;height:64px}
    h1{margin:0;font-size:22px;letter-spacing:.3em;color:#ea580c;font-weight:700}
    p{margin:0;font-size:13px;color:#71717a}
    .bar{width:180px;height:4px;border-radius:2px;background:#f4f4f5;overflow:hidden;position:relative}
    .bar::after{content:"";position:absolute;inset:0;width:40%;border-radius:2px;background:#ea580c;animation:k 1.1s ease-in-out infinite}
    @keyframes k{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}
    .v{position:absolute;bottom:10px;font-size:11px;color:#a1a1aa}
  </style></head><body>
    <svg class="logo" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="12" fill="#ea580c"/>
      <rect x="16" y="14" width="32" height="38" rx="2" fill="none" stroke="#fff" stroke-width="3.5"/>
      <line x1="32" y1="14" x2="32" y2="52" stroke="#fff" stroke-width="3"/>
      <circle cx="28" cy="33" r="2" fill="#fff"/><circle cx="36" cy="33" r="2" fill="#fff"/></svg>
    <h1>DOLAP</h1><p>Açılıyor…</p><div class="bar"></div><div class="v">${app.getVersion()}</div>
  </body></html>`;
  splash.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  splash.on('closed', () => { splash = null; });
}

function closeSplash() {
  if (splash && !splash.isDestroyed()) splash.destroy();
  splash = null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    show: false,
    title: 'Dolap',
    icon: ICON,
    backgroundColor: '#f8f8fa',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    closeSplash();
  });
  mainWindow.webContents.once('did-fail-load', closeSplash);

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Dış bağlantılar sistem tarayıcısında açılır; uygulama penceresi başka bir sayfaya gitmez.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith('file://') || (DEV_URL && url.startsWith(DEV_URL));
    if (!allowed) event.preventDefault();
  });

  // PDF / Excel / DXF / yedek dosyaları için "Farklı kaydet" penceresi, varsayılan klasör Belgeler.
  mainWindow.webContents.session.on('will-download', (_event, item) => {
    const fileName = item.getFilename();
    const ext = path.extname(fileName).slice(1).toLowerCase();
    item.setSaveDialogOptions({
      title: 'Dosyayı kaydet',
      defaultPath: path.join(app.getPath('documents'), fileName),
      filters: [FILE_FILTERS[ext] ?? { name: 'Tüm dosyalar', extensions: ['*'] }],
    });
    item.once('done', (_e, state) => {
      if (state === 'completed') {
        const saved = item.getSavePath();
        if (saved) shell.showItemInFolder(saved);
      }
    });
  });
}

// --- Güncelleme: GitHub'daki en güncel sürüm ---
// Yalnızca taşınabilir başlatıcıyla açıldığında çalışır (başlatıcı .exe yolunu DOLAP_LAUNCHER ile bildirir).
const LAUNCHER = process.env.DOLAP_LAUNCHER || '';
const UPDATE_FEED = process.env.DOLAP_UPDATE_URL || update.RELEASES_API;
let updateState = { state: LAUNCHER ? 'idle' : 'unsupported', current: app.getVersion() };
let latest = null;
let downloaded = null;

function setUpdateState(patch) {
  updateState = { ...updateState, ...patch, current: app.getVersion() };
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('update:state', updateState);
}

async function checkForUpdate() {
  if (!LAUNCHER) return updateState;
  if (['checking', 'downloading'].includes(updateState.state)) return updateState;
  setUpdateState({ state: 'checking', error: undefined });
  try {
    latest = await update.fetchLatest(fetch, UPDATE_FEED);
    if (!update.isNewer(latest.version, app.getVersion()) || !latest.asset) {
      setUpdateState({ state: 'none', latest: { version: latest.version, title: latest.title, notes: latest.notes, page: latest.page } });
    } else {
      setUpdateState({
        state: 'available', progress: 0,
        writable: update.canWrite(path.dirname(LAUNCHER)),
        latest: { version: latest.version, title: latest.title, notes: latest.notes, page: latest.page, size: latest.asset.size },
      });
    }
  } catch (err) {
    setUpdateState({ state: 'error', error: err instanceof Error ? err.message : String(err), during: 'check' });
  }
  return updateState;
}

async function downloadUpdate() {
  if (!latest || !latest.asset || updateState.state === 'downloading') return updateState;
  setUpdateState({ state: 'downloading', progress: 0, error: undefined });
  let last = 0;
  try {
    downloaded = await update.downloadAsset(fetch, latest.asset, path.dirname(LAUNCHER), (p) => {
      if (p - last >= 0.01 || p === 1) { last = p; setUpdateState({ progress: p }); }
    });
    setUpdateState({ state: 'ready', progress: 1 });
  } catch (err) {
    setUpdateState({ state: 'error', error: err instanceof Error ? err.message : String(err), during: 'download' });
  }
  return updateState;
}

function installAndRestart() {
  if (!downloaded || updateState.state !== 'ready') return updateState;
  try {
    const exe = update.installUpdate(LAUNCHER, downloaded);
    // Yeni başlatıcı, program kapandıktan sonra yeni sürümü hazırlayıp açar
    spawn(exe, ['--guncellendi'], { detached: true, stdio: 'ignore', cwd: path.dirname(exe) }).unref();
    setImmediate(() => app.quit());
    return { ...updateState, state: 'restarting' };
  } catch (err) {
    setUpdateState({ state: 'error', error: `Güncelleme uygulanamadı: ${err instanceof Error ? err.message : err}`, during: 'install' });
    return updateState;
  }
}

ipcMain.handle('update:state', () => updateState);
ipcMain.handle('update:check', () => checkForUpdate());
ipcMain.handle('update:download', () => downloadUpdate());
ipcMain.handle('update:install', () => installAndRestart());
ipcMain.handle('update:open-page', () => shell.openExternal(update.RELEASES_PAGE));

function buildMenu() {
  const template = [
    {
      label: 'Dosya',
      submenu: [
        { label: 'Verilerin bulunduğu klasörü aç', click: () => shell.openPath(app.getPath('userData')) },
        { type: 'separator' },
        { label: 'Çıkış', role: 'quit' },
      ],
    },
    {
      label: 'Düzen',
      submenu: [
        // Uygulamanın kendi geri al/yinele'si; yazı alanındayken metnin geri alması çalışır
        { label: 'Geri al', accelerator: 'CmdOrCtrl+Z', click: (_item, win) => win?.webContents.executeJavaScript("window.dispatchEvent(new Event('dolap:undo'))") },
        { label: 'Yinele', accelerator: 'CmdOrCtrl+Y', click: (_item, win) => win?.webContents.executeJavaScript("window.dispatchEvent(new Event('dolap:redo'))") },
        { type: 'separator' },
        { label: 'Kes', role: 'cut' },
        { label: 'Kopyala', role: 'copy' },
        { label: 'Yapıştır', role: 'paste' },
        { label: 'Tümünü seç', role: 'selectAll' },
      ],
    },
    {
      label: 'Görünüm',
      submenu: [
        { label: 'Yenile', role: 'reload' },
        { type: 'separator' },
        { label: 'Yakınlaştır', role: 'zoomIn' },
        { label: 'Uzaklaştır', role: 'zoomOut' },
        { label: 'Gerçek boyut', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Tam ekran', role: 'togglefullscreen' },
        { label: 'Geliştirici araçları', role: 'toggleDevTools' },
      ],
    },
    {
      label: 'Yardım',
      submenu: [
        {
          label: 'Güncellemeleri denetle',
          click: async () => {
            if (!LAUNCHER) {
              shell.openExternal(update.RELEASES_PAGE);
              return;
            }
            const s = await checkForUpdate();
            if (s.state === 'none') {
              dialog.showMessageBox(mainWindow, { type: 'info', title: 'Güncelleme', message: 'Dolap güncel.', detail: `Kullandığınız sürüm: ${app.getVersion()}` });
            } else if (s.state === 'error') {
              dialog.showMessageBox(mainWindow, { type: 'warning', title: 'Güncelleme', message: 'Güncelleme denetlenemedi.', detail: s.error || '' });
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Hakkında',
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Dolap hakkında',
            message: `Dolap ${app.getVersion()}`,
            detail: 'Mobilya ölçü çıkarma, kesim listesi, plaka planı ve teklif hazırlama.\n\n'
              + (PORTABLE_DATA
                ? `Taşınabilir sürüm. Projeleriniz programın yanındaki klasörde saklanır:\n${app.getPath('userData')}\n\n.exe dosyasını ve "Dolap-Dosyalari" klasörünü birlikte taşıyın.\n\n`
                : `Projeleriniz bu bilgisayarda saklanır:\n${app.getPath('userData')}\n\n`)
              + 'Düzenli olarak "Yedek al" ile proje dosyası almanız önerilir.',
          }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

function start() {
  if (!DEV_URL) createSplash();
  buildMenu();
  createWindow();
  if (LAUNCHER) {
    update.cleanupLeftovers(LAUNCHER);
    // Açılış yavaşlamasın diye biraz sonra denetlenir
    if (!process.env.DOLAP_NO_UPDATE_CHECK) setTimeout(() => { void checkForUpdate(); }, 4000);
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}

app.whenReady().then(() => {
  if (gotLock) { start(); return; }
  if (!AFTER_UPDATE) return;
  const deadline = Date.now() + 15000;
  const timer = setInterval(() => {
    gotLock = app.requestSingleInstanceLock();
    if (gotLock) { clearInterval(timer); start(); } else if (Date.now() > deadline) { clearInterval(timer); app.quit(); }
  }, 300);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
