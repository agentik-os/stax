export function Pagination({ totalPages, current, onGo }: { totalPages: number; current: number; onGo: (p: number) => void }) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav>
      {pages.map((p) => (
        <button key={p} disabled={p === current} onClick={() => onGo(p)}>
          {p}
        </button>
      ))}
    </nav>
  );
}
