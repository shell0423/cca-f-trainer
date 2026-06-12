/* app.js — CCA-F 学習サイト本体（ルーター＋教材ビューア＋テストエンジン＋進捗） */
(function () {
  'use strict';

  var C = window.CCA;
  var $app = null;

  /* ---------- ユーティリティ ---------- */
  function h(strings) { return strings; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function byId(id) { return document.getElementById(id); }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function go(hash) { window.location.hash = hash; }

  // 解説が選択肢を「位置・番号・記号」で参照しているか（残っていればシャッフルしない安全装置）
  var POSREF = /選択肢\s*[0-9０-９A-DＡ-Ｄ]|誤答\s*[0-9０-９]|正解\s*[0-9０-９]|[（(]\s*[A-DＡ-Ｄ]\s*[）)]/;
  function shuffleSafe(q) {
    return q && !POSREF.test(q.explanation || '');
  }
  // 出題ごとの選択肢表示順（origIndexの配列）。安全な問題だけシャッフル。
  function buildOrder(qids) {
    var order = {};
    qids.forEach(function (qid) {
      var q = C.questions[qid];
      if (!q || !q.options) { order[qid] = [0, 1, 2, 3]; return; }
      var idx = q.options.map(function (_, i) { return i; });
      order[qid] = shuffleSafe(q) ? shuffle(idx) : idx;
    });
    return order;
  }

  function domainById(id) {
    for (var i = 0; i < C.domains.length; i++) if (C.domains[i].id === id) return C.domains[i];
    return null;
  }
  function lessonsOf(domainId) {
    return Object.keys(C.lessons).map(function (k) { return C.lessons[k]; })
      .filter(function (l) { return l.domainId === domainId; })
      .sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  }
  function questionsOf(domainId) {
    return Object.keys(C.questions).map(function (k) { return C.questions[k]; })
      .filter(function (q) { return q.domainId === domainId; });
  }
  function scaledScore(pct) {
    return Math.round(C.config.scaleMin + (pct / 100) * (C.config.scaleMax - C.config.scaleMin));
  }
  function passPercent() {
    return Math.round((C.config.passScaled - C.config.scaleMin) / (C.config.scaleMax - C.config.scaleMin) * 100);
  }
  function dataReady() {
    return C.domains.length > 0 && Object.keys(C.questions).length > 0;
  }

  /* ---------- 進捗計算 ---------- */
  function domainReadiness(domainId) {
    // ドメイン試験のベスト％を最優先。無ければレッスン完了率で代替。
    var best = Store.best('exam-' + domainId);
    if (best != null) return best;
    var ls = lessonsOf(domainId);
    if (!ls.length) return 0;
    var done = 0;
    ls.forEach(function (l) { if (Store.isLessonDone(l.id)) done++; });
    return Math.round((done / ls.length) * 60); // 学習のみは最大60%扱い（試験未受験）
  }
  function overallReadiness() {
    var wsum = 0, acc = 0;
    C.domains.forEach(function (d) { wsum += d.weight; acc += domainReadiness(d.id) * d.weight; });
    return wsum ? Math.round(acc / wsum) : 0;
  }

  /* ---------- 共通パーツ ---------- */
  function progressBar(pct, color) {
    var c = color || '#6366f1';
    return '<div class="bar"><div class="bar-fill" style="width:' + Math.max(0, Math.min(100, pct)) + '%;background:' + c + '"></div></div>';
  }
  function badge(text, cls) { return '<span class="badge ' + (cls || '') + '">' + esc(text) + '</span>'; }

  function diffBadge(d) {
    var map = { easy: ['やさしい', 'b-easy'], medium: ['標準', 'b-med'], hard: ['難しい', 'b-hard'] };
    var m = map[d] || ['標準', 'b-med'];
    return badge(m[0], m[1]);
  }

  /* ============================================================
     ビュー
     ============================================================ */

  function viewHome() {
    var overall = overallReadiness();
    var pass = passPercent();
    var domainsHtml = C.domains.map(function (d) {
      var r = domainReadiness(d.id);
      var ls = lessonsOf(d.id);
      var doneCount = ls.filter(function (l) { return Store.isLessonDone(l.id); }).length;
      return '' +
        '<a class="card domain-card" href="#/domain/' + d.id + '">' +
        '<div class="dc-top"><span class="dc-emoji">' + d.emoji + '</span>' +
        '<span class="dc-weight">比重 ' + d.weight + '%</span></div>' +
        '<div class="dc-title">' + esc(d.title) + '</div>' +
        '<div class="dc-sum">' + esc(d.summary) + '</div>' +
        '<div class="dc-meta">レッスン ' + doneCount + '/' + ls.length + '　到達度 ' + r + '%</div>' +
        progressBar(r, d.color) +
        '</a>';
    }).join('');

    var mockExams = Object.keys(C.exams).map(function (k) { return C.exams[k]; })
      .filter(function (e) { return e.type === 'mock'; })
      .sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    var mocksHtml = mockExams.map(function (e) {
      var best = Store.best(e.id);
      return '<a class="pill" href="#/quiz/' + e.id + '">📝 ' + esc(e.title) +
        (best != null ? ' <span class="pill-best">最高' + best + '%</span>' : '') + '</a>';
    }).join('');

    return '' +
      '<section class="hero">' +
      '<h1>CCA-F 合格トレーナー</h1>' +
      '<p class="hero-sub">Claude Certified Architect – Foundations を、日本語の教材とテストで3ヶ月合格へ。</p>' +
      '<div class="readiness">' +
      '<div class="readiness-num">' + overall + '<span>%</span></div>' +
      '<div class="readiness-body">' +
      '<div class="readiness-label">総合到達度（合格目安：約' + pass + '% / スケールド' + C.config.passScaled + '）</div>' +
      progressBar(overall, overall >= pass ? '#10b981' : '#6366f1') +
      '<div class="readiness-hint">' + (overall >= pass ? '✅ 合格ラインに到達しています。模試で安定させましょう。' : 'まずは学習プランに沿って各ドメインの試験で合格ラインを目指しましょう。') + '</div>' +
      '</div></div>' +
      '<div class="hero-actions">' +
      '<a class="btn btn-primary" href="#/plan">📅 12週間プランを見る</a>' +
      '<a class="btn" href="#/quiz/random">🎲 ランダム模試（60問）</a>' +
      '<a class="btn" href="#/review">🔁 間違い復習</a>' +
      '<a class="btn" href="#/vocab">🔤 英単語カード</a>' +
      '</div>' +
      '</section>' +
      '<h2 class="sec-title">5つのドメイン</h2>' +
      '<div class="grid">' + domainsHtml + '</div>' +
      '<h2 class="sec-title">本番想定の模試</h2>' +
      '<div class="pills">' + mocksHtml + '<a class="pill" href="#/quiz/random">🎲 ランダム模試</a></div>' +
      '<h2 class="sec-title">学習の進め方</h2>' +
      '<div class="card info">' +
      '<p><strong>① 教材を読む → ② その場で小テスト → ③ ドメイン試験 → ④ 本番模試</strong> の順で進めます。</p>' +
      '<ul>' +
      '<li>各レッスンには「試験で出る英単語」を付けています。英語が苦手でも、本番(英語)で用語を見て意味が分かるよう備えます。</li>' +
      '<li>テストは即時に正解・解説が出る<strong>学習モード</strong>、模試は本番同様にまとめて採点する<strong>試験モード（120分）</strong>です。</li>' +
      '<li>間違えた問題は自動で「復習」に溜まります。合格の近道は復習タブを空にすることです。</li>' +
      '</ul>' +
      '<p class="muted">進捗はこのブラウザに保存されます（端末・ブラウザを変えるとリセットされます）。</p>' +
      '</div>';
  }

  function viewPlan() {
    var phases = {};
    C.plan.forEach(function (w) { (phases[w.phase] = phases[w.phase] || []).push(w); });
    var html = '<div class="page-head"><a class="back" href="#/">← ホーム</a><h1>12週間 学習プラン</h1>' +
      '<p class="muted">1日30〜60分が目安。各週のレッスンと課題をこなし、最後は模試で仕上げます。</p></div>';
    Object.keys(phases).forEach(function (p) {
      html += '<h2 class="sec-title">' + esc(p) + '</h2>';
      html += '<div class="weeks">';
      phases[p].forEach(function (w) {
        var lessonLinks = (w.lessons || []).map(function (lid) {
          var l = C.lessons[lid];
          var done = Store.isLessonDone(lid);
          var title = l ? l.title : lid;
          return '<a class="wlesson ' + (done ? 'done' : '') + '" href="#/lesson/' + lid + '">' + (done ? '✅ ' : '▢ ') + esc(title) + '</a>';
        }).join('');
        var tasks = (w.tasks || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
        html += '<div class="card week">' +
          '<div class="week-head"><span class="week-no">Week ' + w.week + '</span><span class="week-title">' + esc(w.title) + '</span></div>' +
          '<div class="week-goal">🎯 ' + esc(w.goal) + '</div>' +
          (lessonLinks ? '<div class="wlessons">' + lessonLinks + '</div>' : '') +
          (tasks ? '<ul class="wtasks">' + tasks + '</ul>' : '') +
          '</div>';
      });
      html += '</div>';
    });
    return html;
  }

  function viewDomain(id) {
    var d = domainById(id);
    if (!d) return notFound();
    var ls = lessonsOf(id);
    var exam = C.exams['exam-' + id];
    var lessonsHtml = ls.map(function (l, i) {
      var done = Store.isLessonDone(l.id);
      var best = Store.best('lessonquiz-' + l.id);
      return '<div class="card lesson-row">' +
        '<div class="lr-main">' +
        '<div class="lr-no">' + (i + 1) + '</div>' +
        '<div>' +
        '<a class="lr-title" href="#/lesson/' + l.id + '">' + esc(l.title) + '</a>' +
        '<div class="lr-meta">' + (done ? '✅ 学習済み' : '未学習') + '　目安' + (l.estMinutes || 30) + '分' +
        (best != null ? '　小テスト最高 ' + best + '%' : '') + '</div>' +
        '</div></div>' +
        '<div class="lr-actions">' +
        '<a class="btn btn-sm" href="#/lesson/' + l.id + '">教材</a>' +
        '<a class="btn btn-sm btn-primary" href="#/quiz/lessonquiz-' + l.id + '">小テスト</a>' +
        '</div></div>';
    }).join('');
    var examBest = exam ? Store.best(exam.id) : null;
    return '<div class="page-head"><a class="back" href="#/">← ホーム</a>' +
      '<h1>' + d.emoji + ' ' + esc(d.title) + '</h1>' +
      '<p class="muted">試験比重 ' + d.weight + '%</p>' +
      '<p>' + esc(d.summary) + '</p></div>' +
      '<h2 class="sec-title">レッスン</h2>' +
      lessonsHtml +
      (exam ? ('<h2 class="sec-title">ドメイン試験</h2>' +
        '<div class="card exam-cta">' +
        '<div><div class="ec-title">📝 ' + esc(exam.title) + '</div>' +
        '<div class="muted">' + (exam.questionIds ? exam.questionIds.length : 0) + '問・学習モード（即時解説）' +
        (examBest != null ? '　最高 ' + examBest + '%' : '') + '</div></div>' +
        '<a class="btn btn-primary" href="#/quiz/' + exam.id + '">試験を受ける</a>' +
        '</div>') : '');
  }

  function viewLesson(id) {
    var l = C.lessons[id];
    if (!l) return notFound();
    var d = domainById(l.domainId);
    var vocab = (l.vocab || []).map(function (v) {
      return '<tr><td class="vocab-en">' + esc(v.en) + '</td><td>' + esc(v.ja) + '</td></tr>';
    }).join('');
    var keyPoints = (l.keyPoints || []).map(function (k) { return '<li>' + esc(k) + '</li>'; }).join('');
    var done = Store.isLessonDone(id);

    // 同ドメイン内の前後リンク
    var sib = lessonsOf(l.domainId);
    var idx = -1;
    sib.forEach(function (x, i) { if (x.id === id) idx = i; });
    var prev = idx > 0 ? sib[idx - 1] : null;
    var next = idx >= 0 && idx < sib.length - 1 ? sib[idx + 1] : null;

    return '<div class="page-head">' +
      '<a class="back" href="#/domain/' + l.domainId + '">← ' + (d ? esc(d.title) : 'ドメイン') + '</a>' +
      '<h1>' + esc(l.title) + '</h1>' +
      '<p class="muted">目安' + (l.estMinutes || 30) + '分' + (done ? '・✅ 学習済み' : '') + '</p>' +
      '</div>' +
      (keyPoints ? '<div class="card keypoints"><div class="kp-head">📌 このレッスンの要点</div><ul>' + keyPoints + '</ul></div>' : '') +
      '<article class="lesson-body">' + mdToHtml(l.body || '（本文は準備中です）') + '</article>' +
      (vocab ? '<div class="card vocab"><div class="kp-head">🔤 試験で出る英単語</div><table class="vocab-table"><tbody>' + vocab + '</tbody></table></div>' : '') +
      '<div class="lesson-foot">' +
      '<button class="btn ' + (done ? '' : 'btn-primary') + '" id="markDone">' + (done ? '✅ 学習済み（取消）' : 'このレッスンを学習済みにする') + '</button>' +
      '<a class="btn btn-primary" href="#/quiz/lessonquiz-' + id + '">小テストに進む →</a>' +
      '</div>' +
      '<div class="lesson-nav">' +
      (prev ? '<a class="btn btn-sm" href="#/lesson/' + prev.id + '">← ' + esc(prev.title) + '</a>' : '<span></span>') +
      (next ? '<a class="btn btn-sm" href="#/lesson/' + next.id + '">' + esc(next.title) + ' →</a>' : '<span></span>') +
      '</div>';
  }

  function wireLesson(id) {
    var btn = byId('markDone');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var done = Store.isLessonDone(id);
      if (done) { var m = Store.lessonsDone(); delete m[id]; Store.set('lessons', m); }
      else { Store.markLesson(id); }
      render();
    });
  }

  /* ---------- 英単語カード ---------- */
  function viewVocab() {
    var rows = '';
    C.domains.forEach(function (d) {
      var ls = lessonsOf(d.id);
      var items = [];
      ls.forEach(function (l) { (l.vocab || []).forEach(function (v) { items.push(v); }); });
      if (!items.length) return;
      rows += '<h2 class="sec-title">' + d.emoji + ' ' + esc(d.title) + '</h2>';
      rows += '<table class="vocab-table card"><tbody>' +
        items.map(function (v) { return '<tr><td class="vocab-en">' + esc(v.en) + '</td><td>' + esc(v.ja) + '</td></tr>'; }).join('') +
        '</tbody></table>';
    });
    return '<div class="page-head"><a class="back" href="#/">← ホーム</a><h1>🔤 英単語カード</h1>' +
      '<p class="muted">本番は英語の試験です。ここの用語を「見て意味が分かる」状態にしておけば十分戦えます。</p></div>' +
      (rows || '<div class="card">単語データの読み込みを待っています…</div>');
  }

  /* ============================================================
     テストエンジン
     ============================================================ */
  var QUIZ = null;

  function resolveExam(examId) {
    // 返り値: {id,title,type,mode,duration,questionIds,backHash}
    if (examId === 'random') {
      var dist = C.config.mockDistribution || {};
      var ids = [];
      Object.keys(dist).forEach(function (dom) {
        var pool = questionsOf(dom).map(function (q) { return q.id; });
        ids = ids.concat(shuffle(pool).slice(0, dist[dom]));
      });
      // 不足分は全体から補充
      if (ids.length < C.config.mockSize) {
        var all = shuffle(Object.keys(C.questions)).filter(function (x) { return ids.indexOf(x) < 0; });
        ids = ids.concat(all.slice(0, C.config.mockSize - ids.length));
      }
      return { id: 'random', title: '🎲 ランダム模試', type: 'mock', mode: 'exam',
        duration: C.config.mockDurationMin, questionIds: shuffle(ids), backHash: '#/' };
    }
    if (examId.indexOf('lessonquiz-') === 0) {
      var lid = examId.slice('lessonquiz-'.length);
      var l = C.lessons[lid];
      if (!l) return null;
      return { id: examId, title: l.title + '・小テスト', type: 'lesson', mode: 'study',
        duration: 0, questionIds: (l.quizIds || []).slice(), backHash: '#/lesson/' + lid };
    }
    if (examId === 'review') {
      var w = Store.wrong();
      return { id: 'review', title: '🔁 間違い復習', type: 'review', mode: 'study',
        duration: 0, questionIds: shuffle(w), backHash: '#/review' };
    }
    var ex = C.exams[examId];
    if (!ex) return null;
    var isMock = ex.type === 'mock';
    return {
      id: ex.id, title: ex.title, type: ex.type,
      mode: isMock ? 'exam' : 'study',
      duration: isMock ? (ex.durationMin || C.config.mockDurationMin) : 0,
      questionIds: (ex.questionIds || []).slice(),
      backHash: isMock ? '#/' : '#/domain/' + (ex.domainId || ''),
    };
  }

  function startQuiz(examId) {
    var ex = resolveExam(examId);
    if (!ex || !ex.questionIds.length) {
      $app.innerHTML = '<div class="page-head"><a class="back" href="#/">← ホーム</a><h1>テストを開始できません</h1></div>' +
        '<div class="card">問題が見つかりませんでした。' +
        (examId === 'review' ? 'まだ間違えた問題がありません。テストを受けると、間違えた問題がここに溜まります。' : 'データの読み込み中か、対象の問題がありません。') +
        '</div>';
      return;
    }
    var qids = ex.questionIds.filter(function (id) { return C.questions[id]; });
    // 模試は問題順をシャッフル
    if (ex.type === 'mock') qids = shuffle(qids);
    QUIZ = {
      ex: ex,
      qids: qids,
      order: buildOrder(qids),  // qid -> 選択肢の表示順（origIndex配列）
      idx: 0,
      answers: {},        // qid -> 選択した「元の」選択肢index
      revealed: {},       // qid -> bool（学習モードで解説表示済み）
      submitted: false,
      startTs: Date.now(),
      deadline: ex.duration ? Date.now() + ex.duration * 60000 : 0,
      timerId: null,
    };
    if (QUIZ.deadline) {
      QUIZ.timerId = setInterval(tickTimer, 1000);
    }
    renderQuiz();
  }

  function tickTimer() {
    if (!QUIZ || QUIZ.submitted) return;
    var el = byId('timer');
    var left = QUIZ.deadline - Date.now();
    if (left <= 0) { submitQuiz(); return; }
    if (el) {
      var m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
      el.textContent = '⏱ ' + m + ':' + (s < 10 ? '0' : '') + s;
      if (left < 5 * 60000) el.classList.add('timer-warn');
    }
  }

  function renderQuiz() {
    var ex = QUIZ.ex;
    var total = QUIZ.qids.length;
    var qid = QUIZ.qids[QUIZ.idx];
    var q = C.questions[qid];
    var sel = QUIZ.answers[qid];     // 元のindex
    var order = QUIZ.order[qid] || q.options.map(function (_, i) { return i; });
    var isStudy = ex.mode === 'study';
    var revealed = isStudy && QUIZ.revealed[qid];

    // ナビゲーション・グリッド
    var grid = QUIZ.qids.map(function (id, i) {
      var cls = 'qn';
      if (i === QUIZ.idx) cls += ' cur';
      if (QUIZ.answers[id] != null) cls += ' answered';
      return '<button class="' + cls + '" data-goto="' + i + '">' + (i + 1) + '</button>';
    }).join('');

    var answeredCount = Object.keys(QUIZ.answers).length;

    var opts = order.map(function (origIdx, dpos) {
      var cls = 'opt';
      if (sel === origIdx) cls += ' selected';
      if (revealed) {
        if (origIdx === q.answerIndex) cls += ' correct';
        else if (sel === origIdx) cls += ' wrong';
      }
      var mark = String.fromCharCode(65 + dpos);
      return '<button class="' + cls + '" data-opt="' + origIdx + '"' + (revealed ? ' disabled' : '') + '>' +
        '<span class="opt-mark">' + mark + '</span><span class="opt-text">' + esc(q.options[origIdx]) + '</span></button>';
    }).join('');

    var explain = '';
    if (revealed) {
      var ok = sel === q.answerIndex;
      var correctLetter = String.fromCharCode(65 + order.indexOf(q.answerIndex));
      explain = '<div class="explain ' + (ok ? 'ex-ok' : 'ex-ng') + '">' +
        '<div class="ex-head">' + (ok ? '⭕ 正解' : '❌ 不正解') + '　正解は ' + correctLetter + '</div>' +
        '<div class="ex-body">' + mdToHtml(q.explanation || '') + '</div></div>';
    }

    var headExtra = ex.mode === 'exam'
      ? '<span id="timer" class="timer">⏱ --:--</span>'
      : '';

    var footer;
    if (isStudy) {
      footer = '<div class="quiz-foot">' +
        '<button class="btn btn-sm" id="prevBtn"' + (QUIZ.idx === 0 ? ' disabled' : '') + '>← 前へ</button>' +
        (revealed
          ? (QUIZ.idx < total - 1
            ? '<button class="btn btn-primary" id="nextBtn">次の問題 →</button>'
            : '<button class="btn btn-primary" id="finishBtn">結果を見る</button>')
          : '<button class="btn btn-primary" id="checkBtn"' + (sel == null ? ' disabled' : '') + '>答え合わせ</button>') +
        '<button class="btn btn-sm" id="nextBtn2"' + (QUIZ.idx >= total - 1 ? ' disabled' : '') + '>スキップ →</button>' +
        '</div>';
    } else {
      footer = '<div class="quiz-foot">' +
        '<button class="btn btn-sm" id="prevBtn"' + (QUIZ.idx === 0 ? ' disabled' : '') + '>← 前へ</button>' +
        (QUIZ.idx < total - 1
          ? '<button class="btn btn-primary" id="nextBtn">次へ →</button>'
          : '<button class="btn btn-primary" id="submitBtn">採点する（' + answeredCount + '/' + total + '）</button>') +
        '<button class="btn btn-sm danger" id="submitEarly">途中で採点</button>' +
        '</div>';
    }

    $app.innerHTML = '' +
      '<div class="quiz-top">' +
      '<a class="back" href="' + ex.backHash + '" id="quitQuiz">← 中断</a>' +
      '<div class="quiz-title">' + esc(ex.title) + '</div>' +
      headExtra +
      '</div>' +
      '<div class="quiz-progress">' + progressBar(Math.round((answeredCount / total) * 100), '#6366f1') +
      '<span class="qp-text">' + (QUIZ.idx + 1) + ' / ' + total + '　（回答済み ' + answeredCount + '）</span></div>' +
      '<div class="qnav">' + grid + '</div>' +
      '<div class="card question">' +
      '<div class="q-head">問題 ' + (QUIZ.idx + 1) + ' ' + diffBadge(q.difficulty) +
      ' <span class="q-dom">' + esc((domainById(q.domainId) || {}).title || q.domainId || '') + '</span></div>' +
      (q.scenario ? '<div class="q-scenario">' + esc(q.scenario) + '</div>' : '') +
      '<div class="q-text">' + esc(q.question) + '</div>' +
      '<div class="opts">' + opts + '</div>' +
      explain +
      '</div>' +
      footer;

    wireQuiz();
    if (ex.mode === 'exam') tickTimer();
  }

  function wireQuiz() {
    var qid = QUIZ.qids[QUIZ.idx];
    var revealed = QUIZ.ex.mode === 'study' && QUIZ.revealed[qid];

    Array.prototype.forEach.call(document.querySelectorAll('.opt'), function (b) {
      b.addEventListener('click', function () {
        if (revealed) return;
        QUIZ.answers[qid] = parseInt(b.getAttribute('data-opt'), 10);
        renderQuiz();
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.qn'), function (b) {
      b.addEventListener('click', function () { QUIZ.idx = parseInt(b.getAttribute('data-goto'), 10); renderQuiz(); });
    });
    function on(id, fn) { var e = byId(id); if (e) e.addEventListener('click', fn); }
    on('prevBtn', function () { if (QUIZ.idx > 0) { QUIZ.idx--; renderQuiz(); } });
    on('nextBtn', function () { if (QUIZ.idx < QUIZ.qids.length - 1) { QUIZ.idx++; renderQuiz(); } });
    on('nextBtn2', function () { if (QUIZ.idx < QUIZ.qids.length - 1) { QUIZ.idx++; renderQuiz(); } });
    on('checkBtn', function () { if (QUIZ.answers[qid] != null) { QUIZ.revealed[qid] = true; renderQuiz(); } });
    on('finishBtn', submitQuiz);
    on('submitBtn', confirmSubmit);
    on('submitEarly', confirmSubmit);
    on('quitQuiz', function (e) {
      if (!QUIZ.submitted && Object.keys(QUIZ.answers).length > 0) {
        if (!window.confirm('テストを中断します。回答は保存されません。よろしいですか？')) { e.preventDefault(); }
      }
      if (QUIZ.timerId) clearInterval(QUIZ.timerId);
    });
  }

  function confirmSubmit() {
    var unanswered = QUIZ.qids.length - Object.keys(QUIZ.answers).length;
    if (unanswered > 0) {
      if (!window.confirm('未回答が ' + unanswered + '問あります。採点しますか？（未回答は不正解扱い）')) return;
    }
    submitQuiz();
  }

  function submitQuiz() {
    if (QUIZ.submitted) return;
    QUIZ.submitted = true;
    if (QUIZ.timerId) clearInterval(QUIZ.timerId);

    var correct = 0, wrongIds = [], rightIds = [];
    QUIZ.qids.forEach(function (qid) {
      var q = C.questions[qid];
      if (QUIZ.answers[qid] === q.answerIndex) { correct++; rightIds.push(qid); }
      else wrongIds.push(qid);
    });
    var total = QUIZ.qids.length;
    var pct = Math.round((correct / total) * 100);
    var scaled = scaledScore(pct);
    var passed = scaled >= C.config.passScaled;

    // 復習・ランダムは成績を「ベスト」に記録しない（examId固定のものだけ）
    var recordId = QUIZ.ex.id;
    var attempt = {
      examId: recordId, title: QUIZ.ex.title, type: QUIZ.ex.type,
      total: total, correct: correct, percent: pct, scaled: scaled, passed: passed,
      wrongIds: wrongIds, rightIds: rightIds,
      date: new Date().toISOString(),
    };
    Store.recordAttempt(attempt);
    QUIZ.result = attempt;
    renderResult();
  }

  function renderResult() {
    var a = QUIZ.result;
    var ex = QUIZ.ex;
    var passColor = a.passed ? '#10b981' : '#ef4444';

    // ドメイン別の正答（模試用）
    var domStats = {};
    QUIZ.qids.forEach(function (qid) {
      var q = C.questions[qid];
      var dom = q.domainId || 'other';
      domStats[dom] = domStats[dom] || { t: 0, c: 0 };
      domStats[dom].t++;
      if (QUIZ.answers[qid] === q.answerIndex) domStats[dom].c++;
    });
    var domHtml = Object.keys(domStats).map(function (dom) {
      var s = domStats[dom];
      var d = domainById(dom);
      var p = Math.round((s.c / s.t) * 100);
      return '<div class="dom-stat"><span class="ds-name">' + esc(d ? d.title : dom) + '</span>' +
        '<span class="ds-num">' + s.c + '/' + s.t + '</span>' + progressBar(p, (d || {}).color) + '</div>';
    }).join('');

    var reviewList = QUIZ.qids.map(function (qid, i) {
      var q = C.questions[qid];
      var sel = QUIZ.answers[qid];
      var ok = sel === q.answerIndex;
      var order = QUIZ.order[qid] || q.options.map(function (_, i) { return i; });
      var optsHtml = order.map(function (origIdx, dpos) {
        var cls = 'rv-opt';
        if (origIdx === q.answerIndex) cls += ' correct';
        if (sel === origIdx && !ok) cls += ' wrong';
        return '<div class="' + cls + '"><b>' + String.fromCharCode(65 + dpos) + '.</b> ' + esc(q.options[origIdx]) +
          (origIdx === q.answerIndex ? ' ✅' : (sel === origIdx ? ' ←あなたの回答' : '')) + '</div>';
      }).join('');
      return '<details class="rv ' + (ok ? 'rv-ok' : 'rv-ng') + '"' + (ok ? '' : ' open') + '>' +
        '<summary>' + (ok ? '⭕' : '❌') + ' 問題' + (i + 1) + '　' + diffBadge(q.difficulty) +
        '<span class="rv-q">' + esc(q.question) + '</span></summary>' +
        '<div class="rv-body">' +
        (q.scenario ? '<div class="q-scenario">' + esc(q.scenario) + '</div>' : '') +
        optsHtml +
        '<div class="explain ' + (ok ? 'ex-ok' : 'ex-ng') + '"><div class="ex-body">' + mdToHtml(q.explanation || '') + '</div></div>' +
        '</div></details>';
    }).join('');

    $app.innerHTML = '' +
      '<div class="page-head"><a class="back" href="' + ex.backHash + '">← 戻る</a><h1>採点結果</h1></div>' +
      '<div class="card result-card" style="border-color:' + passColor + '">' +
      '<div class="result-badge" style="background:' + passColor + '">' + (a.passed ? '合格ライン到達 🎉' : 'あと一歩') + '</div>' +
      '<div class="result-main">' +
      '<div class="result-score"><span class="rs-num">' + a.percent + '</span><span class="rs-unit">%</span></div>' +
      '<div class="result-detail">' +
      '<div>正答 <b>' + a.correct + ' / ' + a.total + '</b></div>' +
      '<div>スケールドスコア <b>' + a.scaled + '</b> / ' + C.config.scaleMax + '（合格 ' + C.config.passScaled + '）</div>' +
      '</div></div>' +
      progressBar(a.percent, passColor) +
      '</div>' +
      (Object.keys(domStats).length > 1 ? '<h2 class="sec-title">ドメイン別の正答</h2><div class="card">' + domHtml + '</div>' : '') +
      '<div class="result-actions">' +
      '<button class="btn btn-primary" id="retry">もう一度</button>' +
      '<a class="btn" href="#/review">🔁 間違いを復習</a>' +
      '<a class="btn" href="' + ex.backHash + '">戻る</a>' +
      '<a class="btn" href="#/">ホーム</a>' +
      '</div>' +
      '<h2 class="sec-title">解説（' + (a.total - a.correct) + '問の間違いを開いています）</h2>' +
      '<div class="reviews">' + reviewList + '</div>';

    var rb = byId('retry');
    if (rb) rb.addEventListener('click', function () { startQuiz(ex.id); });
    window.scrollTo(0, 0);
  }

  function viewReview() {
    var w = Store.wrong();
    var count = w.filter(function (id) { return C.questions[id]; }).length;
    return '<div class="page-head"><a class="back" href="#/">← ホーム</a><h1>🔁 間違い復習</h1>' +
      '<p class="muted">テストで間違えた問題が自動で溜まります。正解できると消えていきます。</p></div>' +
      '<div class="card review-cta">' +
      '<div><div class="ec-title">未克服の問題：' + count + '問</div>' +
      '<div class="muted">' + (count ? 'まとめて解いて、復習リストを空にしましょう。' : '今は復習する問題がありません。テストを受けてみましょう。') + '</div></div>' +
      (count ? '<a class="btn btn-primary" href="#/quiz/review">復習を始める</a>' : '<a class="btn btn-primary" href="#/quiz/random">模試に挑戦</a>') +
      '</div>' +
      (count ? '<button class="btn btn-sm danger" id="clearWrong" style="margin-top:12px">復習リストを空にする</button>' : '');
  }
  function wireReview() {
    var b = byId('clearWrong');
    if (b) b.addEventListener('click', function () {
      if (window.confirm('復習リストを空にしますか？')) { Store.clearWrong(); render(); }
    });
  }

  function notFound() {
    return '<div class="page-head"><a class="back" href="#/">← ホーム</a><h1>ページが見つかりません</h1></div>' +
      '<div class="card">データの読み込み中かもしれません。少し待ってから再読み込みしてください。</div>';
  }

  function dataLoadingNotice() {
    return '<div class="card warn"><strong>教材データを読み込めませんでした。</strong>' +
      '<p>このページは <code>http://</code> での表示を推奨します。ターミナルでフォルダ内に移動し ' +
      '<code>python3 -m http.server 8000</code> を実行し、<code>http://localhost:8000</code> を開いてください。</p></div>';
  }

  /* ============================================================
     ルーター
     ============================================================ */
  function render() {
    if (!$app) $app = byId('app');
    var hash = window.location.hash || '#/';
    var parts = hash.replace(/^#\//, '').split('/');
    var route = parts[0] || '';

    // クイズ系は専用描画
    if (route === 'quiz') { startQuiz(parts.slice(1).join('/')); afterRender(route); return; }

    var html;
    if (!dataReady() && route !== '') {
      html = dataLoadingNotice();
    } else if (route === '' ) {
      html = dataReady() ? viewHome() : (dataLoadingNotice() + viewHome());
    } else if (route === 'plan') html = viewPlan();
    else if (route === 'domain') html = viewDomain(parts[1]);
    else if (route === 'lesson') html = viewLesson(parts[1]);
    else if (route === 'review') html = viewReview();
    else if (route === 'vocab') html = viewVocab();
    else html = notFound();

    $app.innerHTML = html;

    if (route === 'lesson') wireLesson(parts[1]);
    if (route === 'review') wireReview();
    afterRender(route);
  }

  function afterRender(route) {
    // ナビのアクティブ表示
    Array.prototype.forEach.call(document.querySelectorAll('.nav-link'), function (a) {
      var target = a.getAttribute('data-route');
      a.classList.toggle('active', target === route || (route === '' && target === ''));
    });
    if (route !== 'quiz') window.scrollTo(0, 0);
  }

  function init() {
    $app = byId('app');
    window.addEventListener('hashchange', render);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
