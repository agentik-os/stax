/**
 * @frameword/panels-react — React bindings for the panel workspace.
 * Provider + useWorkspace() intent commands + panel-type registry + URL/storage sync.
 * Bindings only — zero styling; the rendering layer lives in the app (shadcn-style).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  emptyWorkspace,
  openSpace,
  openDetail,
  pinPanel,
  unpinPanel,
  closePanel,
  navigateTo,
  navigateUp,
  focusPanel,
  openPath,
  resumeReference,
  moveReference,
  getContextPath,
  encodeLocation,
  decodeLocation,
  reconcileLocation,
  validate,
  type WorkspaceState,
  type PanelTarget,
  type PanelInstance,
} from "@frameword/panels-core";

/* ── panel-type registry ─────────────────────────────────────────────── */

export type PanelSize = "S" | "M" | "L" | "XL" | "XXL";
/** XXL is fluid: it FILLS the remaining stage (the number is its minimum). */
export const PANEL_WIDTHS: Record<PanelSize, number> = { S: 380, M: 480, L: 640, XL: 800, XXL: 720 };

export interface PanelTypeDef {
  /** default width class — width belongs to the kind, not the user */
  size: PanelSize;
  /** human label for palette/breadcrumb when the instance has no resolver */
  label?: (resourceKey: string) => string;
}

export type PanelRegistry = Record<string, PanelTypeDef>;

/* ── workspace context ───────────────────────────────────────────────── */

export interface WorkspaceApi {
  state: WorkspaceState;
  path: string[];
  violations: string[];
  registry: PanelRegistry;
  openSpace: (spaceId: string, target: PanelTarget) => void;
  openDetail: (parentInstanceId: string, target: PanelTarget) => void;
  pinPanel: (id: string) => void;
  unpinPanel: (id: string) => void;
  closePanel: (id: string) => void;
  navigateTo: (id: string) => void;
  navigateUp: () => void;
  focusPanel: (id: string) => void;
  openPath: (spaceId: string, targets: PanelTarget[]) => void;
  resumeReference: (id: string, rebuild: (target: PanelTarget) => void) => void;
  moveReference: (id: string, dir: -1 | 1) => void;
  /** replace the whole workspace with a saved snapshot (validated; undoable) */
  restore: (snapshot: WorkspaceState) => void;
  /** the undo stack, oldest first: each entry is the state BEFORE an intent */
  history: () => WorkspaceState[];
  /** step the workspace back to the state before the last intent (bounded stack) */
  undo: () => void;
  /** re-apply the last undone intent */
  redo: () => void;
  reset: () => void;
}

const Ctx = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return api;
}

/* ── persistence adapter ─────────────────────────────────────────────── */

/** Pluggable workspace persistence. `load` may be sync or async: an async
 *  snapshot is reconciled UNDER the current URL once it arrives (the URL's
 *  ContextPath always wins; the snapshot contributes the reference rail).
 *  The default adapter is localStorage via `storageKey`. */
export interface StorageAdapter {
  load(): WorkspaceState | null | Promise<WorkspaceState | null>;
  save(state: WorkspaceState): void;
}

export function localStorageAdapter(key: string): StorageAdapter {
  return {
    load() {
      if (typeof localStorage === "undefined") return null;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const snap = JSON.parse(raw) as WorkspaceState;
        return snap && snap.schemaVersion === 1 && validate(snap).length === 0 ? snap : null;
      } catch {
        return null; /* malformed snapshot degrades to empty — never throws */
      }
    },
    save(state) {
      if (typeof localStorage === "undefined") return;
      try {
        localStorage.setItem(key, JSON.stringify(state));
      } catch {
        /* quota errors are non-fatal */
      }
    },
  };
}

export interface WorkspaceProviderProps {
  registry: PanelRegistry;
  /** sync the ContextPath into location.hash and restore from it.
   *  true | "replace" — replaceState only (no history entries);
   *  "push" — every leaf change is a history entry and Back/Forward
   *  rewind the workspace via popstate (never exiting the app). */
  urlSync?: boolean | "replace" | "push";
  /** persist the whole workspace to localStorage under this key (used when no URL) */
  storageKey?: string;
  /** custom persistence backend; takes precedence over storageKey.
   *  `localStorageAdapter(key)` is what storageKey builds internally. */
  storage?: StorageAdapter;
  children: ReactNode;
}

export function WorkspaceProvider({
  registry,
  urlSync = true,
  storageKey,
  storage,
  children,
}: WorkspaceProviderProps) {
  const urlMode = urlSync === true ? "replace" : urlSync; // false | "replace" | "push"
  const adapter = useMemo<StorageAdapter | null>(
    () => storage ?? (storageKey ? localStorageAdapter(storageKey) : null),
    [storage, storageKey],
  );
  const [state, setState] = useState<WorkspaceState>(() => {
    // Restore the device-local snapshot FIRST — it is the only carrier of the
    // reference rail (the URL encodes just the ContextPath). Then reconcile the
    // URL ON TOP of it: openPath reveals-never-duplicates, so pins survive a
    // reload instead of being rebuilt away and then clobbered by the persist.
    let base = emptyWorkspace();
    const loaded = adapter?.load();
    if (loaded && !(loaded instanceof Promise)) base = loaded;
    if (urlMode && typeof location !== "undefined" && location.hash.length > 1) {
      const loc = decodeLocation(location.hash.slice(1));
      if (loc) return reconcileLocation(base, loc);
    }
    return base;
  });

  // an ASYNC adapter resolves after mount: reconcile the current URL on top,
  // exactly like the sync path (URL wins; the snapshot brings the rail)
  const asyncLoaded = useRef(false);
  useEffect(() => {
    const p = adapter?.load();
    if (!(p instanceof Promise) || asyncLoaded.current) return;
    asyncLoaded.current = true;
    p.then((snap) => {
      if (!snap) return;
      setState(() => {
        if (urlMode && typeof location !== "undefined" && location.hash.length > 1) {
          const loc = decodeLocation(location.hash.slice(1));
          if (loc) return reconcileLocation(snap, loc);
        }
        return snap;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adapter]);

  // bounded undo/redo stacks: every intent pushes the PREVIOUS state
  const undoStack = useRef<WorkspaceState[]>([]);
  const redoStack = useRef<WorkspaceState[]>([]);

  // set while applying a popstate — that state change must not push again
  const popApply = useRef(false);

  useEffect(() => {
    if (urlMode && typeof location !== "undefined") {
      const encoded = encodeLocation(state);
      const current = location.hash.slice(1);
      if (encoded !== current) {
        if (urlMode === "push" && !popApply.current && current !== "" && encoded) {
          history.pushState(null, "", "#" + encoded);
        } else {
          history.replaceState(null, "", encoded ? "#" + encoded : location.pathname);
        }
      }
      popApply.current = false;
    }
    adapter?.save(state);
  }, [state, urlMode, adapter]);

  // Back/Forward rewind the workspace instead of exiting the app
  useEffect(() => {
    if (urlMode !== "push" || typeof window === "undefined") return;
    const onPop = () => {
      const hash = location.hash.slice(1);
      if (!hash) return; // pre-app entry — let the browser leave naturally
      const loc = decodeLocation(hash);
      if (!loc) return;
      popApply.current = true;
      setState((s) => reconcileLocation(s, loc));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [urlMode]);

  const wrap = useCallback(
    <A extends unknown[]>(fn: (s: WorkspaceState, ...args: A) => WorkspaceState) =>
      (...args: A) =>
        setState((s) => {
          const next = fn(s, ...args);
          if (next !== s) {
            undoStack.current.push(s);
            if (undoStack.current.length > 50) undoStack.current.shift();
            redoStack.current = [];
          }
          return next;
        }),
    [],
  );

  const api = useMemo<WorkspaceApi>(
    () => ({
      state,
      path: getContextPath(state),
      violations: validate(state),
      registry,
      openSpace: wrap(openSpace),
      openDetail: wrap(openDetail),
      pinPanel: wrap(pinPanel),
      unpinPanel: wrap(unpinPanel),
      closePanel: wrap(closePanel),
      navigateTo: wrap(navigateTo),
      navigateUp: wrap(navigateUp),
      focusPanel: wrap(focusPanel),
      openPath: wrap(openPath),
      moveReference: wrap(moveReference),
      resumeReference: (id, rebuild) =>
        setState((s) => {
          const { state: s2, target } = resumeReference(s, id);
          if (target) queueMicrotask(() => rebuild(target));
          return s2;
        }),
      history: () => [...undoStack.current],
      restore: (snap) =>
        setState((s) => {
          if (!snap || snap.schemaVersion !== 1 || validate(snap).length > 0) return s;
          undoStack.current.push(s);
          if (undoStack.current.length > 50) undoStack.current.shift();
          redoStack.current = [];
          return snap;
        }),
      undo: () =>
        setState((s) => {
          const prev = undoStack.current.pop();
          if (!prev) return s;
          redoStack.current.push(s);
          return prev;
        }),
      redo: () =>
        setState((s) => {
          const next = redoStack.current.pop();
          if (!next) return s;
          undoStack.current.push(s);
          return next;
        }),
      reset: () => setState(emptyWorkspace()),
    }),
    [state, registry, wrap],
  );

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

/* ── presentation helpers (device-local, never navigation state) ─────── */

export function usePanel(id: string): PanelInstance | undefined {
  return useWorkspace().state.panelsById[id];
}

/** width of a panel: per-instance user override → registered kind default */
export function panelWidth(
  registry: PanelRegistry,
  p: PanelInstance,
  override?: PanelSize,
): number {
  const size = override ?? registry[p.target.panelType]?.size ?? "M";
  return PANEL_WIDTHS[size];
}

/** true below the PushHost breakpoint — one column, back-stack navigation.
 *  A non-positive innerWidth is a broken measurement (headless panes), not a phone. */
export function useIsCompact(breakpoint = 640): boolean {
  const measure = () =>
    typeof window !== "undefined" && window.innerWidth > 0 && window.innerWidth < breakpoint;
  const [compact, setCompact] = useState(measure);
  useEffect(() => {
    const h = () => setCompact(measure());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breakpoint]);
  return compact;
}
