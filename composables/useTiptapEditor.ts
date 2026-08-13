import { ref } from 'vue';
import { useEditor } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CharacterCount from '@tiptap/extension-character-count';

export function useTiptapEditor(initialContent: string) {
  const wordCount = ref(0);
  const updateWordCount = (instance: { storage: { characterCount: { words: () => number } } }) => {
    wordCount.value = instance.storage.characterCount.words();
  };

  const editor = useEditor({
    content: initialContent,
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, autolink: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
    ],
    editorProps: {
      attributes: {
        class: 'sidenote-prose',
        'aria-label': 'Note content',
        spellcheck: 'true',
      },
      handleClickOn: (_view, _pos, node, nodePos, event) => {
        if (node.type.name === 'text' && node.marks.some(mark => mark.type.name === 'link')) {
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor }) => updateWordCount(editor),
    onUpdate: ({ editor }) => updateWordCount(editor),
  });

  return { editor, wordCount };
}
