import { getTranslations } from "next-intl/server";
import { contactPhone, whatsappLink } from "@/lib/contact";

/**
 * Ligar, WhatsApp e email, como botões e não como texto para copiar.
 *
 * Um chef abre isto a caminho da morada, com uma mão no telemóvel. Ter o número escrito obrigava
 * a decorá-lo ou a copiá-lo para a aplicação do telefone, que é o momento exato em que se troca
 * um dígito. A mensagem do WhatsApp já vai começada com a referência da reserva, para o cliente
 * perceber quem está do outro lado antes de atender um número que não conhece.
 */
export async function ContactClient({
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
  const t = await getTranslations("dashboard.contact");
  const p = contactPhone(phone);
  if (!p && !email) return null;

  const greeting = t("greeting", {
    hasName: name ? "yes" : "no",
    name: name ? name.split(" ")[0]! : "",
    hasRef: bookingRef ? "yes" : "no",
    ref: bookingRef ?? "",
  });

  return (
    <div className="flex flex-col gap-1.5">
      <span className="lab text-muted">{t("title")}</span>
      <div className="flex flex-wrap gap-1.5">
        {p && (
          <>
            <a href={`tel:${p.tel}`} className="btn btn-sm btn-o">
              {t("call")}
            </a>
            <a href={whatsappLink(p, greeting)} target="_blank" rel="noopener" className="btn btn-sm btn-o">
              {t("whatsapp")}
            </a>
          </>
        )}
        {email && (
          <a href={`mailto:${email}`} className="btn btn-sm btn-o">
            {t("email")}
          </a>
        )}
      </div>
      {p && <span className="num text-[13px] text-muted">{p.display}</span>}
    </div>
  );
}
