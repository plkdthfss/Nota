<script setup lang="ts">
import { browser } from 'wxt/browser';
import { computed, onMounted, ref, watch } from 'vue';
import AppHeader from '../../components/library/AppHeader.vue';
import SearchBar from '../../components/library/SearchBar.vue';
import FolderTree from '../../components/library/FolderTree.vue';
import NoteList from '../../components/library/NoteList.vue';
import SearchResultHeader from '../../components/library/SearchResultHeader.vue';
import NewNoteButton from '../../components/library/NewNoteButton.vue';
import NoteEditor from '../../components/editor/NoteEditor.vue';
import { listFolders, createFolder, deleteFolder } from '../../services/folderService';
import { createNote, listNotes, deleteNote, getNote } from '../../services/noteService';
import { searchNotes } from '../../services/searchService';
import { getSettings, setSettings } from '../../services/settingsService';
import { htmlToMarkdown } from '../../services/markdownService';
import type { LibraryViewState } from '../../types/library';
import type { SidePanelPage } from '../../types/editor';
import type { FolderRecord, NoteIndexEntry } from '../../types/storage';

/* ------------------------------------------------------------------ */
/* 状态                                                                 */
/* ------------------------------------------------------------------ */

const searchQuery = ref('');
const selectedFolderId = ref('');
const selectedDefaultNoteId = ref('');
const selectedSearchNoteId = ref('');
const focusRequest = ref(0);
const currentPage = ref<SidePanelPage>('library');

const folders = ref<FolderRecord[]>([]);
const defaultNotes = ref<NoteIndexEntry[]>([]);
const searchResultNotes = ref<NoteIndexEntry[]>([]);
const loading = ref(true);
const defaultFolderId = ref('');
const theme = ref<'light' | 'dark'>('light');

const viewState = computed<LibraryViewState>(() =>
  searchQuery.value.trim() ? 'search' : 'default',
);

const folderMap = computed(
  () => new Map(folders.value.map((f) => [f.id, f])),
);

/** 编辑器中打开的笔记 id（按当前视图取选中项） */
const editorNoteId = computed(() =>
  viewState.value === 'search'
    ? selectedSearchNoteId.value
    : selectedDefaultNoteId.value,
);

/* ------------------------------------------------------------------ */
/* 视图派生（对应 docs/backend-design.md §2.4 视图层覆写）                */
/* ------------------------------------------------------------------ */

const displayedFolders = computed(() =>
  folders.value.map((f) => ({
    id: f.id,
    name: f.name,
    count: defaultNotes.value.filter((n) => n.folderId === f.id).length,
    expanded: false,
    selected: f.id === selectedFolderId.value,
  })),
);

const displayedNotes = computed(() => {
  const isSearch = viewState.value === 'search';
  // 默认视图按选中文件夹筛选；搜索视图保持"in all folders"
  const source = isSearch
    ? searchResultNotes.value
    : defaultNotes.value.filter(
        (n) => !selectedFolderId.value || n.folderId === selectedFolderId.value,
      );
  const selectedId = isSearch
    ? selectedSearchNoteId.value
    : selectedDefaultNoteId.value;
  return source.map((note) => ({
    id: note.id,
    title: note.title,
    excerpt: note.excerpt,
    folderName: folderMap.value.get(note.folderId)?.name ?? '',
    updatedLabel: formatUpdatedLabel(note.updatedAt),
    selected: note.id === selectedId,
  }));
});

/* ------------------------------------------------------------------ */
/* 数据加载                                                             */
/* ------------------------------------------------------------------ */

async function loadLibrary() {
  const [fs, notes] = await Promise.all([listFolders(), listNotes()]);
  folders.value = fs;
  defaultNotes.value = notes;
  // 默认选中第一个文件夹（真实数据下不再使用硬编码 id）
  if (!fs.some((f) => f.id === selectedFolderId.value)) {
    selectedFolderId.value = fs[0]?.id ?? '';
  }
  syncDefaultSelection();
  loading.value = false;
}

/** 读取设置：默认文件夹 id（隐藏默认文件夹删除入口）+ 主题（应用到根节点） */
async function loadSettings() {
  const settings = await getSettings();
  defaultFolderId.value = settings.defaultFolderId;
  theme.value = settings.theme;
  applyTheme();
}

/** 把主题应用到 <html data-theme>，全站（含编辑器）经 CSS 变量即时同步 */
function applyTheme() {
  document.documentElement.dataset.theme = theme.value;
}

/** 切换主题：翻转当前值，应用 + 持久化到 settings */
function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light';
  applyTheme();
  void setSettings({ theme: theme.value }).catch(() => {
    /* 持久化失败不阻塞切换 */
  });
}

/** 把默认视图的选中笔记重置到当前文件夹内最新一条（若当前选中不在其中） */
function syncDefaultSelection() {
  const folderNotes = selectedFolderId.value
    ? defaultNotes.value.filter((n) => n.folderId === selectedFolderId.value)
    : defaultNotes.value;
  if (!folderNotes.some((n) => n.id === selectedDefaultNoteId.value)) {
    selectedDefaultNoteId.value = folderNotes[0]?.id ?? '';
  }
}

// 切换文件夹时，选中笔记跟随重置到该文件夹
watch(selectedFolderId, () => {
  if (viewState.value !== 'search') syncDefaultSelection();
});

// 退出搜索回到默认视图时同样校正选中
watch(viewState, (state) => {
  if (state === 'default') syncDefaultSelection();
});

onMounted(() => {
  void loadLibrary();
  void loadSettings();
});

// 返回列表页时刷新（新建/编辑后的数据同步）
watch(currentPage, (page) => {
  if (page === 'library') void loadLibrary();
});

/* ------------------------------------------------------------------ */
/* 交互                                                                 */
/* ------------------------------------------------------------------ */

let searchTimer: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, (query) => {
  if (searchTimer) clearTimeout(searchTimer);
  const q = query.trim();
  if (!q) {
    searchResultNotes.value = [];
    return;
  }
  searchTimer = setTimeout(async () => {
    const results = await searchNotes(q);
    searchResultNotes.value = results;
    // 结果更新时保证搜索视图有选中项（真实数据不再使用硬编码 id）
    if (!results.some((n) => n.id === selectedSearchNoteId.value)) {
      selectedSearchNoteId.value = results[0]?.id ?? '';
    }
  }, 200);
});

function selectNote(id: string) {
  if (viewState.value === 'search') selectedSearchNoteId.value = id;
  else selectedDefaultNoteId.value = id;
  currentPage.value = 'editor';
}

function clearSearch() {
  syncDefaultSelection();
}

async function createNewNote() {
  const record = await createNote({
    folderId: selectedFolderId.value || undefined,
  });
  selectedDefaultNoteId.value = record.id;
  currentPage.value = 'editor';
}

async function createNewFolder(name: string) {
  const folder = await createFolder(name);
  // 新建后自动选中该文件夹（loadLibrary 会保留有效选中）
  selectedFolderId.value = folder.id;
  await loadLibrary();
}

/** 删除笔记：后端删除 + 本地移除（避免整库刷新闪烁）+ 选中校正 */
async function handleDeleteNote(id: string) {
  await deleteNote(id);
  defaultNotes.value = defaultNotes.value.filter((n) => n.id !== id);
  searchResultNotes.value = searchResultNotes.value.filter((n) => n.id !== id);
  if (viewState.value === 'search') {
    // 搜索视图：删除的正是选中项时，重置为剩余结果第一条（没有则空）
    if (selectedSearchNoteId.value === id) {
      selectedSearchNoteId.value = searchResultNotes.value[0]?.id ?? '';
    }
  } else {
    syncDefaultSelection();
  }
}

/** 删除文件夹（级联：笔记移入指定文件夹或连同笔记删除），随后整库刷新 */
async function handleDeleteFolder(id: string, moveNotesTo: 'delete' | string) {
  await deleteFolder(id, { moveNotesTo });
  await loadLibrary();
}

/** 导出笔记为独立 Markdown 文件（经 browser.downloads 弹"另存为"对话框） */
async function handleExportMd(id: string) {
  const note = await getNote(id);
  if (!note) return;
  const md = await htmlToMarkdown(note.content);
  const title = note.title.trim() || 'Untitled';
  // 文件名去掉 Windows/Unix 非法字符
  const safeTitle = title.replace(/[\\/:*?"<>|]/g, '_');
  const content = `# ${title}\n\n${md}`;
  const url = URL.createObjectURL(
    new Blob([content], { type: 'text/markdown;charset=utf-8' }),
  );
  try {
    await browser.downloads.download({
      url,
      filename: `${safeTitle}.md`,
      saveAs: true,
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ------------------------------------------------------------------ */
/* 工具                                                                 */
/* ------------------------------------------------------------------ */

/** 相对时间文案（与 mock 阶段展示风格一致） */
function formatUpdatedLabel(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'just now';
  if (diff < hour) return `${Math.floor(diff / minute)} min ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hr ago`;
  if (diff < 2 * day) return 'Yesterday';
  const d = new Date(timestamp);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
</script>

<template>
  <main v-if="currentPage === 'library'" class="library-shell">
    <AppHeader :theme="theme" @toggle-theme="toggleTheme" />
    <SearchBar v-model="searchQuery" :focus-request="focusRequest" @clear="clearSearch" />
    <FolderTree
      :folders="displayedFolders"
      :default-folder-id="defaultFolderId"
      @select="selectedFolderId = $event"
      @delete-folder="handleDeleteFolder"
    />
    <SearchResultHeader v-if="viewState === 'search'" :count="displayedNotes.length" />
    <NoteList
      v-if="!loading"
      :notes="displayedNotes"
      @select="selectNote"
      @delete="handleDeleteNote"
      @export-md="handleExportMd"
    />
    <NewNoteButton @create="createNewNote" @create-folder="createNewFolder" />
  </main>
  <NoteEditor
    v-else
    :note-id="editorNoteId"
    @back="currentPage = 'library'"
  />
</template>
