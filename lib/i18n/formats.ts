import type { Formats } from "next-intl";

/** Named formats for t("…", { when }) with {when, date, day} and useFormatter().dateTime(d, "day"). */
export const formats = {
  dateTime: {
    day: { weekday: "long", day: "numeric", month: "short" },
    longDay: { weekday: "long", day: "numeric", month: "long" },
    stamp: { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" },
    time: { hour: "2-digit", minute: "2-digit" },
  },
  number: {
    euro: { style: "currency", currency: "EUR" },
  },
} satisfies Formats;
