# SideNote 前端接口文档

> 基于 WXT + Vue 3 + TypeScript + Tiptap 的 Chrome 侧边栏笔记插件（开发中）。
> 当前阶段为 UI 原型，数据层使用 mock 实现；本文档同时给出未来真实数据层（Dexie / 后台存储）的接口约定草案。

- 技术栈：WXT 0.20 / Vue 3.5（`<script setup lang="ts">`）/ Tiptap 3.27 / Pinia（已安装，尚未使用）
- 入口：`entrypoints/sidepanel`（侧边栏 UI）、`entrypoints/background.ts`、`entrypoints/content.ts`（占位）
- 页面流：`library`（笔记库）↔ `editor`（编辑器），由 `App.vue` 统一管理

---

## 1. 全局类型定义（`types/`）

### 1.1 `types/library.ts` — 笔记库领域模型

```ts
/** 文件夹节点 */
export interface Folder {
  id: string;        // 唯一标识，如 'inbox' | 'projects' | 'learning' | 'archive'
  name: string;      // 显示名称，如 'Projects'
  count: number;     // 该文件夹下笔记数量
  expanded: boolean; // 是否展开（树形结构预留）
  selected: boolean; // 是否选中（当前文件夹高亮）
}

/** 笔记列表项（列表视图的最小展示单元） */
export interface NoteListItem {
  id: string;            // 笔记唯一标识
  title: string;         // 标题
  excerpt: string;       // 摘要（正文截断）
  folderName: string;    // 所属文件夹名称（展示用）
  updatedLabel: string;  // 相对更新时间文案，如 '2 min ago' | 'Yesterday'
  selected: boolean;     // 是否选中（列表高亮）
}

/** 笔记库视图状态 */
export type LibraryViewState = 'default' | 'search';
```

### 1.2 `types/editor.ts` — 编辑器领域模型

```ts
/** 编辑器笔记内容（mock 阶段；未来由真实 Note 模型替代） */
export interface EditorNoteMock {
  title: string;    // 笔记标题
  path: string;     // 面包屑路径文案，如 'Projects / Product design'
  content: string;  // Tiptap HTML 内容（含 taskList / blockquote / link 等）
}

/** 侧边栏页面路由状态 */
export type SidePanelPage = 'library' | 'editor';
```

---

## 2. 数据层接口（`mock/`，当前实现）

> 目前组件直接 import mock 模块。后续接入真实存储（见 §7）时，应将这些导出替换为同一签名的异步 API，组件层无需改动。

### 2.1 `mock/noteLibraryMock.ts` — 笔记库数据

| 导出 | 类型 | 说明 |
| --- | --- | --- |
| `DEFAULT_FOLDER_ID` | `string` | 默认选中文件夹 id（`'projects'`） |
| `DEFAULT_NOTE_ID` | `string` | 默认视图选中笔记 id（`'sidebar-notes'`） |
| `DEFAULT_SEARCH_NOTE_ID` | `string` | 搜索视图默认选中笔记 id（`'search-sidebar-notes'`） |
| `folders` | `Folder[]` | 全部文件夹（含选中/展开状态） |
| `defaultNotes` | `NoteListItem[]` | 默认视图笔记列表 |
| `searchResultNotes` | `NoteListItem[]` | 搜索视图笔记列表 |

### 2.2 `mock/editorMock.ts` — 编辑器内容

| 导出 | 类型 | 说明 |
| --- | --- | --- |
| `editorMock` | `EditorNoteMock` | 编辑器初始标题、路径与 HTML 正文 |

---

## 3. Composable API

### 3.1 `useTiptapEditor(initialContent: string)`（`composables/useTiptapEditor.ts`）

初始化一个 Tiptap 编辑器实例，并维护实时字数统计。

```ts
const { editor, wordCount } = useTiptapEditor('<p>Hello</p>');
```

**返回值**

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `editor` | `Editor \| undefined` | Tiptap 编辑器实例（异步创建，挂载完成前为 `undefined`；使用处需 `v-if="editor"` 守卫） |
| `wordCount` | `Ref<number>` | 当前正文单词数（随 `onCreate` / `onUpdate` 更新） |

**已配置的扩展**

| 扩展 | 配置 |
| --- | --- |
| `StarterKit` | 默认（bold / italic / heading / lists / blockquote / code 等） |
| `@tiptap/extension-link` | `{ openOnClick: false, autolink: true }`；点击链接文本不跳转（`handleClickOn` 拦截） |
| `@tiptap/extension-task-list` | 默认 |
| `@tiptap/extension-task-item` | `{ nested: true }`（支持嵌套任务） |
| `@tiptap/extension-character-count` | 默认，用于 `storage.characterCount.words()` |

**编辑器 DOM 属性**：根节点 class `sidenote-prose`、`aria-label="Note content"`、`spellcheck="true"`。

---

## 4. 公共组件接口

### 4.1 `IconButton`（`components/common/IconButton.vue`）

图标按钮（无点击事件，由父组件通过原生事件或透传处理）。

**Props**

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `label` | `string` | —（必填） | `aria-label`，无 `title` 时同时用作 `title` |
| `title` | `string \| undefined` | `undefined` | 自定义悬浮提示，缺省回退为 `label` |
| `size` | `'small' \| 'medium'` | `'medium'` | 尺寸，映射 class `icon-button--small/--medium` |

**Slots**：默认插槽（图标内容）。

**示例**

```vue
<IconButton label="Search notes" @click="onSearch"><Search :size="16" /></IconButton>
```

---

## 5. 笔记库组件接口（`components/library/`）

### 5.1 `AppHeader` — 顶部标题栏

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `search` | — | 点击搜索按钮，父组件据此触发搜索框聚焦 |

无 Props。内含品牌标识、标题 "SideNote"、搜索与更多按钮。

### 5.2 `SearchBar` — 搜索框（受控组件）

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `modelValue` | `string` | 当前搜索词（`v-model`） |
| `focusRequest` | `number` | 聚焦请求计数；值变化后 `nextTick` 聚焦输入框 |

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `update:modelValue` | `value: string` | 输入变化 |
| `clear` | — | 点击清空按钮（同时会 emit 空字符串的 `update:modelValue`） |

**示例**

```vue
<SearchBar v-model="searchQuery" :focus-request="focusRequest" @clear="clearSearch" />
```

### 5.3 `FolderTree` — 文件夹树容器

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `folders` | `Folder[]` | 文件夹列表（选中状态由父组件计算注入） |

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `select` | `id: string` | 点击某个文件夹，透传 `FolderItem` 的 `select` |

### 5.4 `FolderItem` — 单行文件夹

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `folder` | `Folder` | 文件夹节点；`selected` 控制高亮，`expanded` 控制箭头方向 |

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `select` | `id: string` | 点击整行触发（`folder.id`） |

### 5.5 `NoteList` — 笔记列表容器

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `notes` | `NoteListItem[]` | 笔记列表（选中状态由父组件计算注入） |

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `select` | `id: string` | 透传 `NoteListItem` 的 `select` |

### 5.6 `NoteListItem` — 单张笔记卡片

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `note` | `NoteListItem` | 笔记数据；`selected` 控制 `aria-pressed` |

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `select` | `id: string` | 点击卡片 / Enter / Space 触发 |

> 卡片右上角“更多”按钮 `@click.stop`，当前不 emit。

### 5.7 `SearchResultHeader` — 搜索结果统计

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `count` | `number` | 结果数量，渲染为 `{{ count }} results` |

无 Emits。

### 5.8 `NewNoteButton` — 新建笔记悬浮按钮

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `create` | — | 点击 FAB 按钮（当前 App.vue 未绑定处理） |

无 Props。

---

## 6. 编辑器组件接口（`components/editor/`）

### 6.1 `NoteEditor` — 编辑器页面（容器）

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `back` | — | 点击返回，父组件切回 `library` 页 |

无 Props。内部组合：

- 标题 `v-model` 到 `EditorTitleBlock`
- `useTiptapEditor(editorMock.content)` 初始化正文
- 组合 `EditorHeader` / `EditorTitleBlock` / `FixedToolbar` / `EditorContent` / `SelectionToolbar` / `LinkPopover` / `EditorStatusBar`

### 6.2 `EditorHeader` — 编辑器顶栏

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `path` | `string` | 面包屑路径文案 |

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `back` | — | 点击返回按钮 |

### 6.3 `EditorTitleBlock` — 标题输入区

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `modelValue` | `string` | 标题（`v-model`） |

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `update:modelValue` | `value: string` | 输入变化 |

### 6.4 `FixedToolbar` — 固定格式工具栏

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `editor` | `Editor` | Tiptap 实例 |

无 Emits。内置命令：

- 加粗 `toggleBold`、斜体 `toggleItalic`、无序列表 `toggleBulletList`、引用 `toggleBlockquote`
- 标题弹出菜单（`HeadingMenu`）：`setParagraph` / `toggleHeading({ level })`，level ∈ {1,2,3}
- 链接弹出菜单（`LinkPopover`，`placement="toolbar"`）
- 更多菜单（`MoreFormatMenu`）：strike / code / codeBlock / orderedList / taskList / horizontalRule / undo / redo

点击外部或按 `Esc` 关闭弹出菜单。

### 6.5 `SelectionToolbar` — 选区浮动工具栏（BubbleMenu）

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `editor` | `Editor` | Tiptap 实例 |

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `editLink` | — | 点击链接按钮，父组件打开 `LinkPopover`（`placement="selection"`） |

显示条件：编辑器聚焦、选区非空、不在代码块内。定位 `top`、偏移 8。命令：bold / italic / link / code / blockquote。

### 6.6 `LinkPopover` — 链接编辑弹层

**Props**

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `editor` | `Editor` | —（必填） | Tiptap 实例 |
| `placement` | `'toolbar' \| 'selection'` | `'toolbar'` | 样式变体，映射 class `link-popover--toolbar/--selection` |

**Emits**

| 事件 | 参数 | 说明 |
| --- | --- | --- |
| `close` | — | 点击外部 / `Esc` / 应用 / 移除链接后触发 |

行为：

- 打开时以当前选区快照（`from`/`to`）为锚点，预填已有链接 `href`
- **Apply**：`setTextSelection(选区) → extendMarkRange('link') → setLink({ href })`；URL 为空时禁用
- **Remove**：`extendMarkRange('link') → unsetLink()`

### 6.7 `HeadingMenu` — 标题/段落选择菜单

**Props**：`editor: Editor`；**Emits**：`close: []`

选项：Paragraph、Heading 1–3；点击后执行对应命令并 emit `close`。

### 6.8 `MoreFormatMenu` — 更多格式菜单

**Props**：`editor: Editor`；**Emits**：`close: []`

内置条目（label / 命令 / 禁用逻辑）：

| 条目 | 命令 | 禁用条件 |
| --- | --- | --- |
| Strike | `toggleStrike` | — |
| Inline code | `toggleCode` | — |
| Code block | `toggleCodeBlock` | — |
| Ordered list | `toggleOrderedList` | — |
| Task list | `toggleTaskList` | — |
| Horizontal rule | `setHorizontalRule` | — |
| Undo | `undo` | `!editor.can().undo()` |
| Redo | `redo` | `!editor.can().redo()` |

### 6.9 `EditorStatusBar` — 状态栏

**Props**

| 名称 | 类型 | 说明 |
| --- | --- | --- |
| `wordCount` | `number` | 渲染为 `{{ wordCount }} words` |

无 Emits。

### 6.10 `ToolbarButton` — 工具栏按钮（通用）

**Props**

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `label` | `string` | —（必填） | `aria-label` / `title` |
| `active` | `boolean` | `false` | 激活态（高亮 + `aria-pressed`） |
| `disabled` | `boolean` | `false` | 禁用 |
| `tone` | `'light' \| 'dark'` | `'light'` | 配色，映射 class `toolbar-button--light/--dark` |

**Emits**：`activate: []`（点击触发，`mousedown` 已 prevent，避免抢焦点）

**Slots**：默认插槽（图标）。

---

## 7. 页面状态流（`entrypoints/sidepanel/App.vue`）

`App.vue` 是唯一状态容器，各子组件均为受控组件。

| 状态 | 类型 | 说明 |
| --- | --- | --- |
| `searchQuery` | `Ref<string>` | 搜索词，驱动 `LibraryViewState` |
| `selectedFolderId` | `Ref<string>` | 当前选中文件夹（初始 `DEFAULT_FOLDER_ID`） |
| `selectedDefaultNoteId` | `Ref<string>` | 默认视图选中笔记（初始 `DEFAULT_NOTE_ID`） |
| `selectedSearchNoteId` | `Ref<string>` | 搜索视图选中笔记（初始 `DEFAULT_SEARCH_NOTE_ID`；进入搜索态时重置） |
| `focusRequest` | `Ref<number>` | 传给 `SearchBar` 的聚焦请求计数器 |
| `currentPage` | `Ref<SidePanelPage>` | 页面路由：`'library' \| 'editor'` |

**派生数据（computed）**

- `viewState`：`searchQuery` 非空 → `'search'`，否则 `'default'`
- `displayedFolders`：在 `folders` 上覆写 `selected`（`id === selectedFolderId`）
- `displayedNotes`：按视图取 `searchResultNotes` 或 `defaultNotes`，覆写 `selected`

**事件流**

```
AppHeader @search         → focusRequest++（SearchBar 聚焦）
SearchBar @update:modelValue → searchQuery 更新
SearchBar @clear          → selectedDefaultNoteId 复位
FolderTree @select        → selectedFolderId = id
NoteList   @select        → 记录选中笔记 + currentPage = 'editor'
NoteEditor @back          → currentPage = 'library'
```

---

## 8. 扩展入口（`entrypoints/`）

### 8.1 `background.ts`

- 检测 `browser.sidePanel` 支持性
- 设置 `setPanelBehavior({ openPanelOnActionClick: true })`（点击插件图标打开侧边栏）
- 挂载时机：`runtime.onInstalled` / `runtime.onStartup` / 模块加载时

### 8.2 `content.ts`（占位）

- 仅匹配 `*://*.google.com/*`，输出 console 日志；尚无真实逻辑

### 8.3 `sidepanel/`

- `main.ts`：创建 Vue 应用并挂载 `App.vue`
- 无 Pinia 注入；状态全部收敛在 `App.vue`

---

## 9. 后续接入真实数据层的接口约定（草案）

按 `note.md` 路线（Pinia → Dexie），建议将 §2 的 mock 导出替换为以下异步签名，保持组件/页面代码不变：

```ts
// 建议放于 composables/ 或 stores/ 下
async function fetchFolders(): Promise<Folder[]>;
async function fetchNotes(folderId: string, query?: string): Promise<NoteListItem[]>;
async function fetchNote(id: string): Promise<EditorNoteMock>;
async function createNote(title: string): Promise<string>;          // 返回新笔记 id
async function updateNote(id: string, patch: Partial<EditorNoteMock>): Promise<void>;
async function deleteNote(id: string): Promise<void>;
```

> 约定：所有接口返回 Promise；列表项统一使用 `NoteListItem`（含 `selected` 由视图层覆写）；编辑器内容统一使用 Tiptap HTML 字符串，Markdown 转换（`@tiptap/markdown` 已在依赖中）在存储层完成。

> **已落地**：上述草案的完整实现方案（存储 schema、服务层模块、消息协议、自动保存策略）见 [backend-design.md](./backend-design.md)。
