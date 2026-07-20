/**
 * @frameword/panels-core — the serializable panel-workspace state machine.
 *
 * Implements the Frameword v2 model (CONCEPT-BRIEF.md):
 * - ancestry is a tree of parent links, NEVER visual order;
 * - ContextPath is DERIVED from parent links;
 * - retained panels orphaned by a branch change DETACH into the reference rail;
 * - attached-instance identity is context-scoped (same target + same parent reveals,
 *   a different parent creates a distinct instance);
 * - navigation state is JSON only — no components, closures, or fetched rows.
 *
 * Pure TypeScript. No React, no DOM, no backend.
 */

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface PanelTarget {
  panelType: string;
  resourceKey: string;
  params?: Record<string, JsonValue>;
}

export type PanelRole = "root" | "detail";
export type PanelRetention = "preview" | "retained";
export type PanelPlacement = "context" | "reference";

export interface PanelInstance {
  instanceId: string;
  target: PanelTarget;
  spaceId: string;
  parentInstanceId: string | null;
  role: PanelRole;
  retention: PanelRetention;
  placement: PanelPlacement;
  /** roots only: a pinned root DETACHES into the reference rail when its
   *  Space is replaced or closed, instead of being deleted — a pin outlives
   *  its Space, the root included. (Non-roots use `retention`.) */
  pinned?: boolean;
}

export interface WorkspaceState {
  schemaVersion: 1;
  spaceId: string | null;
  rootInstanceId: string | null;
  contextLeafId: string | null;
  focusedPanelId: string | null;
  panelsById: Record<string, PanelInstance>;
  referenceRailOrder: string[];
  /** monotonic counter so instance ids are deterministic and the reducer stays pure */
  nextId: number;
}

export function emptyWorkspace(): WorkspaceState {
  return {
    schemaVersion: 1,
    spaceId: null,
    rootInstanceId: null,
    contextLeafId: null,
    focusedPanelId: null,
    panelsById: {},
    referenceRailOrder: [],
    nextId: 1,
  };
}

/* ── helpers ──────────────────────────────────────────────────────────── */

const sameTarget = (a: PanelTarget, b: PanelTarget) =>
  a.panelType === b.panelType && a.resourceKey === b.resourceKey;

const clone = (s: WorkspaceState): WorkspaceState => ({
  ...s,
  panelsById: Object.fromEntries(
    Object.entries(s.panelsById).map(([k, v]) => [k, { ...v, target: { ...v.target } }]),
  ),
  referenceRailOrder: [...s.referenceRailOrder],
});

const mint = (s: WorkspaceState): string => `p${s.nextId++}`;

/** The current semantic ancestry, root → leaf. DERIVED — never stored. */
export function getContextPath(s: WorkspaceState): string[] {
  const out: string[] = [];
  let id = s.contextLeafId;
  while (id) {
    const p = s.panelsById[id];
    if (!p) break;
    out.unshift(id);
    id = p.parentInstanceId;
  }
  return out;
}

/** Attached descendants of `parentId` (depth-first, excluding the parent). */
export function getSubtree(s: WorkspaceState, parentId: string): string[] {
  const out: string[] = [];
  const walk = (pid: string) => {
    for (const p of Object.values(s.panelsById)) {
      if (p.parentInstanceId === pid && p.placement === "context") {
        out.push(p.instanceId);
        walk(p.instanceId);
      }
    }
  };
  walk(parentId);
  return out;
}

export function getAttachedChild(
  s: WorkspaceState,
  parentId: string,
  target: PanelTarget,
): PanelInstance | undefined {
  return Object.values(s.panelsById).find(
    (p) =>
      p.parentInstanceId === parentId &&
      p.placement === "context" &&
      sameTarget(p.target, target),
  );
}

/**
 * Subtree policy on a branch change below `parentId`:
 * preview descendants close; retained descendants DETACH into the reference rail
 * (an existing reference for the same canonical target wins — the new one is dropped).
 * Mutates `s` (callers own a fresh clone).
 */
function applyBranchPolicy(s: WorkspaceState, parentId: string): void {
  for (const id of getSubtree(s, parentId)) {
    const p = s.panelsById[id];
    if (!p) continue;
    if (p.retention === "retained") {
      const dupe = s.referenceRailOrder.find((r) =>
        sameTarget(s.panelsById[r].target, p.target),
      );
      if (dupe) {
        delete s.panelsById[id];
      } else {
        p.placement = "reference";
        p.parentInstanceId = null;
        s.referenceRailOrder.push(id);
      }
    } else {
      delete s.panelsById[id];
    }
  }
}

/* ── commands (intent verbs — each returns a NEW state) ───────────────── */

export function openSpace(
  state: WorkspaceState,
  spaceId: string,
  target: PanelTarget,
): WorkspaceState {
  if (state.rootInstanceId) {
    const root = state.panelsById[state.rootInstanceId];
    if (root && state.spaceId === spaceId && sameTarget(root.target, target)) {
      return { ...clone(state), focusedPanelId: state.rootInstanceId }; // reveal, never duplicate
    }
  }
  // cross-Space references: switching Space replaces the active thread only.
  // Retained attached panels DETACH into the reference rail; previews close;
  // existing references survive — a pin is yours whatever the page.
  const s = clone(state);
  if (s.rootInstanceId && s.panelsById[s.rootInstanceId]) {
    applyBranchPolicy(s, s.rootInstanceId);
    detachOrDeleteRoot(s, s.rootInstanceId);
  }
  const id = mint(s);
  s.panelsById[id] = {
    instanceId: id,
    target,
    spaceId,
    parentInstanceId: null,
    role: "root",
    retention: "retained",
    placement: "context",
  };
  s.spaceId = spaceId;
  s.rootInstanceId = id;
  s.contextLeafId = id;
  s.focusedPanelId = id;
  return s;
}

export function openDetail(
  state: WorkspaceState,
  parentInstanceId: string,
  target: PanelTarget,
): WorkspaceState {
  const s = clone(state);
  if (!s.panelsById[parentInstanceId]) return s;
  const existing = getAttachedChild(s, parentInstanceId, target);
  if (existing) {
    // same target + same parent = reveal and focus, never a duplicate
    s.focusedPanelId = existing.instanceId;
    return s;
  }
  applyBranchPolicy(s, parentInstanceId);
  const id = mint(s);
  s.panelsById[id] = {
    instanceId: id,
    target,
    spaceId: s.spaceId!,
    parentInstanceId,
    role: "detail",
    retention: "preview",
    placement: "context",
  };
  s.contextLeafId = id;
  s.focusedPanelId = id;
  return s;
}

/** A replaced/closed root: a PINNED root detaches into the reference rail
 *  (an existing reference for the same target wins); an unpinned one is deleted.
 *  Detaching DEMOTES role → "detail": "root" names a position in the active
 *  thread, and a detached panel no longer holds it (invariant: one root). */
function detachOrDeleteRoot(s: WorkspaceState, rootId: string): void {
  const root = s.panelsById[rootId];
  if (!root) return;
  const dupe = s.referenceRailOrder.find((r) => sameTarget(s.panelsById[r].target, root.target));
  if (root.pinned && !dupe) {
    root.role = "detail";
    root.placement = "reference";
    root.parentInstanceId = null;
    root.pinned = false;
    s.referenceRailOrder.push(rootId);
  } else {
    delete s.panelsById[rootId];
  }
}

export function pinPanel(state: WorkspaceState, instanceId: string): WorkspaceState {
  const s = clone(state);
  const p = s.panelsById[instanceId];
  if (!p || p.placement !== "context") return s;
  if (p.role === "root") p.pinned = true;
  else p.retention = "retained";
  return s;
}

/** Attached panel → back to preview (root: unpinned). Detached reference → closes it. */
export function unpinPanel(state: WorkspaceState, instanceId: string): WorkspaceState {
  const s = clone(state);
  const p = s.panelsById[instanceId];
  if (!p) return s;
  if (p.placement === "reference") {
    s.referenceRailOrder = s.referenceRailOrder.filter((r) => r !== instanceId);
    delete s.panelsById[instanceId];
    return s;
  }
  if (p.role === "root") p.pinned = false;
  else p.retention = "preview";
  return s;
}

export function closePanel(state: WorkspaceState, instanceId: string): WorkspaceState {
  const p = state.panelsById[instanceId];
  if (!p) return clone(state);
  // a detached reference closes as a reference — even one that was a root once
  if (p.placement === "reference") {
    const s = clone(state);
    s.referenceRailOrder = s.referenceRailOrder.filter((r) => r !== instanceId);
    delete s.panelsById[instanceId];
    return s;
  }
  if (p.role === "root") {
    // closing the root ends the thread — pinned descendants detach first,
    // and existing references survive (a pin outlives its space)
    const s = clone(state);
    applyBranchPolicy(s, instanceId);
    detachOrDeleteRoot(s, instanceId);
    s.spaceId = null;
    s.rootInstanceId = null;
    s.contextLeafId = null;
    s.focusedPanelId = null;
    return s;
  }
  const s = clone(state);
  applyBranchPolicy(s, instanceId); // its descendants: previews close, retained detach
  const parent = s.panelsById[instanceId].parentInstanceId;
  delete s.panelsById[instanceId];
  // the leaf/focus must point at an ATTACHED panel — a descendant that just became
  // a detached reference still exists but is no longer part of the ancestry
  const leafP = s.contextLeafId ? s.panelsById[s.contextLeafId] : undefined;
  if (!leafP || leafP.placement !== "context") s.contextLeafId = parent;
  const focP = s.focusedPanelId ? s.panelsById[s.focusedPanelId] : undefined;
  if (!focP || focP.placement !== "context") s.focusedPanelId = parent;
  return s;
}

/** Breadcrumb click: the leaf becomes `instanceId`; the branch below follows the subtree policy. */
export function navigateTo(state: WorkspaceState, instanceId: string): WorkspaceState {
  const s = clone(state);
  if (!s.panelsById[instanceId]) return s;
  applyBranchPolicy(s, instanceId);
  s.contextLeafId = instanceId;
  s.focusedPanelId = instanceId;
  return s;
}

export function navigateUp(state: WorkspaceState): WorkspaceState {
  const leaf = state.contextLeafId ? state.panelsById[state.contextLeafId] : undefined;
  if (!leaf || !leaf.parentInstanceId) return clone(state);
  return navigateTo(state, leaf.parentInstanceId);
}

export function focusPanel(state: WorkspaceState, instanceId: string): WorkspaceState {
  const s = clone(state);
  if (s.panelsById[instanceId]) s.focusedPanelId = instanceId;
  return s;
}

/**
 * Deep-link / reconcileLocation / resumeReference reconstruction:
 * opens the chain of targets root-first, REVEALING existing attached instances
 * (advancing the cursor — never duplicating) and creating the rest.
 * The branch below the final target follows the subtree policy.
 */
export function openPath(
  state: WorkspaceState,
  spaceId: string,
  targets: PanelTarget[],
): WorkspaceState {
  if (targets.length === 0) return clone(state);
  let s = openSpace(state, spaceId, targets[0]);
  let cursor = s.rootInstanceId!;
  for (let i = 1; i < targets.length; i++) {
    const existing = getAttachedChild(s, cursor, targets[i]);
    if (existing) {
      cursor = existing.instanceId; // reveal = advance, never duplicate
    } else {
      s = openDetail(s, cursor, targets[i]);
      cursor = s.contextLeafId!;
    }
  }
  applyBranchPolicy(s, cursor);
  s.contextLeafId = cursor;
  s.focusedPanelId = cursor;
  return s;
}

/**
 * Removes the reference and returns its target so the route adapter can
 * reconstruct a fresh ContextPath (core stays domain-agnostic).
 */
export function resumeReference(
  state: WorkspaceState,
  instanceId: string,
): { state: WorkspaceState; target: PanelTarget | null } {
  const p = state.panelsById[instanceId];
  if (!p || p.placement !== "reference") return { state: clone(state), target: null };
  const s = clone(state);
  s.referenceRailOrder = s.referenceRailOrder.filter((r) => r !== instanceId);
  delete s.panelsById[instanceId];
  return { state: s, target: { ...p.target } };
}

export function moveReference(
  state: WorkspaceState,
  instanceId: string,
  dir: -1 | 1,
): WorkspaceState {
  const s = clone(state);
  const i = s.referenceRailOrder.indexOf(instanceId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= s.referenceRailOrder.length) return s;
  [s.referenceRailOrder[i], s.referenceRailOrder[j]] = [
    s.referenceRailOrder[j],
    s.referenceRailOrder[i],
  ];
  return s;
}

/* ── invariant validation (engine invariants 1–10) ────────────────────── */

export function validate(s: WorkspaceState): string[] {
  const errors: string[] = [];
  const roots = Object.values(s.panelsById).filter((p) => p.role === "root");
  if (roots.length > 1) errors.push("more than one RootPanel");
  if (s.rootInstanceId && !s.panelsById[s.rootInstanceId]) errors.push("rootInstanceId dangling");
  for (const p of Object.values(s.panelsById)) {
    if (p.role === "root") {
      if (p.parentInstanceId !== null) errors.push(`root ${p.instanceId} has a parent`);
      if (p.retention !== "retained" || p.placement !== "context")
        errors.push(`root ${p.instanceId} must be retained+context`);
    }
    if (p.placement === "reference") {
      if (p.parentInstanceId !== null) errors.push(`reference ${p.instanceId} has an active parent`);
      if (p.retention !== "retained") errors.push(`reference ${p.instanceId} must be retained`);
      if (!s.referenceRailOrder.includes(p.instanceId))
        errors.push(`reference ${p.instanceId} missing from rail order`);
    }
    if (p.placement === "context" && p.role !== "root") {
      if (!p.parentInstanceId || !s.panelsById[p.parentInstanceId])
        errors.push(`attached ${p.instanceId} is an orphan`);
    }
    // cycle check
    const seen = new Set<string>();
    let id: string | null = p.instanceId;
    while (id) {
      if (seen.has(id)) { errors.push(`cycle through ${p.instanceId}`); break; }
      seen.add(id);
      id = s.panelsById[id]?.parentInstanceId ?? null;
    }
  }
  for (const r of s.referenceRailOrder)
    if (!s.panelsById[r]) errors.push(`rail order entry ${r} dangling`);
  if (s.contextLeafId && !s.panelsById[s.contextLeafId]) errors.push("contextLeafId dangling");
  if (s.contextLeafId && s.panelsById[s.contextLeafId]?.placement !== "context")
    errors.push("contextLeafId points at a detached reference");
  if (s.focusedPanelId && !s.panelsById[s.focusedPanelId]) errors.push("focusedPanelId dangling");
  return errors;
}

/* ── URL codec : the ContextPath alone is URL-shareable ───────────────── */

export interface EncodedLocation {
  spaceId: string;
  path: { t: string; k: string }[];
}

export function encodeLocation(s: WorkspaceState): string | null {
  if (!s.spaceId || !s.rootInstanceId) return null;
  const loc: EncodedLocation = {
    spaceId: s.spaceId,
    path: getContextPath(s).map((id) => ({
      t: s.panelsById[id].target.panelType,
      k: s.panelsById[id].target.resourceKey,
    })),
  };
  return encodeURIComponent(JSON.stringify(loc));
}

export function decodeLocation(encoded: string): EncodedLocation | null {
  try {
    const loc = JSON.parse(decodeURIComponent(encoded));
    if (typeof loc?.spaceId !== "string" || !Array.isArray(loc?.path)) return null;
    for (const seg of loc.path)
      if (typeof seg?.t !== "string" || typeof seg?.k !== "string") return null;
    return loc as EncodedLocation;
  } catch {
    return null;
  }
}

/** reconcileLocation: rebuild the workspace from a decoded URL. */
export function reconcileLocation(
  state: WorkspaceState,
  loc: EncodedLocation,
): WorkspaceState {
  return openPath(
    state,
    loc.spaceId,
    loc.path.map((seg) => ({ panelType: seg.t, resourceKey: seg.k })),
  );
}
