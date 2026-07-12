# SideNote 笔记库 UI 设计规格

## 目标与范围

在现有 WXT + Vue 3 + TypeScript 浏览器扩展中，用 SideNote 笔记库界面完整替换当前侧边栏编辑器。实现 Library / Default 与 Library / Search 两种展示状态，并在 320px 至 520px 的 Chrome Side Panel 宽度内保持稳定布局。

本阶段仅实现界面结构、样式、组件拆分、静态 Mock 数据和必要的本地展示交互。不实现 Markdown 编辑器、Tiptap 接入、Pinia、chrome.storage、IndexedDB、网络请求、数据持久化或笔记增删改业务。

现有 Tiptap、Pinia 和 storage 相关依赖暂时保留在 `package.json`，但新的侧边栏代码不得导入或调用它们。

## 项目结构

保持项目当前采用的 WXT 根目录约定，不引入 `srcDir` 配置迁移：

```text
entrypoints/sidepanel/
  index.html
  main.ts
  App.vue
  style.css
components/
  common/IconButton.vue
  library/AppHeader.vue
  library/SearchBar.vue
  library/FolderTree.vue
  library/FolderItem.vue
  library/NoteList.vue
  library/NoteListItem.vue
  library/SearchResultHeader.vue
  library/NewNoteButton.vue
mock/noteLibraryMock.ts
types/library.ts
styles/tokens.css
styles/base.css
styles/library.css
```

`style.css` 只负责导入三个全局样式文件。`App.vue` 只组合页面、选择当前数据集，并维护搜索词、当前文件夹和当前笔记的本地展示状态。

## 组件职责

- `IconButton`：统一图标按钮尺寸、语义属性与事件透传。
- `AppHeader`：显示应用标识、SideNote 标题、搜索与更多按钮。
- `SearchBar`：展示搜索图标、输入框和条件出现的清除按钮；通过 `v-model` 向上同步搜索词。
- `FolderItem`：渲染单个文件夹、展开图标、数量及选中语义。
- `FolderTree`：渲染 FOLDERS 标题和文件夹列表，向上报告选择变化。
- `NoteListItem`：渲染标题、摘要、文件夹、更新时间及选中状态。
- `NoteList`：渲染当前笔记集合，处理空集合展示并向上报告选择变化。
- `SearchResultHeader`：仅在搜索状态显示 `3 results` 和 `in all folders`。
- `NewNoteButton`：右下角悬浮按钮，仅提供按压反馈和无业务副作用的点击事件。

## 数据与状态

`types/library.ts` 定义 `Folder`、`NoteListItem` 和 `LibraryViewState`，不使用 `any`。`noteLibraryMock.ts` 独立导出四个文件夹、四条默认笔记和三条搜索结果。

初始状态选择 Projects 文件夹和第一条默认笔记。搜索词为空时显示默认笔记；搜索词非空时显示固定搜索结果，并默认选择其中第二条。输入内容不执行真实过滤。清除搜索后恢复默认数据集和默认选中笔记。

点击文件夹或笔记只更新组件内存中的选中样式。点击新建按钮不创建数据、不导航，可通过短暂的 CSS active 状态提供反馈。

## 布局与视觉

页面使用 `height: 100dvh`、`min-width: 320px`、`width: 100%` 和 `overflow: hidden`。主体为单列 Flex 布局，顶部栏、搜索区域、文件夹区域和悬浮按钮不参与笔记列表滚动；笔记列表使用 `flex: 1`、`min-height: 0` 和纵向滚动。

视觉严格使用设计文档指定 Token：页面背景 `#F7F8FA`、表面 `#FFFFFF`、边框 `#E4E4E7`、主文本 `#18181B`、辅助文本 `#71717A`、强调色 `#635BFF`。所有颜色、圆角和 FAB 阴影首先声明为 CSS Variables，组件样式引用变量，不重复硬编码。

顶部栏高 52px，搜索框高 36px，文件夹行高 34px，笔记卡片最小高度 92px、圆角 10px。普通卡片无明显阴影；当前文件夹使用浅紫背景，当前笔记使用浅紫背景和紫色边框。图标统一使用 `@lucide/vue`。

## 响应式与无障碍

320px、400px 和 520px 宽度下保持同一单列结构。窄屏左右间距允许从 16px 收紧至 12px，标题、摘要和路径使用省略，不隐藏数量或更新时间，不产生横向滚动。

所有图标操作使用原生 `button`，提供 `aria-label`、`title` 和 `focus-visible` 样式。搜索框具有明确标签，清除按钮使用 `aria-label="Clear search"`。文件夹和笔记使用按钮语义，并通过 `aria-current` 或 `aria-selected` 表达选中状态。

## 验证标准

运行 `npm run compile` 和 `npm run build`。在浏览器或等效渲染环境中检查 320×900、400×900、520×900：

- 无横向滚动或文本挤出。
- 只有笔记列表区域纵向滚动。
- 固定尺寸与设计文档一致。
- 默认与搜索状态可由输入和清除操作切换。
- hover、active、focus-visible 和 selected 状态清晰可辨。
- 页面代码不再引用 Tiptap、Pinia、storage 或编辑器组件。

## 非目标

不删除现有依赖，不实现编辑器页、真实搜索、数据存储、自动保存、笔记创建/删除/重命名/移动、文件导入导出、后台业务、Content Script、登录同步、深色模式或额外导航。
