/* tools/validate.js — データファイルを Node 上で読み込み、内容を検証する
   使い方:  node tools/validate.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'js', 'data');

// 仮想の window / CCA / CCA_REGISTER を用意
const CCA = { config: {}, domains: [], plan: [], lessons: {}, questions: {}, exams: {} };
function upsert(map, o) { if (o && o.id) map[o.id] = Object.assign(map[o.id] || {}, o); }
const CCA_REGISTER = {
  config(c) { Object.assign(CCA.config, c || {}); },
  domainMeta(l) { if (Array.isArray(l)) CCA.domains = l; },
  plan(p) { if (Array.isArray(p)) CCA.plan = p; },
  lesson(l) { upsert(CCA.lessons, l); },
  question(q) { upsert(CCA.questions, q); },
  exam(e) { upsert(CCA.exams, e); },
  bulk(d) {
    if (!d) return;
    (d.lessons || []).forEach((l) => upsert(CCA.lessons, l));
    (d.questions || []).forEach((q) => upsert(CCA.questions, q));
    if (d.exam) upsert(CCA.exams, d.exam);
    if (Array.isArray(d.exams)) d.exams.forEach((e) => upsert(CCA.exams, e));
  },
};
const sandbox = { window: {}, CCA, CCA_REGISTER, console };
vm.createContext(sandbox);

const FILES = [
  'curriculum.js', 'd1.js', 'd2.js', 'd3.js', 'd4.js', 'd5.js', 'mock-1.js', 'mock-2.js',
];

let errors = 0, warnings = 0;
function err(m) { console.log('  ❌ ' + m); errors++; }
function warn(m) { console.log('  ⚠️  ' + m); warnings++; }

console.log('\n=== CCA-F データ検証 ===\n');

for (const f of FILES) {
  const p = path.join(DATA, f);
  process.stdout.write('• ' + f + ' … ');
  if (!fs.existsSync(p)) { console.log('見つかりません（未生成）'); err(f + ' が存在しません'); continue; }
  const src = fs.readFileSync(p, 'utf8');
  try {
    vm.runInContext(src, sandbox, { filename: f });
    console.log('読み込みOK');
  } catch (e) {
    console.log('読み込み失敗');
    err(f + ' の実行エラー: ' + e.message);
  }
}

console.log('\n--- 集計 ---');
console.log('ドメイン: ' + CCA.domains.length);
console.log('レッスン: ' + Object.keys(CCA.lessons).length);
console.log('問題    : ' + Object.keys(CCA.questions).length);
console.log('試験    : ' + Object.keys(CCA.exams).length);

console.log('\n--- 問題の妥当性 ---');
let distrib = { 0: 0, 1: 0, 2: 0, 3: 0 };
for (const id of Object.keys(CCA.questions)) {
  const q = CCA.questions[id];
  if (!Array.isArray(q.options) || q.options.length !== 4) err(id + ': options が4つではない (' + (q.options ? q.options.length : 'なし') + ')');
  if (typeof q.answerIndex !== 'number' || q.answerIndex < 0 || q.answerIndex > 3) err(id + ': answerIndex 不正 (' + q.answerIndex + ')');
  else distrib[q.answerIndex]++;
  if (!q.question) err(id + ': question が空');
  if (!q.explanation) warn(id + ': explanation が空');
  if (!q.domainId) warn(id + ': domainId が無い');
}
console.log('正解位置の分布 A/B/C/D = ' + distrib[0] + '/' + distrib[1] + '/' + distrib[2] + '/' + distrib[3]);

console.log('\n--- レッスンと小テストの整合 ---');
for (const id of Object.keys(CCA.lessons)) {
  const l = CCA.lessons[id];
  if (!l.body) warn(id + ': body が空');
  (l.quizIds || []).forEach((qid) => { if (!CCA.questions[qid]) err(id + ': quizId ' + qid + ' に対応する問題が無い'); });
}

console.log('\n--- 試験の整合 ---');
for (const id of Object.keys(CCA.exams)) {
  const e = CCA.exams[id];
  const qids = e.questionIds || [];
  if (!qids.length) err(id + ': questionIds が空');
  qids.forEach((qid) => { if (!CCA.questions[qid]) err(id + ': ' + qid + ' に対応する問題が無い'); });
  console.log('  ' + id + ' (' + e.type + '): ' + qids.length + '問');
}

// ドメイン別 問題数
console.log('\n--- ドメイン別 問題数 ---');
const byDom = {};
for (const id of Object.keys(CCA.questions)) { const d = CCA.questions[id].domainId || '?'; byDom[d] = (byDom[d] || 0) + 1; }
Object.keys(byDom).sort().forEach((d) => console.log('  ' + d + ': ' + byDom[d] + '問'));

console.log('\n=== 結果: エラー ' + errors + ' / 警告 ' + warnings + ' ===\n');
process.exit(errors ? 1 : 0);
