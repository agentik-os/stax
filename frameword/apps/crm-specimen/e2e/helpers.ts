import type { Page } from "@playwright/test";

/** deep link into a workspace thread */
export const link = (o: { spaceId: string; path: { t: string; k: string }[] }) =>
  "/#" + encodeURIComponent(JSON.stringify(o));

/** fresh page state: no persisted workspace, optional dark theme */
export async function fresh(page: Page, opts: { dark?: boolean } = {}) {
  await page.addInitScript((dark) => {
    try { localStorage.clear(); } catch { /* first load */ }
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
  }, opts.dark ?? false);
}
