/* Small formatting / utility helpers shared by every screen. */
(function (global) {
  'use strict';

  var ERec = global.ERec = global.ERec || {};

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad(n, len) {
    var s = String(n);
    while (s.length < (len || 2)) s = '0' + s;
    return s;
  }

  /* "2026-03-14" or ISO -> "14 Mar 2026" */
  function date(v) {
    if (!v) return '—';
    var d = (v instanceof Date) ? v : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return pad(d.getDate()) + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function dateTime(v) {
    if (!v) return '—';
    var d = (v instanceof Date) ? v : new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return date(d) + ', ' + time24(d);
  }

  function time24(v) {
    if (!v) return '';
    if (typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)) return time12(v);
    var d = (v instanceof Date) ? v : new Date(v);
    return time12(pad(d.getHours()) + ':' + pad(d.getMinutes()));
  }

  /* "14:30" -> "02:30 PM" */
  function time12(hhmm) {
    if (!hhmm) return '';
    var p = String(hhmm).split(':');
    var h = parseInt(p[0], 10);
    var m = p[1] || '00';
    var ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    return pad(h) + ':' + m + ' ' + ap;
  }

  /* "10:00" shifted by N minutes -> "09:30"; clamped inside the same day. */
  function shiftTime(hhmm, minutes) {
    if (!hhmm) return '';
    var p = String(hhmm).split(':');
    var total = (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0) + minutes;
    total = Math.max(0, Math.min(23 * 60 + 59, total));
    return pad(Math.floor(total / 60)) + ':' + pad(total % 60);
  }

  function isoDate(d) {
    d = d || new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function isoNow() {
    return new Date().toISOString();
  }

  function addDays(isoStr, days) {
    var d = new Date(isoStr);
    d.setDate(d.getDate() + days);
    return isoDate(d);
  }

  /* "3 days ago" style, good enough for an activity log */
  function ago(v) {
    if (!v) return '';
    var diff = Date.now() - new Date(v).getTime();
    var mins = Math.round(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + ' min ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + (hrs === 1 ? ' hour ago' : ' hours ago');
    var days = Math.round(hrs / 24);
    if (days < 30) return days + (days === 1 ? ' day ago' : ' days ago');
    return date(v);
  }

  function money(n) {
    if (n === null || n === undefined || n === '') return '—';
    return 'BDT ' + Number(n).toLocaleString('en-US');
  }

  function initials(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Preserve author line breaks when echoing free text into HTML. */
  function nl2br(s) { return esc(s).replace(/\n/g, '<br>'); }

  function uid(prefix) {
    return (prefix || 'id') + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  /* Replaces {{token}} against a flat map; unknown tokens are left visible
     so a user can see what they mistyped in a mail/SMS body. */
  function merge(tpl, vars) {
    if (!tpl) return '';
    return String(tpl).replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (m, key) {
      var v = vars ? vars[key] : undefined;
      return (v === undefined || v === null || v === '') ? m : String(v);
    });
  }

  /* An SMS is 160 chars (GSM-7); concatenated parts drop to 153. */
  function smsParts(text) {
    var len = (text || '').length;
    if (len === 0) return { len: 0, parts: 0 };
    if (len <= 160) return { len: len, parts: 1 };
    return { len: len, parts: Math.ceil(len / 153) };
  }

  function ExcelCell(v) {
    if (v === null || v === undefined) return '';
    var s = String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function sortBy(arr, key, dir) {
    var mul = dir === 'desc' ? -1 : 1;
    return arr.slice().sort(function (a, b) {
      var x = typeof key === 'function' ? key(a) : a[key];
      var y = typeof key === 'function' ? key(b) : b[key];
      if (x === null || x === undefined) x = '';
      if (y === null || y === undefined) y = '';
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * mul;
      return String(x).localeCompare(String(y)) * mul;
    });
  }

  function groupBy(arr, key) {
    var out = {};
    arr.forEach(function (item) {
      var k = typeof key === 'function' ? key(item) : item[key];
      (out[k] = out[k] || []).push(item);
    });
    return out;
  }

  function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : (many || one + 's')); }

  ERec.fmt = {
    pad: pad, date: date, dateTime: dateTime, time12: time12, time24: time24,
    isoDate: isoDate, isoNow: isoNow, addDays: addDays, shiftTime: shiftTime, ago: ago, money: money,
    initials: initials, esc: esc, nl2br: nl2br, uid: uid, merge: merge,
    smsParts: smsParts, ExcelCell: ExcelCell, sortBy: sortBy, groupBy: groupBy,
    pct: pct, plural: plural, MONTHS: MONTHS
  };
})(window);
