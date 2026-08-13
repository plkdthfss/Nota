<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppHeader from '../../components/library/AppHeader.vue'; import SearchBar from '../../components/library/SearchBar.vue'; import FolderTree from '../../components/library/FolderTree.vue'; import NoteList from '../../components/library/NoteList.vue'; import SearchResultHeader from '../../components/library/SearchResultHeader.vue'; import NewNoteButton from '../../components/library/NewNoteButton.vue';
import NoteEditor from '../../components/editor/NoteEditor.vue';
import { DEFAULT_FOLDER_ID, DEFAULT_NOTE_ID, DEFAULT_SEARCH_NOTE_ID, defaultNotes, folders, searchResultNotes } from '../../mock/noteLibraryMock';
import type { LibraryViewState } from '../../types/library';
import type { SidePanelPage } from '../../types/editor';
const searchQuery = ref(''); const selectedFolderId = ref(DEFAULT_FOLDER_ID); const selectedDefaultNoteId = ref(DEFAULT_NOTE_ID); const selectedSearchNoteId = ref(DEFAULT_SEARCH_NOTE_ID); const focusRequest = ref(0);
const currentPage = ref<SidePanelPage>('library');
const viewState = computed<LibraryViewState>(() => searchQuery.value.trim() ? 'search' : 'default');
const displayedFolders = computed(() => folders.map(folder => ({ ...folder, selected: folder.id === selectedFolderId.value })));
const displayedNotes = computed(() => (viewState.value === 'search' ? searchResultNotes.map(note => ({ ...note, selected: note.id === selectedSearchNoteId.value })) : defaultNotes.map(note => ({ ...note, selected: note.id === selectedDefaultNoteId.value }))));
watch(viewState, state => { if (state === 'search') selectedSearchNoteId.value = DEFAULT_SEARCH_NOTE_ID; });
function selectNote(id: string) { if (viewState.value === 'search') selectedSearchNoteId.value = id; else selectedDefaultNoteId.value = id; currentPage.value = 'editor'; }
function clearSearch() { selectedDefaultNoteId.value = DEFAULT_NOTE_ID; }
</script>
<template><main v-if="currentPage === 'library'" class="library-shell"><AppHeader @search="focusRequest++" /><SearchBar v-model="searchQuery" :focus-request="focusRequest" @clear="clearSearch" /><FolderTree :folders="displayedFolders" @select="selectedFolderId = $event" /><SearchResultHeader v-if="viewState === 'search'" :count="displayedNotes.length" /><NoteList :notes="displayedNotes" @select="selectNote" /><NewNoteButton /></main><NoteEditor v-else @back="currentPage = 'library'" /></template>
