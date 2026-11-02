/** Languages a chef can say they speak, stored as codes on chefs.languages. */
export const LANGUAGES: [code: string, name: string][] = [
  ["pt", "Português"],
  ["en", "Inglês"],
  ["es", "Espanhol"],
  ["fr", "Francês"],
  ["it", "Italiano"],
  ["de", "Alemão"],
];

const NAME = new Map(LANGUAGES);

/** ["pt", "en"] → ["Português", "Inglês"]; unknown codes are shown as they are. */
export const languageNames = (codes: string[]) => codes.map((c) => NAME.get(c) ?? c);
