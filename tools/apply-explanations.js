/* tools/apply-explanations.js — エージェントが出力した解説マップ(tools/exp/<file>.json)を
   データファイルに適用する。explanation だけを差し替え、選択肢・answerIndex 等は一切変更しない。
   使い方:  node tools/apply-explanations.js
*/
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'js', 'data');
const EXP = path.join(ROOT, 'tools', 'exp');
const FILES = ['d1', 'd2', 'd3', 'd5', 'mock-1'];

const POSREF = /選択肢\s*[0-9０-９A-DＡ-Ｄ]|誤答\s*[0-9０-９]|正解\s*[0-9０-９]|[（(]\s*[A-DＡ-Ｄ]\s*[）)]/;

// data ファイルから CCA_REGISTER.bulk() に渡された生オブジェクトを取り出す
function captureBulk(file) {
  let captured = null;
  const sandbox = {
    window: {}, console,
    CCA_REGISTER: {
      config() {}, domainMeta() {}, plan() {}, lesson() {}, question() {}, exam() {},
      bulk(d) { captured = d; },
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: path.basename(file) });
  return captured;
}

let totalReplaced = 0, totalRemaining = 0, fail = 0;
console.log('\n=== 解説の内容参照化を適用 ===\n');

for (const id of FILES) {
  const dataFile = path.join(DATA, id + '.js');
  const expFile = path.join(EXP, id + '.json');
  process.stdout.write('• ' + id + ' … ');

  if (!fs.existsSync(expFile)) { console.log('解説JSONが未出力（スキップ）'); fail++; continue; }

  let exp;
  try { exp = JSON.parse(fs.readFileSync(expFile, 'utf8')); }
  catch (e) { console.log('解説JSONのパース失敗: ' + e.message); fail++; continue; }

  const map = {};
  (exp.items || []).forEach((it) => { if (it && it.id) map[it.id] = it.explanation; });

  let data;
  try { data = captureBulk(dataFile); }
  catch (e) { console.log('データ読み込み失敗: ' + e.message); fail++; continue; }
  if (!data || !Array.isArray(data.questions)) { console.log('questions が見つからない'); fail++; continue; }

  let replaced = 0, remaining = 0;
  data.questions.forEach((q) => {
    if (map[q.id] && typeof map[q.id] === 'string' && map[q.id].trim()) {
      q.explanation = map[q.id];
      replaced++;
    }
    if (POSREF.test(q.explanation || '')) remaining++;
  });

  // 書き戻し（explanation 以外は触っていない）
  fs.writeFileSync(dataFile, 'CCA_REGISTER.bulk(\n' + JSON.stringify(data) + '\n);\n');
  totalReplaced += replaced; totalRemaining += remaining;
  console.log('差し替え ' + replaced + '/' + data.questions.length + '　位置参照の残り ' + remaining + '問');
}

console.log('\n--- 合計 ---');
console.log('差し替えた解説: ' + totalReplaced);
console.log('位置参照が残る問題（=シャッフル対象外になる）: ' + totalRemaining);
if (fail) console.log('処理できなかったファイル: ' + fail);
console.log('\n適用後は `node tools/validate.js` で再検証してください。\n');
process.exit(0);
