import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import Contact from "../models/Contact";
import ContactHistory from "../models/ContactHistory";
import User from "../models/User";

// ALEQUIZAO: grava no histórico do contato quem alterou o quê
const CAMPOS = ["name", "number", "email"];
const registrarHistorico = async (req: Request, contactId: number | string, action: string, antes: any, depois: any) => {
  try {
    const { id: userId, companyId } = req.user;
    const u = await User.findByPk(userId);
    const changes: any[] = [];
    if (action === "editado") {
      for (const c of CAMPOS) {
        const de = antes?.[c] ?? ""; const para = depois?.[c] ?? "";
        if (String(de) !== String(para)) changes.push({ campo: c, de, para });
      }
      const extraAntes = JSON.stringify((antes?.extraInfo || []).map((e: any) => ({ name: e.name, value: e.value })));
      const extraDepois = JSON.stringify((depois?.extraInfo || []).map((e: any) => ({ name: e.name, value: e.value })));
      if (extraAntes !== extraDepois) changes.push({ campo: "extraInfo", de: extraAntes, para: extraDepois });
      if (!changes.length) return;
    }
    await ContactHistory.create({ contactId: +contactId, userId, userName: u?.name || "", action, changes: JSON.stringify(changes), companyId } as any);
  } catch (e) {
    console.error("historico contato", e);
  }
};

export const history = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;
  const registros = await ContactHistory.findAll({ where: { contactId, companyId }, order: [["createdAt", "DESC"]], limit: 200 });
  return res.json(registros.map(r => ({ id: r.id, userName: r.userName, action: r.action, changes: JSON.parse(r.changes || "[]"), createdAt: r.createdAt })));
};
import ListContactsService from "../services/ContactServices/ListContactsService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import ShowContactService from "../services/ContactServices/ShowContactService";
import UpdateContactService from "../services/ContactServices/UpdateContactService";
import DeleteContactService from "../services/ContactServices/DeleteContactService";
import GetContactService from "../services/ContactServices/GetContactService";

import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import AppError from "../errors/AppError";
import SimpleListService, {
  SearchContactParams
} from "../services/ContactServices/SimpleListService";
import ContactCustomField from "../models/ContactCustomField";
import {head} from "lodash";
import {ImportContacts} from "../services/ContactServices/ImportContacts";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

type IndexGetContactQuery = {
  name: string;
  number: string;
};

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}
interface ContactData {
  name: string;
  number: string;
  email?: string;
  extraInfo?: ExtraInfo[];
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { contacts, count, hasMore } = await ListContactsService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ contacts, count, hasMore });
};

export const getContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, number } = req.body as IndexGetContactQuery;
  const { companyId } = req.user;

  const contact = await GetContactService({
    name,
    number,
    companyId
  });

  return res.status(200).json(contact);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const newContact: ContactData = req.body;
  newContact.number = newContact.number.replace("-", "").replace(" ", "");

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string()
      .required()
      .matches(/^\d+$/, "Invalid number format. Only numbers is allowed.")
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await CheckIsValidContact(newContact.number, companyId);
  const validNumber = await CheckContactNumber(newContact.number, companyId);
  const number = validNumber.jid.replace(/\D/g, "");
  newContact.number = number;

    // Check if the contact already exists
    const existingContact = await Contact.findOne({
      where: {
        number: newContact.number,
        companyId
      }
    });
    
    if (existingContact) {
      // Contact already exists, send the existing contact data as the response
      return res.status(200).json({ alreadyExists: true, existingContact });
    }

  /**
   * Código desabilitado por demora no retorno
   */
  // const profilePicUrl = await GetProfilePicUrl(validNumber.jid, companyId);

  const contact = await CreateContactService({
    ...newContact,
    // profilePicUrl,
    companyId
  });
  await registrarHistorico(req, contact.id, "criado", null, contact.toJSON());

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
    action: "create",
    contact
  });

  return res.status(200).json(contact);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  const contact = await ShowContactService(contactId, companyId);

  return res.status(200).json(contact);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const contactData: ContactData = req.body;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string().matches(
      /^\d+$/,
      "Invalid number format. Only numbers is allowed."
    )
  });

  try {
    await schema.validate(contactData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  await CheckIsValidContact(contactData.number, companyId);
  const validNumber = await CheckContactNumber(contactData.number, companyId);
  const number = validNumber.jid.replace(/\D/g, "");
  contactData.number = number;

  const { contactId } = req.params;

  const antes = await ShowContactService(contactId, companyId);
  const antesJson = antes.toJSON();

  const contact = await UpdateContactService({
    contactData,
    contactId,
    companyId
  });

  await registrarHistorico(req, contactId, "editado", antesJson, contact.toJSON());

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId, profile } = req.user;

  // ALEQUIZAO: só administrador exclui contato
  if (profile !== "admin") {
    throw new AppError("Somente administradores podem excluir contatos", 403);
  }

  await ShowContactService(contactId, companyId);

  await DeleteContactService(contactId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
    action: "delete",
    contactId
  });

  return res.status(200).json({ message: "Contact deleted" });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { name } = req.query as unknown as SearchContactParams;
  const { companyId } = req.user;

  const contacts = await SimpleListService({ name, companyId });

  return res.json(contacts);
};

export const upload = async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];
  const file: Express.Multer.File = head(files) as Express.Multer.File;
  const { companyId } = req.user;

  const response = await ImportContacts(companyId, file);

  const io = getIO();

  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
    action: "create",
    records: response
  });

  return res.status(200).json(response);
};

export const getContactVcard = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, number } = req.query as IndexGetContactQuery;
  const { companyId } = req.user;

  let vNumber = number;
  const numberDDI = vNumber.toString().substr(0, 2);
  const numberDDD = vNumber.toString().substr(2, 2);
  const numberUser = vNumber.toString().substr(-8, 8);

  if (numberDDD <= '30' && numberDDI === '55') {
    console.log("menor 30")
    vNumber = `${numberDDI + numberDDD + 9 + numberUser}@s.whatsapp.net`;
  } else if (numberDDD > '30' && numberDDI === '55') {
    console.log("maior 30")
    vNumber = `${numberDDI + numberDDD + numberUser}@s.whatsapp.net`;
  } else {
    vNumber = `${number}@s.whatsapp.net`;
  }

  console.log(vNumber);

  const contact = await GetContactService({
    name,
    number,
    companyId
  });

  return res.status(200).json(contact);
};