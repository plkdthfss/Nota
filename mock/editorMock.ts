import type { EditorNoteMock } from "../types/editor";

export const editorMock: EditorNoteMock = {
  title: "Chrome sidebar Markdown notes",
  path: "Projects / Product design",
  content: `
    <h1>Design principles</h1>
    <p>The side panel should feel immediate and focused. High-frequency actions stay visible, while destructive and organizational actions remain in overflow menus.</p>
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Keep the note library scannable</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Preserve list state when returning</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Auto-save without interrupting writing</p></div></li>
    </ul>
    <blockquote><p>A good side-panel editor removes navigation overhead without hiding essential formatting tools.</p></blockquote>
    <h2>Keyboard and Markdown shortcuts</h2>
    <p>Use familiar shortcuts for bold, italic, headings, lists, links, and inline code. The interface stays visual, but the underlying document remains Markdown-compatible.</p>
    <p><a href="https://example.com/formatting-guide">Read formatting guide</a></p>
  `,
};
