/* curriculum.js — ドメイン情報・12週学習プラン・試験設定 */
CCA_REGISTER.config({
  passScaled: 720,
  scaleMin: 100,
  scaleMax: 1000,
  mockSize: 60,
  mockDurationMin: 120,
  // ランダム模試のドメイン配分（本試験の比重に対応：合計60）
  mockDistribution: { d1: 16, d2: 11, d3: 12, d4: 12, d5: 9 },
});

CCA_REGISTER.domainMeta([
  {
    id: 'd1', title: 'エージェント設計とオーケストレーション', weight: 27,
    emoji: '🧭', color: '#6366f1',
    summary: 'エージェントとワークフローの違い、自律ループ、コンテキスト管理、マルチエージェント、失敗対処と人間へのエスカレーション。試験で最も比重が大きい最重要領域。',
  },
  {
    id: 'd2', title: 'ツール設計とMCP統合', weight: 18,
    emoji: '🔧', color: '#0ea5e9',
    summary: '関数(ツール)定義とスキーマ設計、良いツールの原則、MCP(Model Context Protocol)の仕組みと実装・セキュリティ。',
  },
  {
    id: 'd3', title: 'Claude Codeの設定とワークフロー', weight: 20,
    emoji: '⌨️', color: '#10b981',
    summary: 'Claude CodeのCLI/権限モデル、CLAUDE.mdとsettings.json、フック・スラッシュコマンド・サブエージェント、MCP連携と実務ワークフロー。',
  },
  {
    id: 'd4', title: 'プロンプトエンジニアリングと構造化出力', weight: 20,
    emoji: '✍️', color: '#f59e0b',
    summary: '効果的なプロンプト設計、JSON/構造化出力の強制、思考の引き出し、評価による反復改善。',
  },
  {
    id: 'd5', title: '本番運用・評価・コスト・安全性', weight: 15,
    emoji: '🛡️', color: '#ef4444',
    summary: 'Evals(評価)、コスト/レイテンシ最適化、ガードレールと人間のエスカレーション、監視・可観測性・デプロイ。',
  },
]);

CCA_REGISTER.plan([
  {
    week: 1, phase: '基礎固め', title: 'エージェントの全体像をつかむ',
    goal: 'エージェントとワークフローの違い、自律ループを理解する',
    lessons: ['d1-l1', 'd1-l2'],
    tasks: ['ドメイン1のL1・L2を学習', '各レッスンの小テストで80%以上', '用語カードで英単語に慣れる'],
  },
  {
    week: 2, phase: '基礎固め', title: 'コンテキストとマルチエージェント',
    goal: 'コンテキスト管理とオーケストレーション設計を理解する',
    lessons: ['d1-l3', 'd1-l4', 'd1-l5'],
    tasks: ['ドメイン1のL3〜L5を学習', '「ドメイン1 模擬試験」に挑戦', '間違えた問題を復習'],
  },
  {
    week: 3, phase: '基礎固め', title: 'ツールとMCPの基礎',
    goal: 'ツール定義の原則とMCPの全体像を理解する',
    lessons: ['d2-l1', 'd2-l2', 'd2-l3', 'd2-l4'],
    tasks: ['ドメイン2の全レッスンを学習', '小テストで各80%以上', 'MCPの tools/resources/prompts を説明できるように'],
  },
  {
    week: 4, phase: '基礎固め', title: '復習＆ドメイン2試験',
    goal: 'ドメイン1・2を定着させる',
    lessons: [],
    tasks: ['「ドメイン2 模擬試験」に挑戦', '復習タブで弱点をつぶす', 'ドメイン1の模試を再挑戦して90%超を目指す'],
  },
  {
    week: 5, phase: '実装力', title: 'Claude Code を知る（前半）',
    goal: 'Claude CodeのCLI・権限・設定を理解する',
    lessons: ['d3-l1', 'd3-l2'],
    tasks: ['ドメイン3のL1・L2を学習', 'CLAUDE.md と settings.json の役割を整理', '小テストで80%以上'],
  },
  {
    week: 6, phase: '実装力', title: 'Claude Code を知る（後半）',
    goal: 'フック・サブエージェント・実務ワークフローを理解する',
    lessons: ['d3-l3', 'd3-l4'],
    tasks: ['ドメイン3のL3・L4を学習', '「ドメイン3 模擬試験」に挑戦', '間違えた問題を復習'],
  },
  {
    week: 7, phase: '実装力', title: 'プロンプト設計（前半）',
    goal: '効果的なプロンプトと構造化出力を理解する',
    lessons: ['d4-l1', 'd4-l2'],
    tasks: ['ドメイン4のL1・L2を学習', '構造化出力の強制方法を説明できるように', '小テストで80%以上'],
  },
  {
    week: 8, phase: '実装力', title: 'プロンプト設計（後半）',
    goal: '思考の引き出しと評価による改善を理解する',
    lessons: ['d4-l3', 'd4-l4'],
    tasks: ['ドメイン4のL3・L4を学習', '「ドメイン4 模擬試験」に挑戦', '弱点を復習'],
  },
  {
    week: 9, phase: '実装力', title: '本番運用・評価・コスト・安全性',
    goal: 'Evals・コスト最適化・ガードレール・監視を理解する',
    lessons: ['d5-l1', 'd5-l2', 'd5-l3', 'd5-l4'],
    tasks: ['ドメイン5の全レッスンを学習', '「ドメイン5 模擬試験」に挑戦', 'モデル選択の指針(Opus/Sonnet/Haiku)を整理'],
  },
  {
    week: 10, phase: '総仕上げ', title: '全範囲の復習＆模試1',
    goal: '弱点ドメインを特定する',
    lessons: [],
    tasks: ['全ドメインのキーポイントを再確認', '「本番想定 模擬試験 1」を時間内(120分)で実施', '結果から弱点ドメインを特定'],
  },
  {
    week: 11, phase: '総仕上げ', title: '弱点補強＆模試2',
    goal: '合格ライン(約70%／スケールド720)を安定させる',
    lessons: [],
    tasks: ['弱点ドメインのレッスン・小テストを再周回', '「本番想定 模擬試験 2」を時間内で実施', '復習タブの間違いをゼロに近づける'],
  },
  {
    week: 12, phase: '総仕上げ', title: '最終調整',
    goal: 'どの模試でも合格できる状態に仕上げる',
    lessons: [],
    tasks: ['「ランダム模試」を2〜3回実施し安定して合格', '英単語カードを総ざらい', '受験申込み(Claude Partner Network 経由)の準備'],
  },
]);
