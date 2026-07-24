/**
 * slugs.ts — the app's half of the URL contract.
 *
 * The engine addresses a panel by (panelType, resourceKey). Those are honest
 * internals and terrible URLs: `#/pf-analytics/section~sec:pf-analytics/anblotter~an:blotter`
 * says the same thing three times and leaks a namespace. This module maps that
 * addressing onto the words a person would actually type:
 *
 *     #/analytics/blotter
 *     #/crm/acme/renewal
 *     #/studio/terminal
 *
 * Rules, in order:
 *   1. A space is named by its public slug, not its internal id (pf-studio -> studio).
 *   2. The space ROOT is never written: opening a space already opens it.
 *   3. A node's slug is its resource key with the namespace stripped (an:blotter -> blotter).
 *   4. When two nodes want the same slug, the PRIMARY surface wins it and the
 *      others keep their namespace: `pf:keys` (the console's API keys) takes
 *      `/keys`, while `imp:keys` (a note about it) becomes `/imp-keys`. A slug
 *      that is only digits is never awarded at all, because `/1` addresses
 *      nothing a human can read. Deterministic, so a shared link never changes
 *      meaning between builds.
 *   5. Anything not in the static domain (a data row, a note, a task created at
 *      runtime) returns null and the engine falls back to `type~key`. Mixed
 *      segments in one URL are legal, so nothing has to be rewritten at once.
 *
 * Old links keep working forever: the engine still decodes `type~key` segments
 * and the legacy percent-encoded JSON.
 */
import type { SlugCodec } from "@frameword/panels-core";
import { DOMAIN, SPACES } from "./domain";

/* ── spaces ───────────────────────────────────────────────────────────── */

/** Only where the internal id is an implementation detail. Everything else is
 *  already the word a human would use (crm, blocks, laws, model, reports). */
const SPACE_SLUG: Record<string, string> = {
  "pf-analytics": "analytics",
  "pf-console": "console",
  "pf-studio": "studio",
  "pf-tour": "platform-tour",
  "ana-poss": "possibilities",
};
const SPACE_ID: Record<string, string> = Object.fromEntries(
  Object.entries(SPACE_SLUG).map(([id, slug]) => [slug, id]),
);

/* ── nodes ────────────────────────────────────────────────────────────── */

const bare = (key: string) => {
  const i = key.indexOf(":");
  return i < 0 ? key : key.slice(i + 1);
};
const qualified = (key: string) => key.replace(":", "-");

/** Namespaces ranked by how public the surface is. A contested bare slug goes
 *  to the highest-ranked claimant: the thing a person means when they type it.
 *  Anything unlisted ranks last, alphabetically stable via the key order. */
const NS_RANK = ["sec", "pf", "an", "dtc", "sys", "gl", "ov", "crm", "imp", "law", "depth"];
const rankOf = (key: string) => {
  const i = NS_RANK.indexOf(key.split(":")[0]);
  return i < 0 ? NS_RANK.length : i;
};

/** Built once from the static domain. Deterministic: the key order comes from
 *  the domain literal, so the same source always yields the same slugs. */
function buildIndex() {
  const keys = Object.keys(DOMAIN);
  const wanted = new Map<string, string[]>(); // slug -> keys competing for it
  for (const k of keys) {
    const s = bare(k);
    wanted.set(s, [...(wanted.get(s) ?? []), k]);
  }
  const bySlug = new Map<string, string>(); // slug -> resourceKey
  const byKey = new Map<string, string>(); // resourceKey -> slug
  for (const [slug, competing] of wanted) {
    // `/1` and `/2` address nothing a person can read: never award a bare number
    const awardable = !/^\d+$/.test(slug);
    if (awardable && competing.length === 1) {
      bySlug.set(slug, competing[0]);
      byKey.set(competing[0], slug);
      continue;
    }
    // the most public surface takes the short word; the rest keep the namespace
    const ranked = [...competing].sort((a, b) => rankOf(a) - rankOf(b));
    const winner = awardable ? ranked[0] : null;
    for (const k of ranked) {
      if (k === winner) {
        bySlug.set(slug, k);
        byKey.set(k, slug);
      } else {
        const q = qualified(k);
        bySlug.set(q, k);
        byKey.set(k, q);
      }
    }
  }
  return { bySlug, byKey };
}

const INDEX = buildIndex();

/** the root resource key of each space, so it can be dropped from the URL */
const ROOT_OF = new Map<string, string>(SPACES.map((s) => [s.spaceId, s.rootKey]));

export const slugCodec: SlugCodec = {
  slug(target, _spaceId) {
    const s = INDEX.byKey.get(target.resourceKey);
    // a runtime resource (data row, note, task) is not in the domain: fall back
    return s ?? null;
  },
  target(slug, _spaceId) {
    const key = INDEX.bySlug.get(slug);
    if (!key) return null;
    const node = DOMAIN[key];
    return node ? { panelType: node.panelType, resourceKey: key } : null;
  },
  root(spaceId) {
    const key = ROOT_OF.get(spaceId);
    if (!key) return null;
    const node = DOMAIN[key];
    return node ? { panelType: node.panelType, resourceKey: key } : null;
  },
  spaceSlug: (spaceId) => SPACE_SLUG[spaceId] ?? spaceId,
  spaceId: (slug) => SPACE_ID[slug] ?? slug,
};

/** exposed for the docs panel and for tests: every slug the app publishes */
export const slugTable = () =>
  [...INDEX.bySlug.entries()]
    .map(([slug, key]) => ({ slug, key, type: DOMAIN[key]?.panelType ?? "?" }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
