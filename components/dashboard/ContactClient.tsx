import { contactPhone, whatsappLink } from "@/lib/contact";

/**
 * Ligar, WhatsApp e email, como botões e não como texto para copiar.
 *
 * Um chef abre isto a caminho da morada, com uma mão no telemóvel. Ter o número escrito obrigava
 * a decorá-lo ou a copiá-lo para a aplicação do telefone, que é o momento exato em que se troca
 * um dígito. A mensagem do WhatsApp já vai começada com a referência da reserva, para o cliente
 * perceber quem está do outro lado antes de atender um número que não conhece.
 */
export function ContactClient({
  name,
  phone,
  email,
  bookingRef,
}: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  bookingRef?: string;
}) {
  const p = contactPhone(phone);
  if (!p && !email) return null;

  const greeting = `Olá${name ? ` ${name.split(" ")[0]}` : ""}! Sou do Ao Lume${bookingRef ? `, sobre a reserva ${bookingRef}` : ""}.`;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="lab text-muted">Contacto</span>
      <div className="flex flex-wrap gap-1.5">
        {p && (
          <>
            <a href={`tel:${p.tel}`} className="btn btn-sm btn-o">
              Ligar
            </a>
            <a href={whatsappLink(p, greeting)} target="_blank" rel="noopener" className="btn btn-sm btn-o">
              WhatsApp
            </a>
          </>
        )}
        {email && (
          <a href={`mailto:${email}`} className="btn btn-sm btn-o">
            Email
          </a>
        )}
      </div>
      {p && <span className="num text-[13px] text-muted">{p.display}</span>}
    </div>
  );
}
