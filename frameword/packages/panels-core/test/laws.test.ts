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
  test("closing the root with no pins empties the workspace", () => {
    const s = closePanel(crmChain(), getContextPath(crmChain())[0]);
    expect(Object.keys(s.panelsById).length).toBe(0);
  });
  test("closing the root PRESERVES pinned panels as references", () => {
    let s = crmChain();
    s = pinPanel(s, s.contextLeafId!);               // pin jo, still attached
    s = closePanel(s, getContextPath(s)[0]);         // close the ROOT
    expect(s.rootInstanceId).toBeNull();
    expect(refKeys(s)).toEqual(["jo"]);              // the pin stayed
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
