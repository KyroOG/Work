// Work — auto-update. Checks GitHub Releases (electron-updater), downloads in the background,
// and installs when asked, or on the next quit. Only active in the installed app.
const CHECK_DELAY = 10 * 1000;
const CHECK_EVERY = 6 * 60 * 60 * 1000;

function create({ app, send }) {
  const autoUpdater = app.isPackaged ? require('electron-updater').autoUpdater : null;
  // status: unsupported | idle | checking | downloading | ready | current | error
  let state = { status: autoUpdater ? 'idle' : 'unsupported', version: app.getVersion(), next: null, percent: 0 };

  function set(patch) {
    state = Object.assign({}, state, patch);
    send(state);
  }

  if (autoUpdater) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('checking-for-update', () => set({ status: 'checking' }));
    autoUpdater.on('update-available', (info) => set({ status: 'downloading', next: info.version, percent: 0 }));
    autoUpdater.on('update-not-available', () => set({ status: 'current' }));
    autoUpdater.on('download-progress', (p) => {
      const pct = Math.round(p.percent);
      if (pct !== state.percent) set({ status: 'downloading', percent: pct });
    });
    autoUpdater.on('update-downloaded', (info) => set({ status: 'ready', next: info.version, percent: 100 }));
    autoUpdater.on('error', () => set({ status: 'error' }));
  }

  function check() {
    if (!autoUpdater || ['checking', 'downloading', 'ready'].includes(state.status)) return;
    autoUpdater.checkForUpdates().catch(() => set({ status: 'error' }));
  }

  function install() {
    if (autoUpdater && state.status === 'ready') autoUpdater.quitAndInstall(true, true);
  }

  function start() {
    if (!autoUpdater) return;
    setTimeout(check, CHECK_DELAY);
    setInterval(check, CHECK_EVERY);
  }

  return { start, check, install, get: () => state };
}

module.exports = { create };
