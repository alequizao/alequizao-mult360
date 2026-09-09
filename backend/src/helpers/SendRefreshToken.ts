import { Response } from "express";

export const SendRefreshToken = (res: Response, token: string): void => {
  res.cookie("jrt", token, { httpOnly: true, secure: true, sameSite: "none", maxAge: 3650 * 24 * 60 * 60 * 1000 });
};
