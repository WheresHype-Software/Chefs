"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import agendaShot from "@/public/para-chefs/agenda.png";
import avaliacoesShot from "@/public/para-chefs/avaliacoes.png";
import conversaShot from "@/public/para-chefs/conversa.png";
import paginaShot from "@/public/para-chefs/pagina.png";
import pedidosShot from "@/public/para-chefs/pedidos.png";
import { AppShot } from "./AppShot";
import { BrowserShot } from "./BrowserShot";
import { SITE_DOMAIN } from "@/lib/constants";

const TABS = [
  { key: "page", shot: paginaShot, browser: "/chef/marta-figueiredo" },
  { key: "requests", shot: pedidosShot },
  { key: "calendar", shot: agendaShot },
  { key: "chat", shot: conversaShot },
  { key: "reviews", shot: avaliacoesShot },
] as const;

export function ToolTabs() {
  const t = useTranslations("paraChefs");
  const [tab, setTab] = useState(0);
  const cur = TABS[tab]!;
  const browser = "browser" in cur ? cur.browser : undefined;
  const link = `${SITE_DOMAIN}/chef/${t("marketing.slugPlaceholder")}`;
  return (
    <>
      <div
        role="tablist"
        aria-label={t("tool.tabsLabel")}
        className="box-border flex max-w-full flex-wrap gap-1 self-start rounded-[3px] border border-ink p-[3px]"
      >
        {TABS.map((tb, i) => (
          <button key={tb.key} type="button" role="tab" className="seg" aria-selected={i === tab} onClick={() => setTab(i)}>
            {t(`tool.tabs.${tb.key}.label`)}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="flex flex-wrap items-center gap-7 border-t border-line-2 pt-10 md:gap-12">
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-[18px]">
          <h3 className="d m-0 text-[clamp(30px,4vw,44px)] leading-[1.04]">{t(`tool.tabs.${cur.key}.title`)}</h3>
          <p className="m-0 text-[17px] text-ink-3">{t(`tool.tabs.${cur.key}.text`)}</p>
          <ul className="m-0 list-none border-t border-line-2 p-0">
            {(["a", "b", "c"] as const).map((p) => (
              <li key={p} className="border-b border-line-2 py-3.5 text-[15px]">
                {t(`tool.tabs.${cur.key}.points.${p}`, { link })}
              </li>
            ))}
          </ul>
        </div>
        <div className={`flex min-w-0 flex-col items-center gap-3.5 ${browser ? "flex-[1_1_520px]" : "flex-[1_1_340px]"}`}>
          {browser ? (
            <BrowserShot key={tab} src={cur.shot} alt={t(`tool.tabs.${cur.key}.alt`)} url={browser} />
          ) : (
            <AppShot key={tab} src={cur.shot} alt={t(`tool.tabs.${cur.key}.alt`)} />
          )}
          <span className="text-[13px] text-muted">{t("tool.caption")}</span>
        </div>
      </div>
    </>
  );
}
