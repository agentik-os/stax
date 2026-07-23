/**
 * The rich-editor seam: RichNotes drags the whole tiptap/prosemirror stack
 * (~650 KB raw) — it must never ride in the main chunk. Every consumer
 * imports THIS wrapper; the editor code loads the first time one mounts.
 */
import { lazy, Suspense } from "react";

const Inner = lazy(() => import("./RichNotes").then((m) => ({ default: m.RichNotes })));

export function RichNotes(props: { html: string; onChange: (html: string) => void; placeholder?: string }) {
  return (
    <Suspense fallback={<div className="leaf-note">Loading the editor…</div>}>
      <Inner {...props} />
    </Suspense>
  );
}
