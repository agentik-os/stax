import type { Page } from "@playwright/test";

/** deep link into a workspace thread */
export const link = (o: { spaceId: string; path: { t: string; k: string }[] }) =>
  "/#" + encodeURIComponent(JSON.stringify(o));

/** fresh page state: no persisted workspace, optional dark theme.
 *  BOTH the media query and the attribute are set: the app derives its theme
 *  from the system preference on cold boot and would overwrite a bare attr. */
export async function fresh(page: Page, opts: { dark?: boolean } = {}) {
  await page.emulateMedia({ colorScheme: opts.dark ? "dark" : "light" });
  await page.addInitScript((dark) => {
    try { localStorage.clear(); } catch { /* first load */ }
    if (dark) document.documentElement.setAttribute("data-theme", "dark");
  }, opts.dark ?? false);
}
