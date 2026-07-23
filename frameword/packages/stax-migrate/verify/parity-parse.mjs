/**
 * The parity-contract CSV parser, alone: importable, unit-tested.
 * Row grammar — id,capability,probe,expect — where capability may itself
 * contain commas: id is everything before the FIRST comma, expect everything
 * after the LAST, and the probe is what follows the last comma of the middle.
 */
export function parseParityCsv(text) {
  return text
    .split("\n")
    .map((l) => l.replace(/\r$/, "").trim())
    .filter(Boolean)
    .filter((l, i) => !(i === 0 && l.toLowerCase().startsWith("id,")))
    .map((l) => {
      const first = l.indexOf(",");
      const last = l.lastIndexOf(",");
      const mid = l.slice(first + 1, last);
      const probeSplit = mid.lastIndexOf(",");
      return {
        id: l.slice(0, first).trim(),
        capability: mid.slice(0, probeSplit).trim(),
        probe: mid.slice(probeSplit + 1).trim().replace(/^#/, ""),
        expect: l.slice(last + 1).trim(),
      };
    });
}
