import type { formats } from "@/lib/i18n/formats";
import type { routing } from "@/lib/i18n/routing";
import type { AppMessages } from "@/messages";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: AppMessages;
    Formats: typeof formats;
  }
}
