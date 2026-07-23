/**
 * The REAL tiptap demo, alone in its chunk: BlockDemo and BlockLive lazy-load
 * it so the prosemirror stack never rides in the main bundle.
 */
import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TTImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { RichNotes } from "./RichNotesLazy";
import { Zone, muted } from "./BlockDemo";

export function TiptapDemo({ v }: { v: 1 | 2 | 3 }) {
  const [rich, setRich] = useState(
    "<h2>The framework editor</h2><p>The same <b>RichNotes</b> component the canvas, tasks and data pages use: smart paragraph menu, checklists, links, highlight.</p><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"true\"><label><input type=\"checkbox\" checked=\"checked\"><span></span></label><div><p>One editor everywhere</p></div></li><li data-type=\"taskItem\" data-checked=\"false\"><label><input type=\"checkbox\"><span></span></label><div><p>Try the Text menu</p></div></li></ul>");
  const editor = useEditor({
    extensions: [
      StarterKit,
      TTImage,
      Placeholder.configure({ placeholder: v === 2 ? "Title your story, then just write…" : "Take a note…" }),
    ],
    content:
      v === 1
        ? "<p>A <b>real</b> Tiptap editor inside a panel: select text, use the toolbar.</p><ul><li>Notes</li><li>Specs</li><li>Meeting minutes</li></ul>"
        : v === 2
          ? "<h2>Why panels beat pages</h2><p>The draft lives beside its sources: pin a record, quote it, keep writing. <i>Blog writing without losing the thread.</i></p><blockquote>A panel is a modal that respects its parent.</blockquote>"
          : "<p>Image note-taking: insert screenshots and annotate around them.</p>",
  }, [v]);
  if ((v as number) === 1) {
    return (
      <Zone col>
        <RichNotes html={rich} onChange={setRich} />
      </Zone>
    );
  }
  if (!editor) return null;
  const B = ({ act, on, label }: { act: () => void; on?: boolean; label: string }) => (
    <button className={on ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); act(); }}>{label}</button>
  );
  return (
    <Zone col>
      <div className="tt-wrap">
        <div className="tt-toolbar">
          <B label="B" on={editor.isActive("bold")} act={() => editor.chain().focus().toggleBold().run()} />
          <B label="I" on={editor.isActive("italic")} act={() => editor.chain().focus().toggleItalic().run()} />
          <B label="H2" on={editor.isActive("heading", { level: 2 })} act={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <B label="• List" on={editor.isActive("bulletList")} act={() => editor.chain().focus().toggleBulletList().run()} />
          <B label="❝" on={editor.isActive("blockquote")} act={() => editor.chain().focus().toggleBlockquote().run()} />
          <B label="‹›" on={editor.isActive("code")} act={() => editor.chain().focus().toggleCode().run()} />
          {v === 3 && <B label="🖼 Image" act={() => editor.chain().focus().setImage({ src: "https://picsum.photos/seed/stax/360/140" }).run()} />}
        </div>
        <EditorContent editor={editor} className={v === 2 ? "blog-host" : undefined} />
      </div>
      <div style={{ fontSize: 10.5, ...muted }}>
        {v === 1 ? "Default editor: StarterKit, fully editable right now." : v === 2 ? "Blog mode: serif voice, placeholder, headings & quotes." : "Note-taker: click 🖼 Image to insert, then keep typing around it."}
      </div>
    </Zone>
  );
}

