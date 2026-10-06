// Work — desktop shell. The app itself is plain HTML/CSS/JS; this just gives it a window.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

app.setAppUserModelId('com.kyroog.work'); // needed for Windows notifications

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f7f7f4',
    title: 'Work',
    icon: path.join(__dirname, 'app', 'icons', 'icon-512.png'),
    webPreferences: {
      backgroundThrottling: false, // keep the timer and alarms ticking while minimised
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('closed', () => { win = null; });
}

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
