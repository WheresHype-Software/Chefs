"use client";

import { useState } from "react";
import { exportDac7 } from "@/app/admin/pagamentos/actions";
import { FormMessage } from "@/components/ui/FormMessage";
import { callAction } from "@/lib/call-action";

/**
 * The yearly DAC7 report. A button rather than an automatic job on purpose: it reads every chef's
 * bank details at once, so it should happen when a person asks for it and be logged as such.
 */
export function Dac7Export({ years }: { years: number[] }) {
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gaps, setGaps] = useState<string[] | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setGaps(null);
    const result = await callAction(() => exportDac7(year));
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `dac7-${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setGaps(result.gaps);
  }

  return (
    <section id="dac7" className="box flex flex-col gap-3 p-[22px]">
      <h2 className="d m-0 text-[22px] font-normal">Comunicação à Autoridade Tributária (DAC7)</h2>
      <p className="m-0 max-w-[70ch] text-sm text-muted">
        A lei obriga-nos a comunicar, até 31 de janeiro, quem vendeu através da plataforma e quanto recebeu. Isto gera a folha para o
        contabilista entregar — e diz quem ainda tem dados em falta, enquanto há tempo de os pedir.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="field lab !flex-row !items-center gap-2">
          <span>Ano</span>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-sm" disabled={busy} onClick={() => void run()}>
          {busy ? "A preparar…" : "Descarregar CSV"}
        </button>
        {error && <FormMessage message={{ ok: false, text: error }} />}
      </div>

      {gaps && gaps.length === 0 && <p className="m-0 text-sm text-ok">Está tudo completo.</p>}
      {gaps && gaps.length > 0 && (
        <div className="flex flex-col gap-1.5 border-l-2 border-line-2 pl-3">
          <span className="lab text-muted">Dados em falta ({gaps.length})</span>
          {gaps.map((g) => (
            <span key={g} className="text-sm">
              {g}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
