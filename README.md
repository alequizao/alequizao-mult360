# ALEQUIZÃO MULT360 — Plataforma de atendimento WhatsApp multiusuário (CRM + chatbot)

[![Licença MIT](https://img.shields.io/badge/licen%C3%A7a-MIT-blue.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/node-20%2B-green.svg)](#2-requisitos)
[![PostgreSQL](https://img.shields.io/badge/banco-PostgreSQL-336791.svg)](MANUAL.md)
[![PWA](https://img.shields.io/badge/PWA-instal%C3%A1vel-5a0fc8.svg)](MANUAL.md)
[![Demo](https://img.shields.io/badge/demo-zap.alequizao.com-2563EB.svg)](https://zap.alequizao.com)

> **ALEQUIZÃO MULT360** é um sistema de **atendimento ao cliente via WhatsApp com vários atendentes no mesmo número** — multiatendimento, filas/departamentos, chatbot, **respostas automáticas por palavra-chave sem fila**, campanhas de envio em massa, Kanban de atendimentos, chat interno, integrações com IA (OpenAI), Typebot, n8n e API REST. É uma alternativa **open source e self-hosted** a plataformas pagas como Multi360, Zenvia, Take Blip ou Huggy. Base: Whaticket SaaS + Baileys (WhatsApp Web multi-device). Stack: Node.js/TypeScript, React, PostgreSQL, Redis. Desenvolvido por **[Alex Junior (@alequizao)](https://github.com/alequizao)**, Maceió/AL.

Plataforma de atendimento multicanal via WhatsApp (multiusuário, filas, chatbot, campanhas, Kanban, IA) — baseada no Whaticket SaaS, com correções e módulos próprios do **Alequizão**.

## 📸 Telas do sistema

| Login | Atendimentos |
|:---:|:---:|
| <img src="docs/img/wk-login.png" width="420"> | <img src="docs/img/wk-tickets.png" width="420"> |

<details>
<summary>Mais telas</summary>

| Conexões | Contatos |
|:---:|:---:|
| <img src="docs/img/wk-connections.png" width="420"> | <img src="docs/img/wk-contacts.png" width="420"> |

| Campanhas | Kanban |
|:---:|:---:|
| <img src="docs/img/wk-campaigns.png" width="420"> | <img src="docs/img/wk-kanban.png" width="420"> |

</details>

## ✨ O que foi feito em cima do Whaticket SaaS (marcado `ALEQUIZAO` no código)

- **Respostas Automáticas por palavra-chave, sem fila** (`/auto-replies`): "areia" → "Não vendemos areia", com tipos de comparação, intervalo anti-repetição, contador de disparos e testador.
- **Suporte a LID** (novo identificador do WhatsApp): envio, leitura, foto e fusão automática do contato com o telefone real.
- **Contatos salvos automaticamente com nome e foto** (agenda do celular + pushName).
- **Sessão que não cai**: interceptores no módulo `api.js`, renovação única, bloqueio de "um dispositivo por vez" removido, token de 10 anos.
- **Login por e-mail ou usuário simples**; plano ilimitado.
- **PWA** com ícones próprios, service worker com atualização imediata, tema clean azul, logos em `backend/public/logotipos/`.
- Página de status (`index.php` + coletor por cron) para acompanhar serviços, PM2, banco, conexões e erros.

## 📖 Manual

**[MANUAL.md](MANUAL.md)** — passo a passo completo de **instalação, configuração e uso** (requisitos, banco, .env, PM2, proxy com WebSocket, primeiro acesso, conexão do WhatsApp, usuários, filas, respostas automáticas, campanhas, Kanban, chat interno, API, backup e problemas comuns).

Histórico técnico da implantação na VPS e das correções: [INSTALACAO.md](INSTALACAO.md).

## 🚀 Instalação (resumo)

```bash
# backend
cd backend && cp .env.example .env && npm install --legacy-peer-deps && npm run build
npm run db:migrate && npm run db:seed && pm2 start ecosystem.config.js
# frontend
cd ../frontend && cp .env.example .env && npm install --legacy-peer-deps && npm run build
PORT=6666 pm2 start server.js --name whaticket-frontend
```

Requisitos: Node 20+, PostgreSQL 14+, Redis, PM2, proxy reverso (Apache/Nginx) com WebSocket em `/socket.io/`.


## ❓ Perguntas frequentes

**O que é o ALEQUIZÃO MULT360?** Um CRM de atendimento pelo WhatsApp: vários atendentes usam o mesmo número, com filas, chatbot, respostas automáticas, campanhas e relatórios, instalado no seu próprio servidor (self-hosted).

**É gratuito?** Sim. Código aberto sob licença MIT. Você paga apenas o seu servidor (VPS).

**Precisa da API oficial do WhatsApp (Meta)?** Não. Usa o WhatsApp Web multi-device (Baileys): conecta lendo um QR code, como o WhatsApp Web.

**Quantos atendentes e números posso conectar?** Ilimitados (o plano padrão vem sem limites).

**Funciona no celular?** Sim, é um PWA instalável (Android/iPhone) com notificações sonoras e atualização automática.

**Qual a diferença para o Whaticket original?** Respostas automáticas sem fila, suporte ao identificador LID, contatos automáticos com nome e foto, sessão que não cai, login por seleção de usuário, histórico de edição de contatos, tema e PWA próprios — veja a lista acima e o [MANUAL.md](MANUAL.md).

**Palavras-chave:** atendimento whatsapp, multiatendimento, multi atendentes whatsapp, crm whatsapp, chatbot whatsapp, whaticket, baileys, api whatsapp, disparo em massa whatsapp, campanhas whatsapp, kanban atendimento, help desk whatsapp, sistema de atendimento open source, alternativa multi360, alequizao, alequizão, Maceió, Alagoas.

## 🛠️ Scripts e exemplos de infraestrutura

- [`docs/whaticket-backup.sh`](docs/whaticket-backup.sh) — backup diário do banco + mídias semanais, retenção automática.
- [`docs/whaticket-status.sh`](docs/whaticket-status.sh) — coletor da página de status (`status.json`).
- [`docs/apache-api.conf.example`](docs/apache-api.conf.example) e [`docs/apache-app.conf.example`](docs/apache-app.conf.example) — vhosts Apache com WebSocket.

## 👨‍💻 Desenvolvedor

Sistema desenvolvido sob medida por **Alequizao**.

- **E-mail:** alequizao.dev@gmail.com
- **GitHub:** [@alequizao](https://github.com/alequizao)
- **Instagram:** [@alequizao](https://instagram.com/alequizao) · **WhatsApp:** [(82) 98871-7072](https://wa.me/5582988717072)

Quer um sistema como este para o seu negócio? Entre em contato.

---

© Alequizão · Base Whaticket SaaS (comunidade). Módulos e correções próprios: uso, cópia ou redistribuição somente com autorização.
