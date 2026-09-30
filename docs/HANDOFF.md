# 引き継ぎ：「ドパドリル（とけい追加版）」をウェブで公開する

このドキュメントは、Claude Code に公開作業を引き継ぐためのものです。最初に全体を読み、「4. 先に確認すること」をユーザーに聞いてから作業を始めてください。

## 1. 目的

子どもが時計の読み方（特に「9時の20分前」のような「◯分前・◯分後」）を練習できるブラウザアプリを、スマホ・タブレットから URL で開けるように公開する。

## 2. 現在の状態

- 元になったもの：[grmchn/dopa-drill](https://github.com/grmchn/dopa-drill)（計算ドリル。コードは MIT License）
- この版で追加したもの：時計のスキル9つ、タイトルの「とけいの れんしゅう」ボタン。内容は `README.md` の冒頭と `docs/curriculum.md` の末尾にある
- ビルド不要。`app/` を静的に配信するだけで動く（依存ライブラリなしの ES Modules）
- Git リポジトリはまだ作っていない（zip から始まっている）
- 動作確認済み：単体テスト66件が通る。Chromium のスマホ幅（390×780、360×640、412×915）で、時計スキル9つを6問ずつ解ききれる。誤答とヒントの表示も確認した
- 未確認：iPad・iPhone の実機、音（Web Audio）、ホーム画面に追加したときの動き

## 3. 動かし方とテスト

```bash
python3 -m http.server 8000 -d app      # http://localhost:8000/
node --test tests/*.test.mjs            # Node.js 20 以上。66件
```

確認用 URL：`/?skill=g3-clock-shift&count=6&seed=1`（特定のスキルだけを6問出す）。`file://` では動かない（ES Modules のため）。

## 4. 先に確認すること（ユーザーに聞く）

1. **公開先**：元の作者は Cloudflare Workers Static Assets を使っている（`app/_headers` はその設定）。同じ Cloudflare か、GitHub Pages、Netlify など、ユーザーが使い慣れたものを選ぶ。指定がなければ Cloudflare Pages か Workers を第一候補にする
2. **公開範囲**：誰でも見られる状態にするか、家族だけにするか。家族だけにする場合は、公開先のアクセス制限（Cloudflare Access など）か、推測されにくい URL と `noindex` を使う
3. **GitHub リポジトリ**：新しく作って push してよいか。リポジトリ名と公開・非公開の別
4. **ドメイン**：独自ドメインを使うか。使わなければ公開先が発行する URL のままにする

## 5. 公開作業の手順

1. `git init` し、この内容を最初のコミットにする。`LICENSE`（元の作者の著作権表示と例外条項）は消さない
2. 公開先を作り、配信するディレクトリを `app/` にする。ビルドコマンドは不要
3. `app/_headers` の設定（`Cache-Control: ... no-transform`、`X-Content-Type-Options: nosniff`）が効く公開先を選ぶ。効かない場合は、同じ内容を公開先の方法で設定する。`no-transform` は、配信側が解析スクリプトなどを勝手に挿入しないようにするためのもの
4. 公開範囲を「限定」にする場合は、`app/index.html` の `<head>` に `<meta name="robots" content="noindex">` を足す
5. 公開後に次の「6. 公開後の確認」を実施する
6. 公開 URL と、更新の手順（変更を push すれば反映されるか、手動デプロイか）をユーザーに伝える

## 6. 公開後の確認

- `/` が開き、日本語のフォントが表示される（`/fonts/*.woff2` が 200 で返る）
- `/js/main.js` などが JavaScript として返る（MIME タイプが `text/javascript` 系。HTML で返っていると動かない）
- タイトルの「とけいの れんしゅう」を押すと、時計の絵と「何時？」の入力欄が出る
- `/?skill=g3-clock-shift&count=6` で、「◯時の◯分前は」が出て、数字キーで最後まで答えられる
- スマホ幅で、数字キーの一番下の段（0 と削除）が画面内に収まる
- iPhone・iPad の Safari で、最初のタップのあとに音が鳴る（ブラウザの制約で、音はユーザー操作の後に始まる）
- 記録は端末ごとの localStorage に保存され、別の端末とは共有されない。これは仕様であり、不具合ではない

## 7. 守ること（ライセンスとプライバシー）

- **コード**は MIT License。著作権表示（`LICENSE`）を残す
- **キャラクター「ドパキチ」と「ドパドリル」の名称・ロゴ**は MIT の対象外。営利目的では使えない。公開するときは、非公式の派生版であることが分かるようにする（`README.md` の冒頭に書いてある。公開ページにも一言入れるとよい）
- 広告、有料機能、アクセス解析、外部への送信を足さない。元のアプリは学習記録を端末の外に送らない作りで、それを保つ
- 公開ページのフォントは SIL Open Font License。`app/fonts/OFL-*.txt` を残す
- 個人名、子どもの情報、メールアドレスなどをリポジトリやページに書かない

## 8. 変更するときの注意

- 画面の文字を増やしたら、フォントを作り直す。`tools/build_fonts.sh`（`uv` が必要）か、同じ内容の `pyftsubset` を使う。新しい漢字が抜けると、その文字だけ別のフォントで表示される
- スキルを足したら、`app/js/skills.js` に定義を書き、`tests/app_clock.test.mjs` のようなテストを足す。`node --test tests/*.test.mjs` を必ず通す
- `g1-clock-hour` と `g1-clock-half` は12通りしか問題がなく、10問以内に同じ問題が出ることがある。増やしたい場合は、生成器 `clockRead`（`app/js/problems.js`）を変える

## 9. 主なファイル

| パス | 内容 |
| --- | --- |
| `app/index.html`, `app/style.css` | 画面とスタイル（時計の見た目は `.clk-*`、`.cell.dial`） |
| `app/js/problems.js` | 問題の生成。`clockSvg`（時計の絵）、`clockRead`、`clockNext`、`clockShift`、`clockElapsed` |
| `app/js/skills.js` | スキル定義。時計は末尾近くの9つ（ID に `-clock-` を含む） |
| `app/js/main.js` | 画面の進行。時計セルの描画と、タイトルの「とけいの れんしゅう」ボタン |
| `app/_headers` | 配信時のヘッダ設定 |
| `tests/app_clock.test.mjs` | 時計の問題が正しいかを調べるテスト |
| `docs/SPEC.md`, `docs/curriculum.md` | 仕様書とスキル一覧（元のもの。時計は curriculum.md の末尾に追記） |

## 10. 完了の目安

- 公開 URL がスマホで開き、「6. 公開後の確認」がすべて通る
- GitHub にコミットされ、`node --test tests/*.test.mjs` が通る
- ユーザーに、URL・公開範囲・更新の手順・ライセンス上の注意を伝えた
