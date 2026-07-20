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

export type PanelSize = "S" | "M" | "L" | "XL";
export const PANEL_WIDTHS: Record<PanelSize, number> = { S: 380, M: 480, L: 640, XL: 800 };

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
  reset: () => void;
}

const Ctx = createContext<WorkspaceApi | null>(null);

export function useWorkspace(): WorkspaceApi {
  const api = useContext(Ctx);
  if (!api) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
  return api;
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
  children: ReactNode;
}

export function WorkspaceProvider({
  registry,
  urlSync = true,
  storageKey,
  children,
}: WorkspaceProviderProps) {
  const urlMode = urlSync === true ? "replace" : urlSync; // false | "replace" | "push"
  const [state, setState] = useState<WorkspaceState>(() => {
    // Restore the device-local snapshot FIRST — it is the only carrier of the
    // reference rail (the URL encodes just the ContextPath). Then reconcile the
    // URL ON TOP of it: openPath reveals-never-duplicates, so pins survive a
    // reload instead of being rebuilt away and then clobbered by the persist.
    let base = emptyWorkspace();
    if (storageKey && typeof localStorage !== "undefined") {
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const snap = JSON.parse(raw) as WorkspaceState;
          if (snap && snap.schemaVersion === 1 && validate(snap).length === 0) base = snap;
        }
      } catch {
        /* malformed snapshot degrades to empty — never throws */
      }
    }
    if (urlMode && typeof location !== "undefined" && location.hash.length > 1) {
      const loc = decodeLocation(location.hash.slice(1));
      if (loc) return reconcileLocation(base, loc);
    }
    return base;
  });

  // set while applying a popstate — that state change must not push again
  const popApply = useRef(false);

  useEffect(() => {
    if (urlMode && typeof location !== "undefined") {
      const encoded = encodeLocation(state);
      const current = location.hash.slice(1);
      if (encoded !== current) {
        if (urlMode === "push" && !popApply.current && current !== "" && encoded !== "") {
          history.pushState(null, "", "#" + encoded);
        } else {
          history.replaceState(null, "", encoded ? "#" + encoded : location.pathname);
        }
      }
      popApply.current = false;
    }
    if (storageKey && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        /* quota errors are non-fatal */
      }
    }
  }, [state, urlMode, storageKey]);

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
        setState((s) => fn(s, ...args)),
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
