import { describe, expect, test } from "bun:test";
import {
  emptyWorkspace,
  openSpace,
  openDetail,
  pinPanel,
  unpinPanel,
  closePanel,
  navigateTo,
  navigateUp,
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
} from "../src/index";

const T = (panelType: string, resourceKey: string): PanelTarget => ({ panelType, resourceKey });
const keys = (s: WorkspaceState) => getContextPath(s).map((id) => s.panelsById[id].target.resourceKey);
const refKeys = (s: WorkspaceState) => s.referenceRailOrder.map((id) => s.panelsById[id].target.resourceKey);
const leaf = (s: WorkspaceState) => s.panelsById[s.contextLeafId!];

/** CRM fixture: account → contact → opportunity chain */
function crmChain(): WorkspaceState {
  let s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
  s = openDetail(s, s.contextLeafId!, T("account", "acme"));
  s = openDetail(s, s.contextLeafId!, T("contact", "jo"));
  return s;
}

describe("openSpace", () => {
  test("creates the root, path = [root]", () => {
    const s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    expect(keys(s)).toEqual(["accounts"]);
    expect(s.panelsById[s.rootInstanceId!].role).toBe("root");
    expect(validate(s)).toEqual([]);
  });
  test("same space + same target = reveal, never duplicate", () => {
    const a = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    const b = openSpace(a, "crm", T("space", "accounts"));
    expect(Object.keys(b.panelsById).length).toBe(1);
  });
  test("cross-Space references: refs SURVIVE a Space switch", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);
    s = openDetail(s, getContextPath(s)[1], T("contact", "max")); // detaches jo
    expect(refKeys(s)).toEqual(["jo"]);
    const other = openSpace(s, "reports", T("space", "reports"));
    expect(refKeys(other)).toEqual(["jo"]);          // the pin is yours whatever the page
    expect(keys(other)).toEqual(["reports"]);        // the active thread was replaced
    expect(validate(other)).toEqual([]);
  });
  test("a pinned ATTACHED panel detaches (not dies) on a Space switch", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);               // jo pinned, still attached
    const other = openSpace(s, "reports", T("space", "reports"));
    expect(refKeys(other)).toEqual(["jo"]);
    expect(other.panelsById[other.referenceRailOrder[0]].parentInstanceId).toBeNull();
    expect(validate(other)).toEqual([]);
  });
});

describe("openDetail — context-scoped identity", () => {
  test("drill keeps the parent; leaf is a preview", () => {
    const s = crmChain();
    expect(keys(s)).toEqual(["accounts", "acme", "jo"]);
    expect(leaf(s).retention).toBe("preview");
    expect(validate(s)).toEqual([]);
  });
  test("sibling from the same parent replaces the preview", () => {
    let s = crmChain();
    const acme = getContextPath(s)[1];
    s = openDetail(s, acme, T("contact", "max"));
    expect(keys(s)).toEqual(["accounts", "acme", "max"]);
    expect(Object.values(s.panelsById).some((p) => p.target.resourceKey === "jo")).toBe(false);
  });
  test("same target + same parent reveals (no duplicate)", () => {
    let s = crmChain();
    const acme = getContextPath(s)[1];
    const before = Object.keys(s.panelsById).length;
    s = openDetail(s, acme, T("contact", "jo"));
    expect(Object.keys(s.panelsById).length).toBe(before);
  });
  test("same target under a DIFFERENT parent = distinct instance", () => {
    let s = crmChain();
    s = openDetail(s, s.contextLeafId!, T("doc", "brief"));
    s = pinPanel(s, s.contextLeafId!);
    const jo = getContextPath(s)[2];
    s = openDetail(s, jo, T("opp", "bigdeal"));       // detaches pinned "brief"
    s = openDetail(s, s.contextLeafId!, T("doc", "brief")); // same doc, new parent
    const instances = Object.values(s.panelsById).filter((p) => p.target.resourceKey === "brief");
    expect(instances.map((p) => p.placement).sort()).toEqual(["context", "reference"]);
    expect(validate(s)).toEqual([]);
  });
});

describe("pin → detach (the flagship v2 transition)", () => {
  test("retained descendant detaches into the reference rail on branch change", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!); // pin "jo"
    const acme = getContextPath(s)[1];
    s = openDetail(s, acme, T("contact", "max"));
    expect(keys(s)).toEqual(["accounts", "acme", "max"]);
    expect(refKeys(s)).toEqual(["jo"]);
    const ref = s.panelsById[s.referenceRailOrder[0]];
    expect(ref.parentInstanceId).toBeNull();
    expect(ref.placement).toBe("reference");
    expect(validate(s)).toEqual([]);
  });
  test("preview descendants close on branch change", () => {
    let s = crmChain(); // jo is preview
    const acme = getContextPath(s)[1];
    s = openDetail(s, acme, T("contact", "max"));
    expect(s.referenceRailOrder).toEqual([]);
  });
  test("duplicate referenceKey: the existing reference wins", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);
    const acme = getContextPath(s)[1];
    s = openDetail(s, acme, T("contact", "max"));      // jo → reference
    s = openDetail(s, acme, T("contact", "jo"));        // fresh attached jo again
    s = pinPanel(s, s.contextLeafId!);
    s = openDetail(s, acme, T("contact", "max"));       // would detach a 2nd jo
    expect(refKeys(s)).toEqual(["jo"]);                 // still exactly one
    expect(validate(s)).toEqual([]);
  });
  test("unpin on an attached panel → preview; on a reference → closes it", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);
    const acme = getContextPath(s)[1];
    s = openDetail(s, acme, T("contact", "max"));
    const refId = s.referenceRailOrder[0];
    s = unpinPanel(s, refId);
    expect(s.referenceRailOrder).toEqual([]);
    expect(s.panelsById[refId]).toBeUndefined();
  });
});

describe("pinned ROOT — a pin outlives its Space, the root included", () => {
  test("pinPanel on the root sets pinned (retention stays retained)", () => {
    let s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    s = pinPanel(s, s.rootInstanceId!);
    const root = s.panelsById[s.rootInstanceId!];
    expect(root.pinned).toBe(true);
    expect(root.retention).toBe("retained");
    expect(validate(s)).toEqual([]);
  });
  test("a pinned root DETACHES into the rail on a Space switch — demoted to a plain reference", () => {
    let s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    s = pinPanel(s, s.rootInstanceId!);
    s = openSpace(s, "reports", T("space", "reports"));
    expect(keys(s)).toEqual(["reports"]);
    expect(refKeys(s)).toEqual(["accounts"]);
    const ref = s.panelsById[s.referenceRailOrder[0]];
    expect(ref.role).toBe("detail");
    expect(ref.placement).toBe("reference");
    expect(ref.parentInstanceId).toBeNull();
    expect(validate(s)).toEqual([]);
  });
  test("an UNpinned root is deleted on a Space switch (unchanged behavior)", () => {
    let s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    s = openSpace(s, "reports", T("space", "reports"));
    expect(refKeys(s)).toEqual([]);
    expect(Object.keys(s.panelsById).length).toBe(1);
  });
  test("unpinPanel on a pinned root clears the pin", () => {
    let s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    s = pinPanel(s, s.rootInstanceId!);
    s = unpinPanel(s, s.rootInstanceId!);
    expect(s.panelsById[s.rootInstanceId!].pinned).toBe(false);
    s = openSpace(s, "reports", T("space", "reports"));
    expect(refKeys(s)).toEqual([]);
  });
  test("closing a pinned root detaches it and empties the thread", () => {
    let s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    s = pinPanel(s, s.rootInstanceId!);
    s = closePanel(s, s.rootInstanceId!);
    expect(s.rootInstanceId).toBeNull();
    expect(s.spaceId).toBeNull();
    expect(refKeys(s)).toEqual(["accounts"]);
    expect(validate(s)).toEqual([]);
  });
  test("closing a root-born reference removes ONLY the reference (never nulls the thread)", () => {
    let s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    s = pinPanel(s, s.rootInstanceId!);
    s = openSpace(s, "reports", T("space", "reports"));
    const refId = s.referenceRailOrder[0];
    s = closePanel(s, refId);
    expect(s.panelsById[refId]).toBeUndefined();
    expect(keys(s)).toEqual(["reports"]);              // active thread untouched
    expect(validate(s)).toEqual([]);
  });
  test("pinned-root detach with its own pinned descendant: BOTH reach the rail", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);                 // pin jo
    s = pinPanel(s, s.rootInstanceId!);                // pin the root too
    s = openSpace(s, "reports", T("space", "reports"));
    expect(refKeys(s).sort()).toEqual(["accounts", "jo"]);
    expect(validate(s)).toEqual([]);
  });
  test("RELOAD CONTRACT: reconciling a URL location on top of a snapshot keeps the rail", () => {
    // the URL encodes only the ContextPath — restoring must never rebuild from
    // empty, or every pin dies on reload and the persist clobbers the snapshot
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);
    s = openDetail(s, getContextPath(s)[1], T("contact", "max")); // jo → rail
    const loc = decodeLocation(encodeLocation(s));
    const restored = reconcileLocation(s, loc!);
    expect(refKeys(restored)).toEqual(["jo"]);                    // pins survive
    expect(keys(restored)).toEqual(keys(s));                      // path identical
    expect(Object.keys(restored.panelsById).length).toBe(Object.keys(s.panelsById).length); // reveal, never duplicate
    expect(validate(restored)).toEqual([]);
  });
  test("duplicate guard: a rail reference for the same target wins over a detaching root", () => {
    let s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    s = pinPanel(s, s.rootInstanceId!);
    s = openSpace(s, "reports", T("space", "reports")); // accounts → rail
    s = openSpace(s, "crm", T("space", "accounts"));    // fresh accounts root
    s = pinPanel(s, s.rootInstanceId!);
    s = openSpace(s, "reports", T("space", "reports")); // would detach a 2nd accounts
    expect(refKeys(s)).toEqual(["accounts"]);           // still exactly one
    expect(validate(s)).toEqual([]);
  });
});

describe("close & navigate — subtree policy, no silent orphans", () => {
  test("closing a middle ancestor: previews close, retained detach", () => {
    let s = crmChain();
    s = openDetail(s, s.contextLeafId!, T("opp", "bigdeal"));
    s = pinPanel(s, s.contextLeafId!);
    const acmeId = getContextPath(s)[1];
    s = closePanel(s, getContextPath(s)[2]); // close "jo" (parent of pinned bigdeal)
    expect(keys(s)).toEqual(["accounts", "acme"]);
    expect(refKeys(s)).toEqual(["bigdeal"]);
    expect(s.contextLeafId).toBe(acmeId);
    expect(validate(s)).toEqual([]);
  });
  test("ROOT PROMOTION: closing the root with a drill open hands the lead to the child — same space", () => {
    let s = crmChain(); // accounts → acme → jo
    s = closePanel(s, s.rootInstanceId!);
    expect(s.spaceId).toBe("crm");                     // we STAY on the page
    expect(keys(s)).toEqual(["acme", "jo"]);           // the chain shifted left
    const root = s.panelsById[s.rootInstanceId!];
    expect(root.target.resourceKey).toBe("acme");
    expect(root.role).toBe("root");
    expect(root.parentInstanceId).toBeNull();
    expect(validate(s)).toEqual([]);
  });
  test("ROOT PROMOTION: a PINNED root detaches to the rail while its child takes the lead", () => {
    let s = crmChain();
    s = pinPanel(s, s.rootInstanceId!);
    s = closePanel(s, s.rootInstanceId!);
    expect(keys(s)).toEqual(["acme", "jo"]);
    expect(refKeys(s)).toEqual(["accounts"]);          // the old root rides the rail
    expect(validate(s)).toEqual([]);
  });
  test("closing the LAST panel (root alone) empties the workspace", () => {
    let s = openSpace(emptyWorkspace(), "crm", T("space", "accounts"));
    s = closePanel(s, s.rootInstanceId!);
    expect(s.spaceId).toBeNull();
    expect(Object.keys(s.panelsById).length).toBe(0);
  });
  test("closing the root repeatedly walks the chain — the space ends only at the last panel", () => {
    let s = crmChain();                                 // accounts → acme → jo
    s = closePanel(s, s.rootInstanceId!);               // acme leads
    s = closePanel(s, s.rootInstanceId!);               // jo leads
    expect(keys(s)).toEqual(["jo"]);
    expect(s.spaceId).toBe("crm");
    s = closePanel(s, s.rootInstanceId!);               // last one — thread ends
    expect(s.spaceId).toBeNull();
    expect(validate(s)).toEqual([]);
  });
  test("promotion keeps a pinned DESCENDANT attached (nothing detaches on root close)", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);                  // pin jo, still attached
    s = closePanel(s, s.rootInstanceId!);               // acme promoted
    expect(keys(s)).toEqual(["acme", "jo"]);            // jo STAYS attached
    expect(refKeys(s)).toEqual([]);                     // nothing forced into the rail
    expect(validate(s)).toEqual([]);
  });
  test("navigateTo an ancestor applies the subtree policy below it", () => {
    let s = crmChain();
    s = navigateTo(s, getContextPath(s)[1]);
    expect(keys(s)).toEqual(["accounts", "acme"]);
  });
  test("navigateUp = navigateTo(parent)", () => {
    let s = crmChain();
    s = navigateUp(s);
    expect(keys(s)).toEqual(["accounts", "acme"]);
  });
});

describe("openPath / deep-link — the reveal-cursor regression", () => {
  test("builds a full chain from empty", () => {
    const s = openPath(emptyWorkspace(), "crm", [
      T("space", "accounts"), T("account", "acme"), T("contact", "jo"),
    ]);
    expect(keys(s)).toEqual(["accounts", "acme", "jo"]);
    expect(validate(s)).toEqual([]);
  });
  test("REVEALS existing prefix without duplicating (regression: cursor must advance)", () => {
    let s = crmChain(); // accounts/acme/jo already open
    s = openPath(s, "crm", [
      T("space", "accounts"), T("account", "acme"), T("contact", "jo"), T("opp", "bigdeal"),
    ]);
    expect(keys(s)).toEqual(["accounts", "acme", "jo", "bigdeal"]);
    const acmes = Object.values(s.panelsById).filter((p) => p.target.resourceKey === "acme");
    expect(acmes.length).toBe(1); // no duplicate instances of the prefix
  });
  test("resumeReference returns the target and a clean state to rebuild from", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);
    s = openDetail(s, getContextPath(s)[1], T("contact", "max"));
    const refId = s.referenceRailOrder[0];
    const { state: s2, target } = resumeReference(s, refId);
    expect(target?.resourceKey).toBe("jo");
    expect(s2.referenceRailOrder).toEqual([]);
    const s3 = openPath(s2, "crm", [T("space", "accounts"), T("account", "acme"), target!]);
    expect(keys(s3)).toEqual(["accounts", "acme", "jo"]);
    expect(validate(s3)).toEqual([]);
  });
});

describe("references rail", () => {
  test("only references reorder; ancestry never does", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);
    const acme = getContextPath(s)[1];
    s = openDetail(s, acme, T("contact", "max"));
    s = pinPanel(s, s.contextLeafId!);
    s = openDetail(s, acme, T("contact", "zoe"));
    expect(refKeys(s)).toEqual(["jo", "max"]);
    s = moveReference(s, s.referenceRailOrder[0], 1);
    expect(refKeys(s)).toEqual(["max", "jo"]);
  });
});

describe("URL codec — ContextPath alone is shareable", () => {
  test("encode/decode round-trip and reconcileLocation rebuilds the path", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!); // references must NOT leak into the URL
    const url = encodeLocation(s)!;
    const loc = decodeLocation(url)!;
    expect(loc.spaceId).toBe("crm");
    expect(loc.path.map((p) => p.k)).toEqual(["accounts", "acme", "jo"]);
    const restored = reconcileLocation(emptyWorkspace(), loc);
    expect(keys(restored)).toEqual(["accounts", "acme", "jo"]);
    expect(restored.referenceRailOrder).toEqual([]); // device-local, not in the URL
    expect(validate(restored)).toEqual([]);
  });
  test("malformed URLs degrade to null, never throw", () => {
    expect(decodeLocation("%7Bnot-json")).toBeNull();
    expect(decodeLocation(encodeURIComponent('{"nope":1}'))).toBeNull();
    expect(decodeLocation("not-json")).toBeNull(); // bare token, no path
  });
  test("the hash is readable, not a percent-encoded JSON blob", () => {
    const url = encodeLocation(crmChain())!;
    expect(url.startsWith("/crm/")).toBe(true);
    expect(url).not.toContain("%7B"); // no encoded "{"
    expect(url).toContain("~"); // type~key segments
  });
  test("legacy JSON-blob links still decode (backward-compat)", () => {
    const legacy = encodeURIComponent(
      JSON.stringify({ spaceId: "crm", path: [{ t: "space", k: "accounts" }] }),
    );
    const loc = decodeLocation(legacy)!;
    expect(loc.spaceId).toBe("crm");
    expect(loc.path.map((p) => p.k)).toEqual(["accounts"]);
  });
});

describe("purity & validity", () => {
  test("commands never mutate their input state", () => {
    const s = crmChain();
    const snapshot = JSON.stringify(s);
    openDetail(s, s.contextLeafId!, T("opp", "x"));
    pinPanel(s, s.contextLeafId!);
    closePanel(s, s.contextLeafId!);
    navigateUp(s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
  test("every scenario in this file ends in a valid state (spot check via fuzz walk)", () => {
    let s = emptyWorkspace();
    s = openSpace(s, "crm", T("space", "accounts"));
    for (let i = 0; i < 50; i++) {
      const path = getContextPath(s);
      const from = path[i % path.length];
      s = openDetail(s, from, T("node", "n" + (i % 7)));
      if (i % 3 === 0 && s.contextLeafId) s = pinPanel(s, s.contextLeafId);
      if (i % 5 === 0 && path.length > 1) s = navigateTo(s, path[0]);
      expect(validate(s)).toEqual([]);
    }
  });
});
