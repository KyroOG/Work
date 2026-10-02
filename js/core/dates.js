/* Work — core/dates.js
 * Natural-language parsing for quick add:
 *   "Call mom tomorrow 5pm !high"  ->  { title: "Call mom", due: <tomorrow>, time: "17:00", priority: "high" }
 *
 * Each detector returns the span it consumed so the title can be cleaned up.
 * Categories can be skipped (when the user has set that field by hand).
 */
(function (W) {
  'use strict';

  const U = W.utils;

  const WEEKDAYS = {
    sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tues: 2, tue: 2, wednesday: 3, weds: 3, wed: 3,
    thursday: 4, thurs: 4, thur: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
  };
  const FULL_NAMES = { sunday: 1, monday: 1, tuesday: 1, wednesday: 1, thursday: 1, friday: 1, saturday: 1 };
  const MONTH_INDEX = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

  const MONTH_RE = 'jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?';
  const WEEKDAY_RE = 'monday|tuesday|wednesday|thursday|friday|saturday|sunday|tues|weds|thurs|mon|tue|wed|thur|thu|fri|sat|sun';
  const LEAD = '(?:(?:by|due|on|before|until|for)\\s+)?';

  const re = (src, flags) => new RegExp(src, flags || 'i');
  const hit = (m, extra) => Object.assign({ start: m.index, end: m.index + m[0].length }, extra);

  /* ---------- priority ---------- */
  function matchPriority(text) {
    const m = /(^|\s)(!{1,3}|!(?:high|h|medium|med|m|low|l)|p[1-3])(?=\s|$)/i.exec(text);
    if (!m) return null;
    const tok = m[2].toLowerCase();
    let value = 'low';
    if (tok === '!!!' || tok === '!high' || tok === '!h' || tok === 'p1') value = 'high';
    else if (tok === '!!' || tok === '!medium' || tok === '!med' || tok === '!m' || tok === 'p2') value = 'medium';
    return { start: m.index + m[1].length, end: m.index + m[0].length, value };
  }

  /* ---------- date ---------- */
  function upcomingWeekday(today, wd, mode) {
    const now = U.parseDayKey(today);
    const isoToday = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
    const isoTarget = (wd + 6) % 7;
    let diff = isoTarget - isoToday;
    if (mode === 'next') diff += 7;
    else if (mode === 'this') { if (diff < 0) diff += 7; }
    else if (diff <= 0) diff += 7;
    return U.addDays(today, diff);
  }

  function monthDay(now, monthName, day) {
    const mo = MONTH_INDEX[monthName.slice(0, 3).toLowerCase()];
    day = parseInt(day, 10);
    if (mo === undefined || !(day >= 1 && day <= 31)) return null;
    const startOfToday = U.parseDayKey(U.dayKey(now));
    let year = now.getFullYear();
    let d = new Date(year, mo, day);
    if (d.getMonth() !== mo) return null; // e.g. "feb 30"
    if (d < startOfToday) {
      year += 1;
      d = new Date(year, mo, day);
      if (d.getMonth() !== mo) return null;
    }
    return U.dayKey(d);
  }

  function matchDate(text, now) {
    const today = U.dayKey(now);
    let m;

    m = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text);
    if (m && U.isValidDayKey(m[1])) return hit(m, { key: m[1] });

    m = re(LEAD + '\\bday after tomorrow\\b').exec(text);
    if (m) return hit(m, { key: U.addDays(today, 2) });

    m = re(LEAD + '\\b(?:today|tonight)\\b').exec(text);
    if (m) return hit(m, { key: today });

    m = re(LEAD + '\\b(?:tomorrow|tmrw|tmr|tmw)\\b').exec(text);
    if (m) return hit(m, { key: U.addDays(today, 1) });

    m = /\bin\s+(\d{1,3})\s*(days?|d|weeks?|w)\b/i.exec(text);
    if (m) return hit(m, { key: U.addDays(today, parseInt(m[1], 10) * (/^w/i.test(m[2]) ? 7 : 1)) });

    m = re(LEAD + '\\bnext\\s+(week|month)\\b').exec(text);
    if (m) {
      if (/week/i.test(m[1])) return hit(m, { key: U.addDays(today, 7) });
      const d = U.parseDayKey(today);
      d.setMonth(d.getMonth() + 1);
      return hit(m, { key: U.dayKey(d) });
    }

    m = re(LEAD + '\\b(?:this\\s+)?weekend\\b').exec(text);
    if (m) {
      const dow = now.getDay();
      return hit(m, { key: U.addDays(today, dow === 6 ? 0 : 6 - dow) });
    }

    m = re(LEAD + '\\b(' + MONTH_RE + ')\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?![:\\d])').exec(text);
    if (m) {
      const key = monthDay(now, m[1], m[2]);
      if (key) return hit(m, { key });
    }

    m = re(LEAD + '\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(' + MONTH_RE + ')\\b').exec(text);
    if (m) {
      const key = monthDay(now, m[2], m[1]);
      if (key) return hit(m, { key });
    }

    // Weekdays. Short forms ("sat", "sun", "wed") are only trusted when they are
    // clearly meant as a date, so "Buy sun cream" stays a title.
    const wre = re('(\\b(?:by|due|on|before|until|for)\\s+)?(?:\\b(next|this)\\s+)?\\b(' + WEEKDAY_RE + ')\\b', 'gi');
    while ((m = wre.exec(text))) {
      const name = m[3].toLowerCase();
      const trusted = !!(m[1] || m[2]) || FULL_NAMES[name];
      if (!trusted) {
        const after = text.slice(m.index + m[0].length);
        const atEnd = /^\s*$/.test(after);
        const beforeTime = /^\s*(?:at\s|@|\d{1,2}(?::\d{2})?\s?[ap]\.?m)/i.test(after);
        if (!atEnd && !beforeTime) continue;
      }
      return hit(m, { key: upcomingWeekday(today, WEEKDAYS[name], m[2] ? m[2].toLowerCase() : null) });
    }
    return null;
  }

  /* ---------- time ---------- */
  function matchTime(text) {
    let m = /(?:\b(?:at|by|before|until)\s+|@\s*)?\b(\d{1,2})(?::([0-5]\d))?\s?([ap])\.?m\b\.?/i.exec(text);
    if (m) {
      let h = parseInt(m[1], 10);
      if (h >= 1 && h <= 12) {
        const pm = m[3].toLowerCase() === 'p';
        if (h === 12) h = pm ? 12 : 0;
        else if (pm) h += 12;
        return hit(m, { time: U.pad(h) + ':' + (m[2] || '00') });
      }
    }
    m = /(?:\b(?:at|by|before|until)\s+|@\s*)?\b([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
    if (m) return hit(m, { time: U.pad(parseInt(m[1], 10)) + ':' + m[2] });
    m = /(?:\bat\s+)?\bnoon\b/i.exec(text);
    if (m) return hit(m, { time: '12:00' });
    return null;
  }

  /**
   * @param {string} input
   * @param {{now?: Date, skip?: {due?: boolean, time?: boolean, priority?: boolean}}} [opts]
   * @returns {{title: string, due: string|null, time: string|null, priority: string|null}}
   */
  function parseQuick(input, opts) {
    opts = opts || {};
    const now = opts.now || new Date();
    const skip = opts.skip || {};
    const text = String(input || '');
    const spans = [];
    const out = { title: '', due: null, time: null, priority: null };

    if (!skip.priority) {
      const p = matchPriority(text);
      if (p) { out.priority = p.value; spans.push(p); }
    }
    if (!skip.due) {
      const d = matchDate(text, now);
      if (d) { out.due = d.key; spans.push(d); }
    }
    if (!skip.time) {
      const t = matchTime(text);
      if (t && !spans.some((s) => t.start < s.end && t.end > s.start)) { out.time = t.time; spans.push(t); }
    }
    // A time without a date only makes sense for today.
    if (out.time && !out.due && !skip.due) out.due = U.dayKey(now);

    let title = text;
    spans.sort((a, b) => b.start - a.start).forEach((s) => {
      title = title.slice(0, s.start) + ' ' + title.slice(s.end);
    });
    title = title.replace(/\s+/g, ' ').trim();
    if (spans.length) {
      title = title.replace(/\s+(?:on|at|by|due|before|until|for|@)$/i, '').replace(/[\s,;:–—-]+$/, '').trim();
    }
    out.title = title || text.trim();
    return out;
  }

  W.dates = { parseQuick };
})((window.Work = window.Work || {}));
