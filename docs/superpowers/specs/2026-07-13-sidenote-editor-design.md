# SideNote 编辑页面设计规格

## 目标与范围

在现有 SideNote 笔记库 UI 基础上增加 Editor / Default 与 Editor / Selection。点击任意笔记卡片进入编辑页，点击返回回到原笔记库；不引入路由、Pinia、Chrome API 或持久化。

编辑器支持本地标题编辑、Tiptap 正文编辑、固定格式工具栏、选区 BubbleMenu、链接浮层、标题菜单、更多格式菜单、实时字数和格式激活状态。每次进入编辑器均重新加载 `editorMock.ts`，离开编辑器即销毁实例并丢弃标题和正文修改。

## 文件结构

保持当前 WXT 根目录约定：

```text
components/editor/
  NoteEditor.vue
  EditorHeader.vue
  EditorTitleBlock.vue
  FixedToolbar.vue
  ToolbarButton.vue
  HeadingMenu.vue
  LinkPopover.vue
  SelectionToolbar.vue
  EditorStatusBar.vue
  MoreFormatMenu.vue
composables/useTiptapEditor.ts
mock/editorMock.ts
types/editor.ts
styles/editor.css
```

修改 `entrypoints/sidepanel/App.vue`、`entrypoints/sidepanel/style.css`、`components/library/NoteList.vue`、必要时修改 `NoteListItem.vue`，并只向 `styles/tokens.css` 补充缺失的浮动背景与阴影变量。

## 页面切换与数据流

`App.vue` 维护 `library | editor` 本地视图状态。`NoteList` 的笔记选择事件继续更新选中状态，同时通知 `App.vue` 进入编辑器。`NoteEditor` 仅在 editor 状态挂载，并从 `editorMock.ts` 读取固定的标题、路径和 HTML/JSON 正文；返回时卸载组件，因此再次进入会重置。

编辑器不读取所点击笔记的真实内容，不将修改回写笔记列表，不访问 storage。标题由 `NoteEditor` 的本地 `ref` 管理，正文状态由 Tiptap 实例管理。

## 编辑器架构

`NoteEditor` 使用五段式 CSS Grid：48px 顶部导航、86px 标题、40px 固定工具栏、`minmax(0, 1fr)` 正文、32px状态栏。页面高 `100dvh`、最小宽 320px、无整体滚动；只有正文容器允许纵向滚动。

- `EditorHeader`：返回、`Projects / Product design` 路径、更多按钮。
- `EditorTitleBlock`：无明显输入框外观的标题编辑与静态 `Editing` 提示。
- `FixedToolbar`：组合基础格式按钮并管理标题、链接、更多菜单的开关。
- `ToolbarButton`：统一 30×30px 按钮、`aria-pressed`、disabled、mousedown 选区保护和焦点样式。
- `HeadingMenu`：Paragraph、Heading 1、Heading 2、Heading 3。
- `LinkPopover`：显示当前 URL、确认设置和移除链接。
- `MoreFormatMenu`：Strike、Inline Code、Code Block、Ordered List、Horizontal Rule、Undo、Redo。
- `SelectionToolbar`：官方 Vue BubbleMenu，提供 Bold、Italic、Link、Inline Code、Blockquote。
- `EditorStatusBar`：实时 `${count} words` 与静态 `Editing`。
- `useTiptapEditor`：集中创建和销毁编辑器，不处理保存。

## Tiptap 扩展与命令

使用已安装的 `@tiptap/vue-3`、`@tiptap/pm`、StarterKit、Link、TaskList、TaskItem 和 CharacterCount。StarterKit 提供段落、H1–H3、Bold、Italic、Strike、Inline Code、Code Block、Bullet List、Ordered List、Blockquote、Horizontal Rule、Undo、Redo；任务列表扩展提供可交互 checkbox；Link 禁止点击后自动打开新页面；CharacterCount 用于实时字数。

所有格式操作调用 `editor.chain().focus()` 后执行对应命令。工具栏通过 `editor.isActive()` 显示激活态；Undo/Redo 使用 `editor.can().chain().focus().undo()/redo().run()` 控制 disabled。按钮 `mousedown` 阻止默认焦点迁移，菜单操作结束后恢复编辑器焦点。

## 菜单与焦点管理

Heading、Link 和 More 浮层使用紧凑绝对定位面板，限制在侧栏边界内。一次只打开一个固定工具栏浮层；Esc 和点击外部关闭。打开链接浮层前保存当前 Tiptap 选区，确认或移除链接后恢复该选区并执行命令。

SelectionToolbar 仅在编辑器聚焦、文本选区非空且不在代码块时显示。按钮操作不得让原选区失效；取消选区后 BubbleMenu 自动隐藏。

## 初始内容

Mock 标题为 `Chrome sidebar Markdown notes`，路径为 `Projects / Product design`。正文包含 Design principles 标题、指定介绍段落、三个任务项、引用、Keyboard and Markdown shortcuts 二级标题、第二段和 Read formatting guide 示例链接。大段初始内容仅存在 `editorMock.ts`。

## 视觉与响应式

复用现有字体、颜色、圆角和主色 Token，补充 `--color-bg-floating: #27272A` 与 `--shadow-floating: 0 6px 18px rgba(24, 24, 27, 0.16)`。正文、列表、任务列表、引用、代码、链接、分割线和选区严格按需求文档排版。

正文左右内边距：400px 及以上 32px，360–399px 为 24px，320–359px 为 20px。小于 360px 时固定工具栏可隐藏 Link，但该操作仍可从适当菜单或 SelectionToolbar 访问；工具栏不得换行，返回与 More 按钮不得缩小，所有菜单不得溢出屏幕。

## 无障碍

所有操作使用原生按钮并提供 `aria-label`、`title`、`focus-visible`。格式按钮使用 `aria-pressed`。标题输入使用 `aria-label="Note title"`；正文提供 `aria-label="Note content"`。菜单支持 Escape、点击外部关闭和合理焦点恢复。

## 验证

运行 `npm run compile` 与 `npm run build`，然后在侧边栏实际检查：

- 点击任意笔记进入编辑器，返回后笔记库状态正常，再进入时内容重置。
- 标题与正文可输入，字数实时变化。
- 所有固定工具栏、More 菜单及 BubbleMenu 命令生效且激活态正确。
- 链接可设置和移除；Undo/Redo disabled 状态正确；任务 checkbox 可交互。
- 只有正文滚动，320px 无横向滚动，400×900 五段高度正确，520px 保持单列。

## 非目标

不实现保存按钮、保存状态机、chrome.storage、自动保存、IndexedDB、Dexie、Pinia、后端、网络请求、Markdown 序列化或导入导出、刷新恢复、历史版本、图片、表格、公式、颜色、字号、对齐、上传、协同编辑或真实笔记增删改。
