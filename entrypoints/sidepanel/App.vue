<script setup lang="ts">
import { computed, ref } from 'vue';
import { EditorContent, useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import { storage } from '#imports';

type SaveState = 'loading' | 'saving' | 'saved' | 'error';

/**
 * WXT 提供的类型安全存储项。
 *
 * 最终保存到 chrome.storage.local：
 * key: tiptap-document
 */
const documentStorage = storage.defineItem<string>(
  'local:tiptap-document',
  {
    fallback: `
      <h2>WXT + Vue + Tiptap</h2>
      <p>现在可以开始编辑了。</p>
    `,
  },
);

const saveState = ref<SaveState>('loading');

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let latestHtml = '';

const saveStateText = computed(() => {
  const textMap: Record<SaveState, string> = {
    loading: '正在加载',
    saving: '正在保存',
    saved: '已保存',
    error: '保存失败',
  };

  return textMap[saveState.value];
});

/**
 * 延迟保存，避免每输入一个字符就写一次存储。
 */
function scheduleSave(html: string) {
  latestHtml = html;
  saveState.value = 'saving';

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    void saveDocument(latestHtml);
  }, 500);
}

async function saveDocument(html: string) {
  try {
    await documentStorage.setValue(html);

    // 保存期间可能又产生了新内容，
    // 只有当前内容仍是最新内容时才显示“已保存”。
    if (html === latestHtml) {
      saveState.value = 'saved';
    }
  } catch (error) {
    console.error('保存 Tiptap 内容失败：', error);
    saveState.value = 'error';
  }
}

const editor = useEditor({
  extensions: [StarterKit],

  // 加载存储内容之前的临时内容
  content: '<p>正在加载编辑器内容……</p>',

  editorProps: {
    attributes: {
      class: 'tiptap-editor',
      spellcheck: 'false',
    },
  },

  /**
   * 编辑器创建完成后读取本地内容。
   */
  onCreate: ({ editor }) => {
    void (async () => {
      try {
        const savedHtml = await documentStorage.getValue();

        editor.commands.setContent(savedHtml, {
          emitUpdate: false,
        });

        latestHtml = savedHtml;
        saveState.value = 'saved';
      } catch (error) {
        console.error('读取 Tiptap 内容失败：', error);
        saveState.value = 'error';
      }
    })();
  },

  /**
   * 每次文档变化时触发自动保存。
   */
  onUpdate: ({ editor }) => {
    scheduleSave(editor.getHTML());
  },

  /**
   * 关闭侧边栏或销毁编辑器时，立即保存最后内容。
   */
  onDestroy: ({ editor }) => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    void documentStorage.setValue(editor.getHTML());
  },
});

async function clearDocument() {
  if (!editor.value) {
    return;
  }

  const confirmed = window.confirm('确定清空当前内容吗？');

  if (!confirmed) {
    return;
  }

  editor.value.commands.setContent('<p></p>');

  await saveDocument(editor.value.getHTML());
}
</script>

<template>
  <main class="app">
    <header class="app-header">
      <div>
        <h1>随手记</h1>
        <p
          class="save-state"
          :class="{ error: saveState === 'error' }"
        >
          {{ saveStateText }}
        </p>
      </div>

      <button
        type="button"
        class="clear-button"
        @click="clearDocument"
      >
        清空
      </button>
    </header>

    <section
      v-if="editor"
      class="editor-container"
    >
      <div class="toolbar">
        <button
          type="button"
          title="正文"
          :class="{ active: editor.isActive('paragraph') }"
          @mousedown.prevent
          @click="editor.chain().focus().setParagraph().run()"
        >
          正文
        </button>

        <button
          type="button"
          title="一级标题"
          :class="{
            active: editor.isActive('heading', { level: 1 }),
          }"
          @mousedown.prevent
          @click="
            editor
              .chain()
              .focus()
              .toggleHeading({ level: 1 })
              .run()
          "
        >
          H1
        </button>

        <button
          type="button"
          title="二级标题"
          :class="{
            active: editor.isActive('heading', { level: 2 }),
          }"
          @mousedown.prevent
          @click="
            editor
              .chain()
              .focus()
              .toggleHeading({ level: 2 })
              .run()
          "
        >
          H2
        </button>

        <span class="toolbar-divider"></span>

        <button
          type="button"
          title="粗体"
          :class="{ active: editor.isActive('bold') }"
          @mousedown.prevent
          @click="editor.chain().focus().toggleBold().run()"
        >
          <strong>B</strong>
        </button>

        <button
          type="button"
          title="斜体"
          :class="{ active: editor.isActive('italic') }"
          @mousedown.prevent
          @click="editor.chain().focus().toggleItalic().run()"
        >
          <em>I</em>
        </button>

        <button
          type="button"
          title="删除线"
          :class="{ active: editor.isActive('strike') }"
          @mousedown.prevent
          @click="editor.chain().focus().toggleStrike().run()"
        >
          <s>S</s>
        </button>

        <button
          type="button"
          title="行内代码"
          :class="{ active: editor.isActive('code') }"
          @mousedown.prevent
          @click="editor.chain().focus().toggleCode().run()"
        >
          &lt;/&gt;
        </button>

        <span class="toolbar-divider"></span>

        <button
          type="button"
          title="无序列表"
          :class="{ active: editor.isActive('bulletList') }"
          @mousedown.prevent
          @click="
            editor.chain().focus().toggleBulletList().run()
          "
        >
          • 列表
        </button>

        <button
          type="button"
          title="有序列表"
          :class="{ active: editor.isActive('orderedList') }"
          @mousedown.prevent
          @click="
            editor.chain().focus().toggleOrderedList().run()
          "
        >
          1. 列表
        </button>

        <button
          type="button"
          title="引用"
          :class="{ active: editor.isActive('blockquote') }"
          @mousedown.prevent
          @click="
            editor.chain().focus().toggleBlockquote().run()
          "
        >
          引用
        </button>

        <button
          type="button"
          title="代码块"
          :class="{ active: editor.isActive('codeBlock') }"
          @mousedown.prevent
          @click="
            editor.chain().focus().toggleCodeBlock().run()
          "
        >
          代码块
        </button>

        <span class="toolbar-divider"></span>

        <button
          type="button"
          title="撤销"
          @mousedown.prevent
          @click="editor.chain().focus().undo().run()"
        >
          ↶
        </button>

        <button
          type="button"
          title="重做"
          @mousedown.prevent
          @click="editor.chain().focus().redo().run()"
        >
          ↷
        </button>
      </div>

      <EditorContent
        :editor="editor"
        class="editor-content"
      />
    </section>

    <div
      v-else
      class="loading"
    >
      正在初始化编辑器……
    </div>
  </main>
</template>