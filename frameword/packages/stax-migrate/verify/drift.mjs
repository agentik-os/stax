/**
 * Design-drift counters, alone: importable, unit-tested.
 * Hex matches 3/4/6/8-digit color literals (alpha included — the alpha-hex
 * blind spot was a real doctor bug); font-size counts hardcoded px values.
 * The tokens file is exempt at the call site, not here.
 */
export const HEX_RE = /#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![0-9a-f])/gi;
export const FZ_RE = /font-size:\s*\d/g;

export function countDrift(text) {
  return {
    hex: (text.match(HEX_RE) ?? []).length,
    fz: (text.match(FZ_RE) ?? []).length,
  };
}
