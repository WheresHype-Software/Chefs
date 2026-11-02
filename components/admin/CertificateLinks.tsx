import type { CertificateDoc } from "@/lib/admin/certificates";

/** The chef's certificates, each opening its private document in a new tab. */
export function CertificateLinks({ docs }: { docs: CertificateDoc[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm">
      {docs.map((d, i) => (
        <li key={`${d.title}-${i}`} className="flex flex-wrap items-baseline gap-x-2">
          <span className="[overflow-wrap:anywhere]">{d.title}</span>
          {d.url ? (
            <a href={d.url} target="_blank" rel="noopener noreferrer" className="font-semibold">
              Abrir documento ↗
            </a>
          ) : (
            <span className="text-muted">sem ficheiro</span>
          )}
        </li>
      ))}
    </ul>
  );
}
