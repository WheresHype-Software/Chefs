"use client";

import { useState } from "react";
import { makeChef } from "@/app/admin/actions";
import { FormMessage } from "@/components/ui/FormMessage";
import { useServerAction } from "@/hooks/useServerAction";

/** For someone who signed up as a client but is a chef: their email, and the account changes side. */
export function MakeChefForm() {
  const [email, setEmail] = useState("");
  const { run, pending, message } = useServerAction(makeChef, {
    successMessage: "Feito. A conta passou a chef e a pessoa recebeu um email para sair e voltar a entrar.",
    onSuccess: () => setEmail(""),
  });

  return (
    <section className="box flex flex-col gap-2.5 p-5">
      <h2 className="d m-0 text-[18px] font-normal">Mudar uma conta de cliente para chef</h2>
      <p className="m-0 text-sm text-muted">
        Para quem se registou como cliente por engano. As reservas que tiver como cliente mantêm-se, e o contrato de chef é-lhe pedido antes
        de enviar o perfil.
      </p>
      <form
        className="flex flex-wrap items-end gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (confirm(`Mudar a conta ${email.trim()} para conta de chef?`)) run(email);
        }}
      >
        <label className="field lab min-w-[240px] flex-1">
          Email da conta
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@exemplo.com" />
        </label>
        <button type="submit" className="btn btn-sm" disabled={pending || !email.trim()}>
          {pending ? "A mudar…" : "Mudar para chef"}
        </button>
      </form>
      <FormMessage message={message} />
    </section>
  );
}
