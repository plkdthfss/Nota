# SideNote 后端（数据服务层）设计方案

> 配套文档：[frontend-api.md](./frontend-api.md)（前端接口）。本文回答"后端需要什么功能"：在 MV3 扩展内，后端 = **数据服务层（services/）+ chrome.storage.local 持久化**，无需任何服务器。
> 前端组件接口（Props/Emits）保持不变，只替换数据来源。

---

## 0. TL;DR

- **架构**：服务层模块被 sidepanel **直接引用**（同进程 Promise 调用），`background` 只做浏览器级集成；未来 content script 需要读写数据时，再启用 `runtime` 消息路由（本文 §4 给出完整备用协议）。
- **存储**：chrome.storage.local，申请 `unlimitedStorage` 权限；布局为 `meta` + `folders` + `notes:index`（轻量索引）+ `note:{id}`（单条正文），索引与正文分离，单条笔记独立 key 原子写。
- **必须处理的两个硬限制**：默认 10 MB 配额（unlimitedStorage 可解）与 **每分钟 set() 次数上限（Chrome 约 120 次/分钟）** → 自动保存必须防抖 + 合并写入。
- **功能清单**：笔记 CRUD、文件夹管理（含删除级联）、搜索、自动保存、HTML↔Markdown 转换、schema 迁移。全部 Promise 化，无全局可变状态。

---

## 1. 架构总览

```
┌────────────────────────────── Chrome 扩展（MV3） ─────────────────────────────┐
│                                                                              │
│  ┌─────────────┐   直接调用（推荐）   ┌──────────────────────────┐           │
│  │  sidepanel  │ ─────────────────▶ │  服务层 services/*        │           │
│  │  (Vue UI)   │ ◀───────────────── │  noteService             │           │
│  └─────────────┘       Promise      │  folderService           │           │
│        │                            │  searchService           │           │
│        │  runtime 消息（备用：        │  markdownService         │           │
│        │  其他上下文需要读写时）       └───────────┬──────────────┘           │
│        ▼                                        ▼ chrome.storage.local     │
│  ┌─────────────┐                        ┌──────────────────┐               │
│  │  background │ ── 消息路由（备用）──▶ │  存储层 storage.ts│               │
│  └─────────────┘                        └──────────────────┘               │
│        │  setPanelBehavior / onInstalled / onStartup                       │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.1 为什么服务层可以被 sidepanel 直接引用

- `chrome.storage.local` 是**扩展级共享存储**，sidepanel、background、content script 任何上下文都能直接读写，不存在"只有 background 能碰数据"的限制。
- sidepanel 是常驻页面（有自己的 DOM/窗口），调用链短、无序列化开销、TypeScript 类型直接流通，开发体验最好。

### 1.2 background 的定位（回应 note.md 的疑问）

你 note.md 里写"background script 类似后端，但空闲时会终止，全局变量可能丢失"——结论是：

- **有状态的数据一律放 chrome.storage.local，绝不放 background 全局变量**；
- background 只承担浏览器级集成：`setPanelBehavior`（已实现）、`onInstalled`/`onStartup`、未来 context menu / 快捷键 / 剪藏消息路由；
- 服务层作为**纯函数模块**（无内部可变状态），放哪层跑都安全。

### 1.3 方案对比

| 方案 | 调用方式 | 优点 | 缺点 | 适用 |
|---|---|---|---|---|
| **A（推荐）** 服务层直接引用 | sidepanel `import services/*` | 简单、类型安全、无往返开销 | content script 无法直接复用 | 当前：只有 sidepanel 一个 UI |
| B 消息路由 | `browser.runtime.sendMessage` 走 background | 所有上下文统一入口、职责隔离 | 要定义协议/序列化/类型守卫 | 未来 content script 剪藏、跨上下文同步 |

> 建议按 A 实现，但服务层函数签名与消息类型共用同一套（§3 与 §4 一一对应），日后切 B 只加一层路由，业务代码不动。

---

## 2. 存储设计（chrome.storage.local）

### 2.1 配额与硬限制（事实依据）

| 限制 | 数值 | 对策 |
|---|---|---|
| 默认配额 | **10 MB**（Chrome 114 起由 5 MB 提升） | 申请 `unlimitedStorage` 权限后无配额上限（受磁盘限制），**建议申请** |
| 写入频率 | storage API 有 **每分钟 set() 次数上限**（Chrome 约 120 次/分钟） | 自动保存防抖 + `setItems` 合并写入（§5.4） |
| 单条大小 | local 无单条上限（sync 才是 8KB/条） | 整篇 Tiptap HTML 直接存，无需分块 |
| 生命周期 | 扩展卸载时清空；不受"清除浏览数据"影响 | 无 |
| 安全性 | 明文存储，无加密 | 不存密码/token/敏感内容 |

wxt.config.ts 权限修改：

```ts
export default defineConfig({
  manifest: {
    permissions: ['storage', 'unlimitedStorage'],
  },
});
```

### 2.2 Key 布局

```
chrome.storage.local
├── meta                   # { schemaVersion: 1, settings: {...} }
├── folders                # FolderRecord[]（文件夹表，数量少，整体读写）
├── notes:index            # NoteIndexEntry[]（轻量索引，不含正文）
├── note:{id}              # NoteRecord（单条笔记全文）★ 每笔记一个 key
```

设计理由：

1. **索引与正文分离**：笔记库加载 / 搜索只读 `notes:index`（几十字节/条），不用每次把全部正文读进内存，10MB 配额下正文是主要占用。
2. **单条笔记独立 key**：改一条笔记只写一个 key（外加索引一条），不整库重写，规避写入频率限制、降低写放大。
3. **folders 单 key**：文件夹数量少（几十个内），整体读写最简单，count 由索引现算。
4. **meta 管版本**：`schemaVersion` 驱动迁移（§5.6）。

### 2.3 数据模型（建议新增 `types/storage.ts`）

```ts
/** 元信息 + 设置（唯一） */
export interface MetaRecord {
  schemaVersion: 1;
  settings: { defaultFolderId: string };
}

/** 持久化文件夹（对应前端 Folder，去掉 count/expanded/selected 视图字段） */
export interface FolderRecord {
  id: string;        // crypto.randomUUID() 生成
  name: string;
  createdAt: number; // epoch ms
  updatedAt: number;
}

/** 索引条目 = 列表/搜索数据源（对应前端 NoteListItem 去掉视图字段） */
export interface NoteIndexEntry {
  id: string;
  title: string;
  excerpt: string;   // 服务层生成：正文去 HTML 标签后截断 ~120 字符
  folderId: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean; // 预留
}

/** 全量笔记 = 编辑器数据源（前端 EditorNoteMock 的持久化形态） */
export interface NoteRecord extends NoteIndexEntry {
  content: string;   // Tiptap HTML
}
```

### 2.4 与前端类型的关系（视图层覆写，组件零改动）

| 前端类型 | 来源 | 视图层补充 |
|---|---|---|
| `Folder` | `FolderRecord` | `count`（索引按 folderId 计数）、`expanded`、`selected` |
| `NoteListItem` | `NoteIndexEntry` | `folderName`（join folders）、`updatedLabel`（相对时间文案）、`selected` |
| `EditorNoteMock` | `NoteRecord` | `path`（由 folderName 拼出，如 `Projects / Product design`） |

---

## 3. 服务层模块设计（services/）

原则：**纯函数 + Promise、无全局可变状态**（避免 MV3 上下文终止丢状态）；导出签名与 frontend-api.md §9 草案对齐。

### 3.1 `services/storage.ts` — 存储适配器（唯一直接碰 chrome.storage 的模块）

```ts
export async function getItem<T>(key: string): Promise<T | undefined>;
export async function setItem(key: string, value: unknown): Promise<void>;
export async function setItems(entries: Record<string, unknown>): Promise<void>; // 多 key 合并，占一次写配额
export async function removeItems(keys: string[]): Promise<void>;
export function debouncedSet(key: string, value: unknown, waitMs?: number): void; // 高频写合并（自动保存用）
export function onChanged(cb: (changes: Record<string, chrome.storage.StorageChange>, area: 'local') => void): () => void;
```

职责：读写封装、防抖合并、`onChanged` 订阅（跨上下文刷新）、错误归一（把 `QUOTA_BYTES` / 写入限流等 chrome 错误映射为 §4.2 错误码）。

### 3.2 `services/folderService.ts`

```ts
export async function listFolders(): Promise<FolderRecord[]>;
export async function createFolder(name: string): Promise<FolderRecord>;
export async function renameFolder(id: string, name: string): Promise<FolderRecord>;
export async function deleteFolder(id: string, options: { moveNotesTo: 'inbox' | 'delete' }): Promise<void>; // 级联策略见 §5.5
```

### 3.3 `services/noteService.ts`（核心）

```ts
export async function listNotes(options?: {
  folderId?: string;
  query?: string;
  archived?: boolean;
}): Promise<NoteIndexEntry[]>;

export async function getNote(id: string): Promise<NoteRecord | undefined>;

export async function createNote(input: {
  title?: string;      // 缺省用 'Untitled'
  folderId?: string;   // 缺省用 settings.defaultFolderId
  content?: string;    // 缺省空文档
}): Promise<NoteRecord>;

export async function updateNote(
  id: string,
  patch: Partial<Pick<NoteRecord, 'title' | 'content' | 'folderId' | 'archived'>>,
): Promise<NoteRecord>;

export async function deleteNote(id: string): Promise<void>;

export async function moveNote(id: string, folderId: string): Promise<NoteRecord>;
```

实现要点：

- `updateNote` 内部一次 `setItems({ 'note:{id}': note, 'notes:index': newIndex })`，两条 key 合并为**一次写配额**；自动刷新 `updatedAt`、重算 `excerpt`。
- `excerpt` 在服务层生成（strip HTML 标签 + 截断），前端不关心。
- `deleteNote` 用 `removeItems(['note:{id}'])` + 更新索引。

### 3.4 `services/searchService.ts`

```ts
export async function searchNotes(query: string, options?: { limit?: number }): Promise<NoteIndexEntry[]>;
```

实现（无数据库，量级小用扫描）：

1. 小写化 query，先匹配 `notes:index` 的 title（权重高）与 excerpt；
2. 命中不足时，对 `note:{id}` 追加正文扫描，**限制扫描条数**（如 ≤ 200 条）与返回条数（默认 20）；
3. 结果按 `updatedAt` 倒序。量级增大后升级为独立倒排索引 key（§7）。

### 3.5 `services/markdownService.ts`

```ts
export async function htmlToMarkdown(html: string): Promise<string>;
export async function markdownToHtml(md: string): Promise<string>;
```

用已安装的 `@tiptap/markdown`（TiptapMarkdown）。约定：**正文以 Tiptap HTML 持久化**（编辑器原生格式，避免每键击转换的性能损耗）；HTML↔MD 转换只发生在导入/导出/剪藏边界。

### 3.6 `services/settingsService.ts`（预留）

```ts
export async function getSettings(): Promise<MetaRecord['settings']>; // { defaultFolderId }
export async function setSettings(patch: Partial<MetaRecord['settings']>): Promise<void>;
```

---

## 4. 消息协议（方案 B 备用，未来 content script 接入时启用）

### 4.1 请求 / 响应约定

```ts
// 请求：判别联合（type 与 §3 服务一一对应）
type ServiceRequest =
  | { type: 'folders:list' }
  | { type: 'folders:create'; payload: { name: string } }
  | { type: 'folders:rename'; payload: { id: string; name: string } }
  | { type: 'folders:delete'; payload: { id: string; moveNotesTo: 'inbox' | 'delete' } }
  | { type: 'notes:list'; payload?: { folderId?: string; query?: string } }
  | { type: 'notes:get'; payload: { id: string } }
  | { type: 'notes:create'; payload?: { title?: string; folderId?: string } }
  | { type: 'notes:update'; payload: { id: string; patch: Partial<Pick<NoteRecord, 'title' | 'content' | 'folderId' | 'archived'>> } }
  | { type: 'notes:delete'; payload: { id: string } }
  | { type: 'notes:move'; payload: { id: string; folderId: string } }
  | { type: 'notes:search'; payload: { query: string } };

// 响应：统一信封
type ServiceResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string } };
```

### 4.2 错误码

| code | 含义 |
|---|---|
| `NOT_FOUND` | 笔记/文件夹不存在 |
| `VALIDATION` | 参数非法（空标题、空 query、folderId 不存在等） |
| `QUOTA_EXCEEDED` | 超出 storage 配额 |
| `WRITE_THROTTLED` | 写入过于频繁被限流（应重试或合并） |
| `INTERNAL` | 未预期错误 |

### 4.3 路由（background.ts 内）

```ts
browser.runtime.onMessage.addListener((req: ServiceRequest, _sender, sendResponse) => {
  route(req)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((err) => sendResponse({ ok: false, error: normalizeError(err) }));
  return true; // 异步响应必须返回 true
});
```

> 注意：MV3 service worker 可能休眠，消息会唤醒它；路由本身无状态，数据仍全部在 chrome.storage。

---

## 5. 核心业务流程

### 5.1 首次初始化（懒初始化 + 幂等）

任何服务首次被调用时检查 `meta`：不存在则一次 `setItems` 写入 `schemaVersion`、默认文件夹（`Inbox`）与空索引，避免半初始化状态。后续启动直接复用。

### 5.2 笔记库加载

`noteService.listNotes()` → 读 `notes:index`（不读正文）→ 前端 computed 覆写 `selected` / `folderName` / `updatedLabel` → 渲染。搜索视图走 `searchService.searchNotes(query)`。

### 5.3 搜索

SearchBar 输入 → 前端防抖 ~200ms → `searchNotes` → 结果 limit 20。进入/退出搜索态时的默认选中复位逻辑（`DEFAULT_SEARCH_NOTE_ID`）保持现有实现不变。

### 5.4 自动保存（关键路径）

```
编辑器 onUpdate（任意输入）
      │  debounce 800ms（storage.ts 内部 debouncedSet 合并）
      ▼
updateNote(id, { content })  →  setItems({ 'note:{id}': ..., 'notes:index': ... })  ← 一次写配额
      │
      ▼
visibilitychange / pagehide（侧边栏关闭前）→ 强制 flush 未落盘变更
```

- 标题编辑走同一路径（`updateNote(id, { title })`）。
- 冲突策略：单用户单窗口场景，以**最后一次写入为准**（updatedAt 覆盖即可）。

### 5.5 删除文件夹（级联策略）

`deleteFolder(id, { moveNotesTo })`：

- `'inbox'`（推荐）：该文件夹下笔记的 `folderId` 改为默认文件夹——误删可恢复；
- `'delete'`：连同笔记一起 `removeItems`；
- UI 侧加确认弹窗（现有 `NewNoteButton` / `FolderItem` 接口不变，交互由 App.vue 组合）。

### 5.6 数据迁移

`meta.schemaVersion` 递增；`storage.ts` 读取时检查版本，按序执行迁移函数（如 v1→v2 补字段、重建索引）。新增可选字段时给默认值即可平滑升级，无需迁移。

---

## 6. 与前端接口的映射表

| 前端（frontend-api.md） | 后端服务调用 |
|---|---|
| `folders`（mock） | `folderService.listFolders()` + count 计算 |
| `defaultNotes` / `searchResultNotes`（mock） | `noteService.listNotes()` / `searchService.searchNotes(query)` |
| `editorMock`（mock） | `noteService.getNote(id)` → 拼 `EditorNoteMock` |
| `NewNoteButton @create` | `noteService.createNote({ folderId: selectedFolderId })` → 打开编辑器 |
| `NoteListItem` 更多菜单 → 删除/移动 | `noteService.deleteNote(id)` / `moveNote(id, folderId)` |
| 标题 `EditorTitleBlock @update:modelValue` | `updateNote(id, { title })`（防抖） |
| 编辑器正文 `onUpdate` | `updateNote(id, { content })`（防抖，§5.4） |
| 搜索词变化（`viewState` 切 search） | `searchService.searchNotes(query)` |
| 文件夹选中 / 新建 / 重命名 | `folderService` 对应方法 |

**接入方式**：在 `App.vue`（或按 note.md 路线引入 Pinia store 收口）中把 §2 的 mock import 替换为异步服务调用；组件 Props/Emits 全部不变。frontend-api.md §9 的草案签名即由本文 §3 落地。

---

## 7. 边界、限制与扩展

- **容量估算**：正文 HTML 平均 5–20 KB → 10 MB 默认配额约 500–2000 篇；申请 `unlimitedStorage` 后基本无虞。索引只存元数据，不存正文副本。
- **并发**：多上下文同时写以 `updatedAt` 最后写入为准；`onChanged` 用于跨上下文刷新（如 content script 剪藏后，sidepanel 通过 `onChanged` 收到索引变化自动刷新列表）。
- **数据安全**：chrome.storage 明文，不存密码/token；如未来存敏感内容需自行加密（如 Web Crypto AES-GCM，密钥放扩展内）。
- **后续扩展方向**：笔记导出（`markdownService`）、网页剪藏（content script 选中文本/链接 → 消息路由 → `noteService.createNote`）、云同步（把服务层实现替换为远端 API，接口签名不变，前端零改动）。
- **WXT 落点清单**：
  - `types/storage.ts`（§2.3 模型 + §4.1 协议类型）
  - `services/`（§3 六个模块）
  - `wxt.config.ts`：permissions 增加 `'unlimitedStorage'`
  - `entrypoints/background.ts`：保留 Side Panel 配置；启用方案 B 时追加消息路由（§4.3）
  - 前端替换点：`App.vue` / 未来 Pinia store

---

## 参考

- [MDN — storage.local（配额与行为）](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/storage/local)
- [Chromium — Increase storage.local limit from 5MB to 10MB](https://github.com/chromium/chromium/commit/f2dd440473b7267d2bade392ad9016fce4ed7d39)
- [Chrome Developers — chrome.storage 参考（写入限流 / unlimitedStorage）](https://chrome.jscn.org/docs/extensions/reference/storage)
