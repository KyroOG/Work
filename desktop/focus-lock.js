// Work — focus lock. Closes distracting apps (games, launchers) outside an allowed window.
// Default: on school days, blocked apps may run only 15:00–16:00; at 16:00 they are closed.
// Pure schedule logic lives in isLocked() so it can be tested without Electron.
const { execFile } = require('child_process');
const fs = require('fs');

const DEFAULTS = {
  enabled: true,
  days: [1, 2, 3, 4, 5],          // 0 = Sunday. Lock applies on these days only.
  openFrom: '15:00',              // blocked apps are allowed from here...
  openTo: '16:00',                // ...until here, then they are closed
  graceSeconds: 30,               // warning time before closing at the end of the window
  blocklist: [
    'steam.exe', 'steamwebhelper.exe', 'EpicGamesLauncher.exe', 'RiotClientServices.exe',
    'VALORANT-Win64-Shipping.exe', 'Battle.net.exe', 'RobloxPlayerBeta.exe', 'cs2.exe',
    'dota2.exe', 'FortniteClient-Win64-Shipping.exe', 'GenshinImpact.exe', 'GTA5.exe',
    'HD-Player.exe', 'Minecraft.exe',
  ],
};

const toMin = (hm) => { const [h, m] = String(hm).split(':').map(Number); return h * 60 + (m || 0); };

// True when blocked apps must not run at `now`.
function isLocked(cfg, now) {
  if (!cfg.enabled || !cfg.days.includes(now.getDay())) return false;
  const t = now.getHours() * 60 + now.getMinutes();
  return !(t >= toMin(cfg.openFrom) && t < toMin(cfg.openTo));
}

function clean(patch, base) {
  const out = Object.assign({}, base);
  const p = patch || {};
  if (typeof p.enabled === 'boolean') out.enabled = p.enabled;
  if (Array.isArray(p.days)) out.days = p.days.map(Number).filter((d) => d >= 0 && d <= 6);
  ['openFrom', 'openTo'].forEach((k) => { if (/^\d{2}:\d{2}$/.test(p[k] || '')) out[k] = p[k]; });
  if (Number.isFinite(p.graceSeconds)) out.graceSeconds = Math.min(300, Math.max(0, p.graceSeconds));
  if (Array.isArray(p.blocklist)) {
    out.blocklist = p.blocklist.map((s) => String(s).trim()).filter((s) => /^[\w .()-]+\.exe$/i.test(s));
  }
  return out;
}

function create({ file, notify }) {
  let cfg = Object.assign({}, DEFAULTS);
  let timer = null;
  let wasLocked = null;   // null until the first check
  let graceUntil = 0;

  try { cfg = clean(JSON.parse(fs.readFileSync(file, 'utf8')), DEFAULTS); } catch (e) { save(); }

  function save() { try { fs.writeFileSync(file, JSON.stringify(cfg, null, 2)); } catch (e) { /* ignore */ } }

  function running(cb) {
    execFile('tasklist', ['/fo', 'csv', '/nh'], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 }, (err, out) => {
      if (err) return cb([]);
      cb(out.split(/\r?\n/).map((l) => (l.match(/^"([^"]+)"/) || [])[1]).filter(Boolean));
    });
  }

  function closeBlocked() {
    const block = new Set(cfg.blocklist.map((s) => s.toLowerCase()));
    running((names) => {
      new Set(names.filter((n) => block.has(n.toLowerCase()))).forEach((n) => {
        execFile('taskkill', ['/f', '/im', n], { windowsHide: true }, () => {});
      });
    });
  }

  function tick() {
    const locked = isLocked(cfg, new Date());
    if (locked && wasLocked === false) {
      // Just left the open window: warn, then close after the grace period.
      graceUntil = Date.now() + cfg.graceSeconds * 1000;
      if (notify) notify('Focus time', 'Games close in ' + cfg.graceSeconds + ' seconds. Save your progress.');
    }
    wasLocked = locked;
    if (locked && Date.now() >= graceUntil) closeBlocked();
  }

  function start() {
    if (process.platform !== 'win32' || timer) return;
    tick();
    timer = setInterval(tick, 5000);
  }

  function status() {
    return Object.assign({ locked: isLocked(cfg, new Date()) }, cfg);
  }

  return {
    start,
    get: status,
    set(patch) { cfg = clean(patch, cfg); save(); wasLocked = null; return status(); },
  };
}

module.exports = { create, isLocked, DEFAULTS };
