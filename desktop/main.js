// Work — desktop shell. The app itself is plain HTML/CSS/JS; this gives it a window,
// a tray icon (so alarms keep ringing with the window closed) and optional launch-at-startup.
const { app, BrowserWindow, Tray, Menu, Notification, nativeImage, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

app.setAppUserModelId('com.kyroog.work'); // needed for Windows notifications

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

const ICON = path.join(__dirname, 'app', 'icons', 'icon-512.png');
const PREFS_FILE = () => path.join(app.getPath('userData'), 'desktop.json');
const DEFAULTS = { launchAtStartup: true, runInTray: true };

let win = null;
let tray = null;
let quitting = false;
let prefs = Object.assign({}, DEFAULTS);
let toldAboutTray = false;

/* ---------- preferences ---------- */
function loadPrefs() {
  try {
    prefs = Object.assign({}, DEFAULTS, JSON.parse(fs.readFileSync(PREFS_FILE(), 'utf8')));
  } catch (e) {
    prefs = Object.assign({}, DEFAULTS); // first run: defaults, saved below
    savePrefs();
  }
}
function savePrefs() {
  try { fs.writeFileSync(PREFS_FILE(), JSON.stringify(prefs)); } catch (e) { /* ignore */ }
}
function applyStartup() {
  if (!app.isPackaged) return; // don't register the dev copy of Electron
  app.setLoginItemSettings({ openAtLogin: !!prefs.launchAtStartup, args: ['--hidden'] });
}

/* ---------- window ---------- */
function showWindow() {
  if (!win) { createWindow(false); return; }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createWindow(startHidden) {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f7f7f4',
    title: 'Work',
    icon: ICON,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      backgroundThrottling: false, // keep the timer and alarms ticking while hidden
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => { if (!startHidden) win.show(); });
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('close', (e) => {
    if (quitting || !prefs.runInTray) return;
    e.preventDefault();
    win.hide();
    if (!toldAboutTray && Notification.isSupported()) {
      toldAboutTray = true;
      new Notification({ title: 'Work is still running', body: 'Alarms will ring from the tray. Right-click the tray icon to quit.', icon: ICON }).show();
    }
  });
  win.on('closed', () => { win = null; });
}

/* ---------- tray ---------- */
function buildTrayMenu() {
  return Menu.buildFromTemplate([
    { label: 'Open Work', click: showWindow },
    { type: 'separator' },
    {
      label: 'Launch when Windows starts',
      type: 'checkbox',
      checked: !!prefs.launchAtStartup,
      click: (item) => { prefs.launchAtStartup = item.checked; savePrefs(); applyStartup(); },
    },
    { type: 'separator' },
    { label: 'Quit Work', click: () => { quitting = true; app.quit(); } },
  ]);
}
function createTray() {
  const img = nativeImage.createFromPath(ICON).resize({ width: 32, height: 32 });
  tray = new Tray(img);
  tray.setToolTip('Work');
  tray.setContextMenu(buildTrayMenu());
  tray.on('click', showWindow);
}

/* ---------- messages from the app ---------- */
ipcMain.handle('desktop:get', () => Object.assign({}, prefs));
ipcMain.handle('desktop:set', (_e, patch) => {
  ['launchAtStartup', 'runInTray'].forEach((k) => { if (typeof (patch || {})[k] === 'boolean') prefs[k] = patch[k]; });
  savePrefs();
  applyStartup();
  if (tray) tray.setContextMenu(buildTrayMenu());
  return Object.assign({}, prefs);
});
// An alarm is ringing: bring the window to the front so it can be dismissed.
ipcMain.on('desktop:alarm', () => {
  showWindow();
  if (win) {
    win.setAlwaysOnTop(true);
    win.flashFrame(true);
    setTimeout(() => { if (win) { win.setAlwaysOnTop(false); win.flashFrame(false); } }, 4000);
  }
});

/* ---------- lifecycle ---------- */
app.on('second-instance', showWindow);
app.on('before-quit', () => { quitting = true; });

app.whenReady().then(() => {
  loadPrefs();
  applyStartup();
  createTray();
  const hidden = process.argv.includes('--hidden') || app.getLoginItemSettings().wasOpenedAtLogin;
  createWindow(hidden && prefs.runInTray);
});

app.on('window-all-closed', () => {
  if (quitting || !prefs.runInTray) app.quit();
});
