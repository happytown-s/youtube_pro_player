# YouTube Pro Player

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

### プロフェッショナル仕様の単一デッキ・ビデオプレイヤー

YouTube IFrame APIを極限まで活用し、高速なビデオサンプリングとキュートリガーを実現したプロフェッショナルなワークスペースです。

![YouTube Pro Player Logo](./public/logo.png)

## 主な機能

- **単一デッキ・プロフェッショナルワークフロー**: 左右分割レイアウトにより、左側に大きなビデオ、右側にすべての操作系を配置。
- **300 Hot Cues**: 10個のスロット × 30個のキー（Q-P, A-;, Z-/）で、合計300個のキューポイントを瞬時にトリガー。
- **ゲートモード (Gate Mode)**: キーを押している間だけ再生、離すと停止。サンプラーのような直感的な操作が可能。
- **キーボードフォーカス最適化**: UIをクリックしてもキーボード操作が途切れない高度なフォーカス管理。
- **テンポ＆ピッチコントロール**: 再生速度を0.25x〜2.0xまで調整可能。
- **垂直ボリュームフェーダー**: 精密なGainコントロール。

## 操作方法

| カテゴリ | キー / 操作 |
| --- | --- |
| **スロット切り替え** | 数字キー `1` 〜 `0` |
| **ホットキュー** | Q-P（上段）, A-;（中段）, Z-/（下段） |
| **再生/停止** | スペースキー（または画面のSTART/STOP） |
| **動画ロード** | 画面左上のVideo Sourceに入力してLOAD |

## セットアップと実行

このプロジェクトは Vite + React + TypeScript で構成されています。

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

## ライセンス

このプロジェクトは [MIT ライセンス](./LICENSE) のもとで公開されています。
