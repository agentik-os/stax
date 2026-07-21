/**
 * RichNotes: THE rich-text editor (Tiptap), shared by notes, task notes,
 * data-row pages, block demos and the canvas inspectors.
 */
import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

/* ── RichNotes: THE notes editor, shared by every notes surface ─────── */
export function RichNotes({ html, onChange, placeholder }: { html: string; onChange: (html: string) => void; placeholder?: string }) {
  const [ttMenu, setTtMenu] = useState<null | "block" | "more" | "list">(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Write the full story of this element: headings, lists, quotes…" }),
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: html || "",
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });
  if (!editor) return null;
  const B = ({ on, label, run, title }: { on?: boolean; label: string; run: () => void; title: string }) => (
    <button className={on ? "on" : ""} title={title} onMouseDown={(e) => { e.preventDefault(); run(); }}>{label}</button>
  );
  const Sep = () => <span className="tt-sep" />;
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
  };
  const blockLabel = editor.isActive("heading", { level: 1 }) ? "Title"
    : editor.isActive("heading", { level: 2 }) ? "Heading"
    : editor.isActive("heading", { level: 3 }) ? "Small"
    : editor.isActive("codeBlock") ? "Code"
    : editor.isActive("blockquote") ? "Quote"
    : "Text";
  const listLabel = editor.isActive("taskList") ? "☑" : editor.isActive("orderedList") ? "1." : "••";
  const listOn = editor.isActive("bulletList") || editor.isActive("orderedList") || editor.isActive("taskList");
  const MI = ({ on, label, run }: { on?: boolean; label: string; run: () => void }) => (
    <button className={"tt-mi" + (on ? " on" : "")}
      onMouseDown={(e) => { e.preventDefault(); run(); setTtMenu(null); }}>
      {label}{on ? <span className="ck">✓</span> : null}
    </button>
  );
  return (
    <div className="tt-wrap cv-notes">
      {ttMenu && <div className="pop-bg" onMouseDown={() => setTtMenu(null)} />}
      <div className="tt-toolbar">
        <span className="tt-dd">
          <button className={"tt-trigger" + (blockLabel !== "Text" ? " on" : "")} title="Paragraph style"
            onMouseDown={(e) => { e.preventDefault(); setTtMenu((m) => (m === "block" ? null : "block")); }}>
            {blockLabel} <span className="caret">⌄</span>
          </button>
          {ttMenu === "block" && (
            <div className="tt-menu">
              <MI on={blockLabel === "Text"} label="Text" run={() => editor.chain().focus().setParagraph().run()} />
              <MI on={blockLabel === "Title"} label="Title" run={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
              <MI on={blockLabel === "Heading"} label="Heading" run={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
              <MI on={blockLabel === "Small"} label="Small heading" run={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
              <MI on={blockLabel === "Quote"} label="Quote" run={() => editor.chain().focus().toggleBlockquote().run()} />
              <MI on={blockLabel === "Code"} label="Code block" run={() => editor.chain().focus().toggleCodeBlock().run()} />
            </div>
          )}
        </span>
        <Sep />
        <B on={editor.isActive("bold")} label="B" title="Bold: ⌘B" run={() => editor.chain().focus().toggleBold().run()} />
        <B on={editor.isActive("italic")} label="I" title="Italic: ⌘I" run={() => editor.chain().focus().toggleItalic().run()} />
        <B on={editor.isActive("underline")} label="U" title="Underline: ⌘U" run={() => editor.chain().focus().toggleUnderline().run()} />
        <span className="tt-dd">
          <button className={"tt-trigger" + (editor.isActive("strike") || editor.isActive("highlight") || editor.isActive("link") ? " on" : "")}
            title="More formatting"
            onMouseDown={(e) => { e.preventDefault(); setTtMenu((m) => (m === "more" ? null : "more")); }}>
            ⋯
          </button>
          {ttMenu === "more" && (
            <div className="tt-menu">
              <MI on={editor.isActive("strike")} label="Strikethrough" run={() => editor.chain().focus().toggleStrike().run()} />
              <MI on={editor.isActive("highlight")} label="Highlight" run={() => editor.chain().focus().toggleHighlight().run()} />
              <MI on={editor.isActive("link")} label="Link…" run={setLink} />
              <MI label="Divider" run={() => editor.chain().focus().setHorizontalRule().run()} />
            </div>
          )}
        </span>
        <Sep />
        <span className="tt-dd">
          <button className={"tt-trigger" + (listOn ? " on" : "")} title="Lists"
            onMouseDown={(e) => { e.preventDefault(); setTtMenu((m) => (m === "list" ? null : "list")); }}>
            {listLabel} <span className="caret">⌄</span>
          </button>
          {ttMenu === "list" && (
            <div className="tt-menu">
              <MI on={editor.isActive("bulletList")} label="•  Bullets" run={() => editor.chain().focus().toggleBulletList().run()} />
              <MI on={editor.isActive("orderedList")} label="1. Numbered" run={() => editor.chain().focus().toggleOrderedList().run()} />
              <MI on={editor.isActive("taskList")} label="☑ Checklist" run={() => editor.chain().focus().toggleTaskList().run()} />
            </div>
          )}
        </span>
      </div>
      <EditorContent editor={editor} className="tiptap" />
    </div>
  );
}

