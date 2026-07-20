/**
 * Flags — the five language flags as tiny inline SVGs. Replaces the
 * flag-icons package (5.3 MB of assets, 250+ flags) with ~1 KB: the app
 * renders exactly these five, at 18×13.5, forever.
 */
const VB = { width: 18, height: 13.5, viewBox: "0 0 60 45", style: { borderRadius: 3, display: "block" } as const };

export function Flag({ id }: { id: string }) {
  switch (id) {
    case "fr":
      return (
        <svg {...VB} aria-hidden>
          <rect width="20" height="45" fill="#002395" /><rect x="20" width="20" height="45" fill="#fff" /><rect x="40" width="20" height="45" fill="#ED2939" />
        </svg>
      );
    case "de":
      return (
        <svg {...VB} aria-hidden>
          <rect width="60" height="15" fill="#111" /><rect y="15" width="60" height="15" fill="#DD0000" /><rect y="30" width="60" height="15" fill="#FFCE00" />
        </svg>
      );
    case "es":
      return (
        <svg {...VB} aria-hidden>
          <rect width="60" height="45" fill="#AA151B" /><rect y="11.25" width="60" height="22.5" fill="#F1BF00" />
        </svg>
      );
    case "pt":
      return (
        <svg {...VB} aria-hidden>
          <rect width="60" height="45" fill="#FF0000" /><rect width="24" height="45" fill="#006600" /><circle cx="24" cy="22.5" r="8" fill="#FFFF00" stroke="#006600" strokeWidth="1.5" />
        </svg>
      );
    default: // gb
      return (
        <svg {...VB} aria-hidden>
          <rect width="60" height="45" fill="#012169" />
          <path d="M0,0 60,45 M60,0 0,45" stroke="#fff" strokeWidth="9" />
          <path d="M0,0 60,45 M60,0 0,45" stroke="#C8102E" strokeWidth="4" />
          <path d="M30,0 V45 M0,22.5 H60" stroke="#fff" strokeWidth="15" />
          <path d="M30,0 V45 M0,22.5 H60" stroke="#C8102E" strokeWidth="9" />
        </svg>
      );
  }
}
