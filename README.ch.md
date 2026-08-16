# Nota — Chrome 侧边栏笔记插件

<p align="center">
  <a href="./README.md">English</a> | <b>简体中文</b>
</p>

一个基于 **Vue 3 + Tiptap** 的 Chrome 侧边栏（Side Panel）笔记应用：点击扩展图标即可在浏览器侧边栏中快速记笔记、整理文件夹、全文搜索，数据全部存储在本地（`chrome.storage.local`），无需服务器、离线可用。

## ✨ 功能特性

- **笔记库**：文件夹管理、笔记列表（按文件夹筛选）、全库搜索（标题/摘要 + 正文扫描）
- **富文本编辑器**：基于 Tiptap，支持标题（H1–H3）、加粗/斜体、有序/无序/任务列表、引用、行内代码/代码块、链接、分割线、撤销/重做；底层为 Markdown 兼容文档
- **自动保存**：800ms 防抖合并写入，返回列表 / 侧边栏隐藏前强制落盘，关闭面板不丢字
- **笔记管理**：在当前文件夹新建、删除（二次确认）、**导出为独立 `.md` 文件**（弹出另存为对话框）
- **文件夹管理**：新建；删除时可选**级联策略**——把笔记移入指定现有文件夹，或连同笔记一起删除（空文件夹直接删除，不弹确认）
- **明暗主题**：一键切换亮/暗模式，编辑器同步变色，选择持久化到本地
- **数据本地化**：全部笔记存于 `chrome.storage.local`（申请 `unlimitedStorage` 解除配额），无账号、无云同步、隐私友好

## 🧱 技术栈

| 层 | 选型 |
| --- | --- |
| 扩展框架 | [WXT](https://wxt.dev) 0.20（Chrome MV3）+ Vite |
| UI | Vue 3.5（`<script setup lang="ts">`，TS strict）+ [@lucide/vue](https://lucide.dev) 图标 |
| 编辑器 | [Tiptap](https://tiptap.dev) 3.27（starter-kit / link / task-list / character-count / markdown） |
| 存储 | `chrome.storage.local`（无本地数据库） |
| 状态管理 | 目前收敛在 `App.vue` 单一容器（Pinia 已安装，预留） |

## 🚀 快速开始

要求：Node.js 18+，Chrome 浏览器（推荐 114+）。

```bash
# 1. 安装依赖（postinstall 会自动执行 wxt prepare）
npm install

# 2. 开发模式：自动打开 Chrome 并加载扩展，代码热更新
npm run dev

# 3. 生产构建：产物输出到 .output/chrome-mv3
npm run build
```

**手动加载构建产物**：

1. 打开 `chrome://extensions`，开启右上角「开发者模式」
2. 点击「加载已解压的扩展程序」，选择 `项目目录/.output/chrome-mv3`
3. 点击工具栏中的扩展图标，侧边栏即打开 Nota

**打包发布**：

```bash
npm run zip        # 生成可上架 Chrome 商店的 zip（.output/*.zip）
```

## 🎯 使用说明

| 入口 | 功能 |
| --- | --- |
| 扩展图标 | 打开/关闭侧边栏 |
| 搜索框 | 全库搜索（含正文），空则显示当前文件夹笔记 |
| 文件夹列表 | 点击筛选该文件夹笔记；行尾 ⋮ → 删除文件夹 |
| 右下角 ＋ | 上拉菜单：新建笔记（当前文件夹）/ 新建文件夹 |
| 笔记卡片 ⋮ | Delete（二次确认）/ Export markdown（导出 .md 文件） |
| 编辑器顶部 | 返回列表、固定工具栏（标题/加粗/列表/引用/链接/更多） |
| 选中文本 | 浮动气泡工具栏（加粗/斜体/链接/行内代码/引用） |
| 右上角 ☀/🌙 | 一键切换明暗主题 |

## 💾 数据与权限

所有数据存放在 `chrome.storage.local`，Key 布局：

```
meta           —— schema 版本 + 设置（默认文件夹 / 主题）
folders        —— 文件夹表
notes:index    —— 笔记轻量索引（列表/搜索用，不含正文）
note:{id}      —— 单条笔记全文（Tiptap HTML）
```

扩展权限（`wxt.config.ts` / manifest）：

| 权限 | 用途 |
| --- | --- |
| `storage` | 笔记数据持久化 |
| `unlimitedStorage` | 解除 `storage.local` 10MB 默认配额 |
| `downloads` | 导出笔记为 `.md` 文件（另存为对话框） |
| `sidePanel` | 侧边栏界面 |

> 卸载扩展会清除全部数据；`chrome.storage` 为明文存储，请勿存放密码/密钥等敏感信息。

## 🛠 开发命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 开发模式（Chrome），自动加载扩展 |
| `npm run dev:firefox` | 开发模式（Firefox） |
| `npm run build` | 生产构建（`.output/chrome-mv3`） |
| `npm run build:firefox` | 生产构建（Firefox） |
| `npm run compile` | `vue-tsc --noEmit` 类型检查 |
| `npm run zip` | 打包 zip |
| `npm run zip:firefox` | 打包 zip（Firefox） |



