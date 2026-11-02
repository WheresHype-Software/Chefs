type Queue = { id: string; label: string; count: number };

/** What's waiting, at a glance and one tap away: sticky under the header while scrolling the queues. */
export function AdminQueueNav({ queues }: { queues: Queue[] }) {
  return (
    <nav
      aria-label="Filas"
      className="sticky top-0 z-10 -mx-5 border-b border-line bg-paper/95 px-5 py-2.5 backdrop-blur-[6px] md:mx-0 md:px-0"
    >
      <ul className="m-0 flex list-none gap-2 overflow-x-auto p-0 [scrollbar-width:none]">
        {queues.map((q) => (
          <li key={q.id} className="shrink-0">
            <a
              href={`#${q.id}`}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[14px] font-semibold no-underline ${
                q.count ? "border-cobalt bg-white text-ink" : "border-line-2 bg-transparent text-muted"
              }`}
            >
              {q.label}
              <span className={`num rounded-full px-2 text-[13px] ${q.count ? "bg-cobalt text-white" : "bg-line text-muted"}`}>
                {q.count}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
