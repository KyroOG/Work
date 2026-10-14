// Exposes a tiny, safe bridge so the app can talk to the desktop shell.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('workDesktop', {
  get: () => ipcRenderer.invoke('desktop:get'),
  set: (patch) => ipcRenderer.invoke('desktop:set', patch),
  alarmRinging: () => ipcRenderer.send('desktop:alarm'),
  focusGet: () => ipcRenderer.invoke('focus:get'),
  focusSet: (patch) => ipcRenderer.invoke('focus:set', patch),
  setZoom: (f) => ipcRenderer.invoke('desktop:zoom', f),
  updateGet: () => ipcRenderer.invoke('update:get'),
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  onUpdate: (cb) => {
    const fn = (_e, state) => cb(state);
    ipcRenderer.on('update:state', fn);
    return () => ipcRenderer.removeListener('update:state', fn);
  },
});
