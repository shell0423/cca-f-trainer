/* tools/smoketest.js — ブラウザと同じ読み込み経路で動作を検証する
   registry.js → data → の順に実際に実行し、CCA が正しく構築されるかを確認。
   使い方:  node tools/smoketest.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
let fail = 0;
function ok(c, m) { console.log((c ? '  ✅ ' : '  ❌ ') + m); if (!c) fail++; }

// ブラウザ同様、window をグローバルとして扱うサンドボックス
const sandbox = { console };
sandbox.window = sandbox;          // window === global（ブラウザの挙動を模倣）
vm.createContext(sandbox);

function run(rel) {
  const p = path.join(ROOT, rel);
  vm.runInContext(fs.readFileSync(p, 'utf8'), sandbox, { filename: rel });
}

console.log('\n=== ブラウザ読み込みシミュレーション ===\n');
run('js/registry.js');
['js/data/curriculum.js', 'js/data/docs.js', 'js/data/d1.js', 'js/data/d2.js', 'js/data/d3.js',
 'js/data/d4.js', 'js/data/d5.js', 'js/data/mock-1.js', 'js/data/mock-2.js'].forEach(run);

const C = sandbox.CCA;
ok(!!C, 'window.CCA が構築された');
ok(C.domains.length === 5, 'ドメイン数 = 5 (' + C.domains.length + ')');
ok(C.plan.length === 12, '12週プラン (' + C.plan.length + ')');
ok(C.docs && typeof C.docs.guide === 'string' && C.docs.guide.length > 200, '使い方ガイドが存在');
ok(C.docs && Array.isArray(C.docs.changelog) && C.docs.changelog.length >= 1, '変更履歴が存在 (' + (C.docs.changelog || []).length + '件)');
ok(Object.keys(C.lessons).length === 21, 'レッスン数 = 21 (' + Object.keys(C.lessons).length + ')');
ok(Object.keys(C.questions).length === 300, '問題数 = 300 (' + Object.keys(C.questions).length + ')');
ok(Object.keys(C.exams).length === 7, '試験数 = 7 (' + Object.keys(C.exams).length + ')');

console.log('\n--- 試験の問題解決 ---');
Object.keys(C.exams).forEach((id) => {
  const e = C.exams[id];
  const bad = (e.questionIds || []).filter((q) => !C.questions[q]);
  ok(bad.length === 0, id + ': ' + e.questionIds.length + '問すべて解決' + (bad.length ? ' (未解決:' + bad.length + ')' : ''));
});

console.log('\n--- レッスンの小テスト解決 ---');
let lq = 0, lqbad = 0;
Object.keys(C.lessons).forEach((id) => {
  (C.lessons[id].quizIds || []).forEach((qid) => { lq++; if (!C.questions[qid]) lqbad++; });
});
ok(lqbad === 0, 'レッスン小テスト ' + lq + '問すべて解決 (未解決:' + lqbad + ')');

console.log('\n--- ランダム模試の生成 (app.jsと同じ配分ロジック) ---');
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function questionsOf(d) { return Object.keys(C.questions).filter((k) => C.questions[k].domainId === d); }
const dist = C.config.mockDistribution;
let ids = [];
Object.keys(dist).forEach((d) => { ids = ids.concat(shuffle(questionsOf(d)).slice(0, dist[d])); });
ok(ids.length === 60, 'ランダム模試 = 60問 (' + ids.length + ')');
ok(ids.every((x) => C.questions[x]), 'ランダム模試の全問が解決');

console.log('\n--- 選択肢シャッフルの健全性 ---');
const POS = /選択肢\s*[0-9０-９A-DＡ-Ｄ]|誤答\s*[0-9０-９]|正解\s*[0-9０-９]|[（(]\s*[A-DＡ-Ｄ]\s*[）)]/;
let shufSafe = 0, permOk = true;
Object.keys(C.questions).forEach((id) => {
  const q = C.questions[id];
  if (!POS.test(q.explanation || '')) shufSafe++;
  const order = shuffle(q.options.map((_, i) => i));
  // 並べ替え後も全選択肢が1回ずつ・正解が復元できる
  if (order.slice().sort().join() !== q.options.map((_, i) => i).sort().join()) permOk = false;
  if (order.indexOf(q.answerIndex) < 0) permOk = false;
});
ok(shufSafe === 300, 'シャッフル可能な問題 = 300 (' + shufSafe + ')');
ok(permOk, 'シャッフル順は全選択肢を保持し正解を復元可能');

console.log('\n--- 正解と解説の整合 抜き取り確認 ---');
['q-d1-l1-1', 'q-m1-1', 'q-m1-3', 'q-d5-l2-1'].forEach((id) => {
  const q = C.questions[id];
  if (!q) { ok(false, id + ' が存在しない'); return; }
  console.log('  [' + id + '] 正解(idx' + q.answerIndex + '): ' + q.options[q.answerIndex].slice(0, 44));
  console.log('       解説: ' + (q.explanation || '').replace(/\n/g, ' ').slice(0, 90) + '…');
});

console.log('\n=== ' + (fail ? '❌ 失敗 ' + fail + '件' : '✅ すべて合格') + ' ===\n');
process.exit(fail ? 1 : 0);
