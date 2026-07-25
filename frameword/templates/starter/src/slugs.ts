/**
 * slugs.ts — your app's half of the URL contract. Keep it, it is thirty lines
 * and it is the difference between a link people paste and a link people avoid.
 *
 * The engine addresses a panel by (panelType, resourceKey), which is honest
 * internally and unreadable in an address bar:
 *
 *     #/home/section~sec:home/doc~doc:mechanic      without a codec
 *     #/home/mechanic                                with one
 *
 * Four rules, and they generalise to any domain:
 *   1. A space is named by its PUBLIC slug when its internal id is jargon
 *      (add entries to SPACE_SLUG). Most spaces already read fine.
 *   2. The space ROOT is never written: opening a space already opens it.
 *   3. A node's slug is its resource key with the namespace stripped.
 *   4. On a collision the PUBLIC surface wins the bare word and the losers keep
 *      their namespace (rank them in NS_RANK, do not rely on iteration order or
 *      a shared link changes meaning between builds). A slug that is only
 *      digits is never awarded, because /1 addresses nothing a human can read.
 *
 * Nothing breaks while you adopt it. Three forms decode and they MIX inside one
 * URL: a bare slug, an explicit `type~key` segment, and the legacy form. A
 * resource created at runtime (a row, a note) is not in the static domain, so
 * it simply returns null here and falls back to `type~key`.
 */
import type { SlugCodec } from "@frameword/panels-core";
import { DOMAIN, SPACES } from "./domain";

/** Only where the internal id is jargon. `pf-analytics` should read `analytics`. */
const SPACE_SLUG: Record<string, string> = {
  // "pf-analytics": "analytics",
};
const SPACE_ID: Record<string, string> = Object.fromEntries(
  Object.entries(SPACE_SLUG).map(([id, slug]) => [slug, id]),
);

/** Your namespaces, most public first. A contested bare slug goes to the top one. */
const NS_RANK = ["sec", "doc"];

const bare = (k: string) => (k.includes(":") ? k.slice(k.indexOf(":") + 1) : k);
const qualified = (k: string) => k.replace(":", "-");
const rankOf = (k: string) => {
  const i = NS_RANK.indexOf(k.split(":")[0]);
  return i < 0 ? NS_RANK.length : i;
};

function buildIndex() {
  const wanted = new Map<string, string[]>();
  for (const k of Object.keys(DOMAIN)) wanted.set(bare(k), [...(wanted.get(bare(k)) ?? []), k]);
  const bySlug = new Map<string, string>();
  const byKey = new Map<string, string>();
  for (const [slug, competing] of wanted) {
    const awardable = !/^\d+$/.test(slug);
    const ranked = [...competing].sort((a, b) => rankOf(a) - rankOf(b));
    const winner = awardable ? ranked[0] : null;
    for (const k of ranked) {
      const s = k === winner ? slug : qualified(k);
      bySlug.set(s, k);
      byKey.set(k, s);
    }
  }
  return { bySlug, byKey };
}

const INDEX = buildIndex();
const ROOT_OF = new Map(SPACES.map((s) => [s.spaceId, s.rootKey]));
const targetFor = (key?: string) => {
  const node = key ? DOMAIN[key] : undefined;
  return node ? { panelType: node.panelType, resourceKey: key! } : null;
};

export const slugCodec: SlugCodec = {
  slug: (t) => INDEX.byKey.get(t.resourceKey) ?? null,
  target: (slug) => targetFor(INDEX.bySlug.get(slug)),
  root: (spaceId) => targetFor(ROOT_OF.get(spaceId)),
  spaceSlug: (spaceId) => SPACE_SLUG[spaceId] ?? spaceId,
  spaceId: (slug) => SPACE_ID[slug] ?? slug,
};
