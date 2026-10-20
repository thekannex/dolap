// Dolap masaüstü uygulaması — Electron ana süreci.
// Arayüz, Vite ile derlenen dist/ klasöründen yüklenir; Node.js erişimi arayüze açılmaz.
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('node:path');

const DEV_URL = process.env.VITE_DEV_SERVER_URL;
const ICON = path.join(__dirname, '..', 'build', 'icon.png');

const FILE_FILTERS = {
  pdf: { name: 'PDF belgesi', extensions: ['pdf'] },
  xlsx: { name: 'Excel çalışma kitabı', extensions: ['xlsx'] },
  dxf: { name: 'DXF çizimi', extensions: ['dxf'] },
  json: { name: 'Dolap proje yedeği', extensions: ['json'] },
};

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow = null;

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
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

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
          label: 'Hakkında',
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'Dolap hakkında',
            message: `Dolap ${app.getVersion()}`,
            detail: 'Mobilya ölçü çıkarma, kesim listesi, plaka planı ve teklif hazırlama.\n\n'
              + `Projeleriniz bu bilgisayarda saklanır:\n${app.getPath('userData')}\n\n`
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

app.whenReady().then(() => {
  buildMenu();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
