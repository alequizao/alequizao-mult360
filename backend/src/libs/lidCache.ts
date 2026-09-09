// ALEQUIZAO: mapa LID (id interno do WhatsApp, ex. 118597485633703@lid) -> telefone (55...@s.whatsapp.net)
const cache = new Map<string, string>();
const digits = (j: string) => (j || "").split("@")[0].split(":")[0];
export const setLidPn = (lid: string, pn: string): void => { if (lid && pn) cache.set(digits(lid), digits(pn)); };
export const getPnForLid = (lid: string): string | undefined => cache.get(digits(lid));
export const isLidNumber = (n: string): boolean => /^\d{14,}$/.test(n || "");
export const fixJid = (jid: any): any =>
  typeof jid === "string" && /^\d{14,}@s\.whatsapp\.net$/.test(jid) ? jid.replace("@s.whatsapp.net", "@lid") : jid;
