import { Op } from "sequelize";
import * as Yup from "yup";
import AppError from "../../errors/AppError";
import AutoReply from "../../models/AutoReply";

// ALEQUIZAO: CRUD + casamento de palavras-chave das respostas automáticas

export const normalizar = (t: string): string =>
  (t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const listarPalavras = (keywords: string): string[] =>
  (keywords || "")
    .split(/[;,\n]/)
    .map(k => normalizar(k))
    .filter(k => k.length > 0);

export const casa = (regra: AutoReply, textoOriginal: string): boolean => {
  const texto = normalizar(textoOriginal);
  if (!texto) return false;
  const palavras = listarPalavras(regra.keywords);
  switch (regra.matchType) {
    case "exact":
      return palavras.some(p => texto === p);
    case "starts":
      return palavras.some(p => texto.startsWith(p));
    case "word":
      return palavras.some(p => new RegExp(`(^|[^a-z0-9])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(texto));
    case "regex":
      return (regra.keywords || "").split("\n").some(r => {
        try { return r.trim() && new RegExp(r.trim(), "i").test(textoOriginal); } catch (e) { return false; }
      });
    default: // contains
      return palavras.some(p => texto.includes(p));
  }
};

const ultimoEnvio = new Map<string, number>();

export const encontrarResposta = async (
  companyId: number,
  texto: string,
  contactId: number,
  ticketTemAtendente: boolean
): Promise<AutoReply | null> => {
  const regras = await AutoReply.findAll({ where: { companyId, active: true }, order: [["id", "ASC"]] });
  for (const r of regras) {
    if (r.onlyWithoutUser && ticketTemAtendente) continue;
    if (!casa(r, texto)) continue;
    const chave = `${r.id}:${contactId}`;
    const ultimo = ultimoEnvio.get(chave) || 0;
    if (r.cooldownMinutes > 0 && Date.now() - ultimo < r.cooldownMinutes * 60 * 1000) continue;
    ultimoEnvio.set(chave, Date.now());
    await r.update({ hits: (r.hits || 0) + 1 });
    return r;
  }
  return null;
};

interface Dados {
  name: string; keywords: string; reply: string; matchType?: string; active?: boolean;
  onlyWithoutUser?: boolean; stopFlow?: boolean; cooldownMinutes?: number; companyId: number;
}

const schema = Yup.object().shape({
  name: Yup.string().required("Nome obrigatório"),
  keywords: Yup.string().required("Informe ao menos uma palavra-chave"),
  reply: Yup.string().required("Informe a resposta")
});

export const listar = async (companyId: number, searchParam = "") => {
  const where: any = { companyId };
  if (searchParam) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${searchParam}%` } },
      { keywords: { [Op.iLike]: `%${searchParam}%` } },
      { reply: { [Op.iLike]: `%${searchParam}%` } }
    ];
  }
  return AutoReply.findAll({ where, order: [["id", "ASC"]] });
};

export const criar = async (dados: Dados): Promise<AutoReply> => {
  try { await schema.validate(dados); } catch (e) { throw new AppError(e.message); }
  return AutoReply.create(dados as any);
};

export const atualizar = async (id: number | string, companyId: number, dados: Partial<Dados>): Promise<AutoReply> => {
  const r = await AutoReply.findOne({ where: { id, companyId } });
  if (!r) throw new AppError("ERR_NO_AUTOREPLY_FOUND", 404);
  try { await schema.validate({ ...r.toJSON(), ...dados }); } catch (e) { throw new AppError(e.message); }
  await r.update(dados as any);
  return r;
};

export const excluir = async (id: number | string, companyId: number): Promise<void> => {
  const r = await AutoReply.findOne({ where: { id, companyId } });
  if (!r) throw new AppError("ERR_NO_AUTOREPLY_FOUND", 404);
  await r.destroy();
};

export const testar = async (companyId: number, texto: string) => {
  const regras = await AutoReply.findAll({ where: { companyId, active: true }, order: [["id", "ASC"]] });
  const r = regras.find(x => casa(x, texto));
  return r ? { casou: true, id: r.id, name: r.name, reply: r.reply } : { casou: false };
};
