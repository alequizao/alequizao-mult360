import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import * as S from "../services/AutoReplyService/AutoReplyService";

// ALEQUIZAO: respostas automáticas por palavra-chave
const emitir = (companyId: number, action: string, autoReply: any) => {
  getIO().to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-autoreply`, { action, autoReply });
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam } = req.query as { searchParam?: string };
  const autoReplies = await S.listar(companyId, searchParam || "");
  return res.json({ autoReplies });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const autoReply = await S.criar({ ...req.body, companyId });
  emitir(companyId, "create", autoReply);
  return res.status(200).json(autoReply);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const autoReply = await S.atualizar(req.params.id, companyId, req.body);
  emitir(companyId, "update", autoReply);
  return res.json(autoReply);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  await S.excluir(req.params.id, companyId);
  emitir(companyId, "delete", { id: +req.params.id });
  return res.status(200).json({ message: "removido" });
};

export const test = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { text } = req.body as { text: string };
  return res.json(await S.testar(companyId, text || ""));
};
