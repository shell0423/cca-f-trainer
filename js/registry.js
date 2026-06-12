/* registry.js — 教材/問題データの登録先（全データファイルより前に読み込む） */
(function () {
  'use strict';

  window.CCA = {
    config: {
      passScaled: 720,   // 合格スケールドスコア（100〜1000）
      scaleMin: 100,
      scaleMax: 1000,
      mockSize: 60,      // 模試の問題数
      mockDurationMin: 120,
    },
    domains: [],          // [{id,title,weight,emoji,color,summary}]
    plan: [],             // 12週プラン
    lessons: {},          // id -> lesson
    questions: {},        // id -> question
    exams: {},            // id -> exam
    docs: {},             // {guide:markdown, changelog:[{version,date,title,items}]}
  };

  function upsert(map, obj) {
    if (!obj || !obj.id) return;
    map[obj.id] = Object.assign(map[obj.id] || {}, obj);
  }

  window.CCA_REGISTER = {
    config: function (c) { Object.assign(CCA.config, c || {}); },
    domainMeta: function (list) { if (Array.isArray(list)) CCA.domains = list; },
    plan: function (p) { if (Array.isArray(p)) CCA.plan = p; },
    docs: function (d) { Object.assign(CCA.docs, d || {}); },
    lesson: function (l) { upsert(CCA.lessons, l); },
    question: function (q) { upsert(CCA.questions, q); },
    exam: function (e) { upsert(CCA.exams, e); },
    bulk: function (data) {
      if (!data) return;
      try {
        (data.lessons || []).forEach(function (l) { upsert(CCA.lessons, l); });
        (data.questions || []).forEach(function (q) { upsert(CCA.questions, q); });
        if (data.exam) upsert(CCA.exams, data.exam);
        if (Array.isArray(data.exams)) data.exams.forEach(function (e) { upsert(CCA.exams, e); });
      } catch (err) {
        if (window.console) console.error('CCA_REGISTER.bulk failed:', err);
      }
    },
  };
})();
