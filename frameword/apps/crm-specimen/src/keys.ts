/**
 * Platform-aware shortcut GLYPHS: mac shows ⌘/⌃/⇧⌘, everything else spells
 * Ctrl+. Bindings themselves are unchanged (mod = meta on mac, ctrl elsewhere
 * is already how the handlers read events); this maps the HINTS the user sees.
 */
const isMac = typeof navigator !== "undefined" && /Mac|iP(hone|ad|od)/.test(navigator.platform);

export const K = {
  mod: isMac ? "⌘" : "Ctrl+",
  shiftMod: isMac ? "⇧⌘" : "Ctrl+Shift+",
  ctrl: isMac ? "⌃" : "Ctrl+",
};

/** mk("K") → "⌘K" on mac, "Ctrl+K" elsewhere */
export const mk = (k: string) => K.mod + k;
