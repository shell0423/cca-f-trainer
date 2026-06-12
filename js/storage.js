/* storage.js — 進捗・成績の保存（localStorage、失敗時はメモリにフォールバック） */
(function () {
  'use strict';
  var KEY = 'cca-f-v1';
  var mem = null;

  function load() {
    if (mem) return mem;
    try { mem = JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { mem = {}; }
    return mem;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) {}
  }
  function get(k, d) { var s = load(); return (k in s) ? s[k] : d; }
  function set(k, v) { load(); mem[k] = v; save(); }

  window.Store = {
    get: get,
    set: set,

    markLesson: function (id) { var r = get('lessons', {}); r[id] = true; set('lessons', r); },
    isLessonDone: function (id) { return !!get('lessons', {})[id]; },
    lessonsDone: function () { return get('lessons', {}); },

    // attempt: {examId, title, type, total, correct, percent, scaled, passed, wrongIds:[], rightIds:[], date}
    recordAttempt: function (a) {
      var h = get('history', []);
      h.unshift(a);
      set('history', h.slice(0, 300));
      var b = get('best', {});
      if (!(a.examId in b) || a.percent > b[a.examId]) b[a.examId] = a.percent;
      set('best', b);
      var w = {};
      get('wrong', []).forEach(function (id) { w[id] = true; });
      (a.wrongIds || []).forEach(function (id) { w[id] = true; });
      (a.rightIds || []).forEach(function (id) { delete w[id]; });
      set('wrong', Object.keys(w));
    },

    best: function (id) { var b = get('best', {}); return (id in b) ? b[id] : null; },
    history: function () { return get('history', []); },
    wrong: function () { return get('wrong', []); },
    clearWrong: function () { set('wrong', []); },
    resetAll: function () { mem = {}; save(); },
  };
})();
