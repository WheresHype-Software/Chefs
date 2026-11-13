/** Dates for legal records: always in Lisbon time, whatever the server's clock is set to. */
const DAY = new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", day: "numeric", month: "long", year: "numeric" });
const TIME = new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit", second: "2-digit" });
const SHORT_TIME = new Intl.DateTimeFormat("pt-PT", { timeZone: "Europe/Lisbon", hour: "2-digit", minute: "2-digit" });
const DAY_EN = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Lisbon", day: "numeric", month: "long", year: "numeric" });

/**
 * A legal text laid out for reading. The contract is written with a line break every hundred or
 * so characters, which on a screen breaks sentences in the middle. This joins the lines of each
 * paragraph and keeps the breaks that mean something: blank lines between paragraphs, the line
 * after a clause heading ("3. Comissão"), and list items ("- …").
 *
 * For display only: what is hashed and archived is always the original text.
 */
export function reflow(text: string): string {
  return text
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map((block) =>
      block.split("\n").reduce((out, line, i, lines) => {
        if (i === 0) return line;
        const keepBreak = line.startsWith("- ") || (i === 1 && /^\d+\. \S/.test(lines[0]!) && lines[0]!.length < 60);
        return `${out}${keepBreak ? "\n" : " "}${line}`;
      }, ""),
    )
    .join("\n\n");
}

/** "10 de novembro de 2026 às 21:44"; in English (for page UI only), "10 November 2026 at 21:44". */
export function lisbonStamp(iso: string, locale: "pt" | "en" = "pt"): string {
  const d = new Date(iso);
  return locale === "en" ? `${DAY_EN.format(d)} at ${SHORT_TIME.format(d)}` : `${DAY.format(d)} às ${SHORT_TIME.format(d)}`;
}

/** "10 de novembro de 2026, 21:44:07 (hora de Lisboa)" */
export function lisbonStampSeconds(iso: string): string {
  const d = new Date(iso);
  return `${DAY.format(d)}, ${TIME.format(d)} (hora de Lisboa)`;
}
