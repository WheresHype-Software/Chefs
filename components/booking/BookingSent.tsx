import Link from "next/link";
import { DetailList } from "@/components/ui/DetailList";

type Props = { chefFirstName: string; email: string; summary: [string, string][]; link: string; onClose?: () => void };

/** Confirmation shown after a request is sent. */
export function BookingSent({ chefFirstName, email, summary, link, onClose }: Props) {
  return (
    <div className="al-in flex flex-col gap-5 px-[30px] py-11">
      <svg className="al-check" width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <circle cx="32" cy="32" r="30" stroke="#111110" strokeWidth="1.5" />
        <path d="M20 33l8 8 16-18" stroke="#111110" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h2 className="d m-0 text-[40px] leading-[1.04]">Pedido enviado a {chefFirstName}</h2>
      <p className="m-0 text-muted">
        {chefFirstName} tem 48 horas para aceitar, recusar ou propor outra data. Enviámos um link para {email} para acompanhar tudo.
      </p>
      <DetailList variant="ruled" items={summary} />
      <Link href={link} className="btn">
        Ver estado e conversar
      </Link>
      {onClose && (
        <button type="button" className="btn btn-o" onClick={onClose}>
          Voltar aos resultados
        </button>
      )}
    </div>
  );
}
