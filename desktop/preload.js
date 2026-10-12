// Exposes a tiny, safe bridge so the app can talk to the desktop shell.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('workDesktop', {
  get: () => ipcRenderer.invoke('desktop:get'),
  set: (patch) => ipcRenderer.invoke('desktop:set', patch),
  alarmRinging: () => ipcRenderer.send('desktop:alarm'),
  focusGet: () => ipcRenderer.invoke('focus:get'),
  focusSet: (patch) => ipcRenderer.invoke('focus:set', patch),
  setZoom: (f) => ipcRenderer.invoke('desktop:zoom', f),
});
