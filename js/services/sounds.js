/* Work — services/sounds.js
 * Your own alarm sounds. Audio files live in IndexedDB (localStorage is too small for songs),
 * so they stay on this device and are not part of the JSON backup.
 * Sound ids look like "custom:<id>". The list is cached in memory so the UI can read it synchronously.
 */
(function (W) {
  'use strict';

  const DB_NAME = 'work.sounds';
  const STORE = 'sounds';
  const MAX_BYTES = 10 * 1024 * 1024;
  const MAX_COUNT = 12;
  const EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac|weba)$/i;

  let db = null;
  let cache = [];

  const isCustom = (id) => typeof id === 'string' && /^custom:[\w-]+$/.test(id);

  function open() {
    if (db) return Promise.resolve(db);
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error('unsupported'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => { db = req.result; resolve(db); };
      req.onerror = () => reject(req.error || new Error('open failed'));
    });
  }

  function run(mode, fn) {
    return open().then((d) => new Promise((resolve, reject) => {
      const tx = d.transaction(STORE, mode);
      const out = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(out && 'result' in out ? out.result : undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    }));
  }

  function init() {
    return run('readonly', (s) => s.getAll())
      .then((rows) => {
        cache = (rows || [])
          .map((r) => ({ id: r.id, name: r.name, size: r.size, addedAt: r.addedAt }))
          .sort((a, b) => a.addedAt - b.addedAt);
        W.events.emit('sounds');
      })
      .catch(() => { cache = []; });
  }

  const list = () => cache.slice();
  const get = (id) => cache.find((s) => s.id === id) || null;
  const nameOf = (id) => (get(id) ? get(id).name : null);

  function getBlob(id) {
    return run('readonly', (s) => s.get(id)).then((row) => (row ? row.blob : null)).catch(() => null);
  }

  /** Resolves with the new sound, rejects with a user-readable Error. */
  function add(file) {
    if (!file) return Promise.reject(new Error('No file chosen.'));
    if (!(/^audio\//.test(file.type) || EXT.test(file.name))) return Promise.reject(new Error('That doesn’t look like an audio file.'));
    if (file.size > MAX_BYTES) return Promise.reject(new Error('That file is over 10 MB.'));
    if (cache.length >= MAX_COUNT) return Promise.reject(new Error('You can keep up to ' + MAX_COUNT + ' custom sounds.'));
    const rec = {
      id: 'custom:' + W.utils.uid(),
      name: file.name.replace(/\.[^.]+$/, '').trim().slice(0, 40) || 'My sound',
      size: file.size,
      addedAt: Date.now(),
      blob: file,
    };
    return run('readwrite', (s) => s.put(rec))
      .then(() => {
        cache.push({ id: rec.id, name: rec.name, size: rec.size, addedAt: rec.addedAt });
        if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
        W.events.emit('sounds');
        return get(rec.id);
      })
      .catch(() => { throw new Error('Couldn’t save that file on this device.'); });
  }

  function remove(id) {
    return run('readwrite', (s) => s.delete(id))
      .catch(() => {})
      .then(() => {
        cache = cache.filter((s) => s.id !== id);
        const st = W.store;
        // Anything pointing at the deleted sound falls back to a built-in one.
        st.state.alarms.filter((a) => a.sound === id).forEach((a) => st.patchAlarm(a.id, { sound: 'chime' }));
        const patch = {};
        if (st.state.settings.tone === id) patch.tone = 'chime';
        if (st.state.settings.timerTone === id) patch.timerTone = 'done';
        if (Object.keys(patch).length) st.setSettings(patch);
        W.events.emit('sounds');
      });
  }

  W.sounds = { init, list, get, nameOf, getBlob, add, remove, isCustom, MAX_COUNT };
})((window.Work = window.Work || {}));
