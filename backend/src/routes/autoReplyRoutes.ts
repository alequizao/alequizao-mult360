/*
 * ALEQUIZÃO MULT360 · Desenvolvido por Alequizao <alequizao.dev@gmail.com>
 * https://github.com/alequizao · © 2026 Alequizao. Todos os direitos reservados.
 */
import express from "express";
import isAuth from "../middleware/isAuth";
import * as AutoReplyController from "../controllers/AutoReplyController";

const autoReplyRoutes = express.Router();
autoReplyRoutes.get("/auto-replies", isAuth, AutoReplyController.index);
autoReplyRoutes.post("/auto-replies", isAuth, AutoReplyController.store);
autoReplyRoutes.post("/auto-replies/test", isAuth, AutoReplyController.test);
autoReplyRoutes.put("/auto-replies/:id", isAuth, AutoReplyController.update);
autoReplyRoutes.delete("/auto-replies/:id", isAuth, AutoReplyController.remove);

export default autoReplyRoutes;
