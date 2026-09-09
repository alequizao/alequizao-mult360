# Whaticket SaaS — instalação na VPS nova (179.199.136.173)

Desenvolvido por [@alequizao](https://instagram.com/alequizao) · WhatsApp [(82) 98871-7072](https://wa.me/5582988717072)

Documento vivo: cada passo é registrado aqui conforme executado. Data: 2026-09-09.

## Objetivo
Whaticket SaaS equivalente ao plano **Pro** do Multi360 (30 atendentes, supervisores, gestor,
multi-conexões, departamentos/filas, chat interno, etiquetas, respostas rápidas, campanhas em massa,
IA, API de integrações) — mas **sem nenhum limite** (conexões, atendentes, filas, campanhas: ilimitados).

## Endereços
| Item | Valor |
|---|---|
| Frontend | https://zap.alequizao.com (porta local 6666) |
| Backend/API | https://zapapi.alequizao.com (porta local 7777) |
| Pasta | /www/wwwroot/alequizao.com/whaticket |
| Banco MySQL | `whaticket` / usuário `whaticket` / senha `<senha_do_banco>` (aaPanel) |
| Redis | 127.0.0.1:6379 (do sistema, sem senha) |
| Fonte | https://github.com/leopoldohuacasiv/waticketsaas (Whaticket SaaS 10.9, Baileys 6.7.19) |

## Sobre a Evolution API
O Whaticket tem o motor de WhatsApp (Baileys) embutido: o QR code é lido dentro do próprio painel.
Ele **não** tem integração nativa com a Evolution API — a Evolution continua disponível em
`evolution.alequizao.com` para outros sistemas, mas as conexões do Whaticket são gerenciadas por ele mesmo.

## Passo a passo

### 1. Preparação (feito)
- Pasta antiga `/www/wwwroot/alequizao.com/whaticket` (clone dollyzn sem configurar) movida para `_backups/whaticket-clone-dollyzn-2026-09-09`.
- Fonte clonada em `/opt/whaticket-src` e copiada para `/www/wwwroot/alequizao.com/whaticket` (sem `.git`).
- `backend/.env`: `BACKEND_URL=https://zapapi.alequizao.com`, `FRONTEND_URL=https://zap.alequizao.com`, `PORT=7777`, `PROXY_PORT=443`, Redis local, JWT gerados com `openssl rand`, `USER_LIMIT`/`CONNECTIONS_LIMIT=999999`.
- `frontend/.env`: `REACT_APP_BACKEND_URL=https://zapapi.alequizao.com`; `frontend/server.js` passou a escutar na porta 6666.

### 2. Backend (feito)
- `npm install --legacy-peer-deps` + `npm run build` (log `/root/wk-back-install.log`).
- **Banco: PostgreSQL 18 do sistema, não MySQL.** Motivo: o código tem SQL nativo do Postgres (`uuid-ossp`, `::interval`, `jsonb`, `jsonb_array_elements`) no dashboard, campanhas, agendamentos e horário de expediente — em MySQL essas telas quebrariam. O banco MySQL `whaticket` criado no aaPanel ficou vazio (pode ser apagado).
- Role/banco Postgres `whaticket`/`whaticket` (script `/root/pg-setup.sh`); `npm run db:migrate` (40 tabelas) + `npm run db:seed`.
- Plano id 1 renomeado **Ilimitado**: 999.999 usuários/conexões/filas, campanhas, agendamentos, chat interno, API externa, Kanban, OpenAI e integrações ligados. Empresa 1 = "Alequizão", vencimento 2099.
- **Login master: usuário `alequizao` / senha `<senha_master>`** (campo "e-mail" aceita `alequizao`; admin + super).
- PM2: `whaticket-backend` (`backend/ecosystem.config.js`, 1500 MB). Login testado por `POST /auth/login` → token OK.

### 3. Frontend
- `/root/build-front.sh` (setsid/nohup, sobrevive à queda do SSH; log `/root/wk-front-install.log`) → `npm run build` → PM2 `whaticket-frontend` (`server.js`, porta 6666).

### 4. Apache (vhosts porta 80, HTTPS pelo Cloudflare)
- `/www/server/panel/vhost/apache/zap.alequizao.com.conf` → proxy 127.0.0.1:6666.
- `/www/server/panel/vhost/apache/zapapi.alequizao.com.conf` → proxy 127.0.0.1:7777 + websocket `/socket.io/` (mod_proxy_wstunnel).
- `extension/alequizao.com/whaticket.conf`: `alequizao.com/whaticket` vira **página de status** (`index.php` + `status.json` + este `.md`); todo o resto da pasta (código, `.env`, node_modules) bloqueado.
- Reload: `/etc/init.d/httpd reload`.

### 5. Página de status
- `https://alequizao.com/whaticket/` — coletor `/usr/local/bin/whaticket-status.sh` (cron `/etc/cron.d/whaticket-status`, 1/min) grava `status.json`: portas, PM2, HTTP local e pela internet, banco (usuários, conexões, filas, tickets, mensagens, campanhas), conexões WhatsApp e seus estados, load/memória/disco, últimos erros. `?json=1` devolve o JSON.

### Se a sessão cair — como continuar
1. Ver o que já existe: `pm2 list`, `ss -ltnp | grep -E '6666|7777'`, `tail /root/wk-front-install.log`, `ls frontend/build`.
2. Faltando o frontend: `bash /root/build-front.sh` e depois `pm2 start frontend/server.js --name whaticket-frontend` na pasta `frontend` com `PORT=6666`.
3. `pm2 save` e `pm2 startup` já garantem volta no reboot.
4. Testes: `/root/wk-testes.sh` (rotas + login + QR) e `/opt/menu-thumbs/teste-whaticket.js` (Puppeteer).

### 6. Ajustes após os testes (feito)
- `QuickMessageController`: `GET /quick-messages` sem `userId` dava 500 → usa o usuário logado.
- `WhatsAppSessionController`: o start da sessão não fica mais preso esperando o WhatsApp conectar (antes o Cloudflare devolvia 524 após 100 s); o QR chega pelo Socket.IO em ~8 s.
- Crédito "Desenvolvido por @alequizao" (Instagram + WhatsApp) no login, na página de status e aqui.

### 7. Testes executados
- `/root/wk-testes.sh`: login, 19 rotas GET da API (200), criação de conexão, start de sessão, QR code gerado (237 chars, começa com `2@`), exclusão, API externa sem token → 401, frontend `/`, `/login`, `/signup`, `/manifest.json` → 200.
- `/opt/menu-thumbs/teste-whaticket.js` (Puppeteer): login no painel e todas as telas (screenshots em `/root/shots/wk-*.png`).

### 8. Correções de campo (2026-09-09, tarde) — todas aplicadas
- **Mensagem não chegava / erro ao editar contato:** o WhatsApp passou a identificar contatos por **LID** (id interno de 14+ dígitos, ex. `118597485633703`) e o Whaticket salvava esse id como telefone. Correção em 3 camadas: `backend/src/libs/lidCache.ts` (mapa LID→telefone) + `wbot.ts` (todo `sendMessage`/`readMessages`/foto para número de 14+ dígitos vai para `@lid`, e o evento `chats.phoneNumberShare` alimenta o mapa) + `wbotMessageListener.ts` (`resolveLid()` usa `senderPn`/`participantPn` da Baileys 6.7.24 e **funde** o contato salvo com LID no telefone real na próxima mensagem) + `CheckNumber.ts` (LID não passa pelo `onWhatsApp`). Contatos 1 e 2 ainda estão com LID e serão corrigidos sozinhos na próxima mensagem deles.
- **Envio testado:** contato "Alex Gostoso" (5582988717072 → o WhatsApp devolve o número canônico 558288717072) — mensagem entregue (ack 3).
- **Contatos com nome e foto automáticos:** `sincronizarContatos()` escuta `contacts.upsert`, `contacts.update` e `messaging-history.set` (agenda do celular) e cria/atualiza contatos com nome e foto em alta (`profilePictureUrl(jid,"image")`); `CreateOrUpdateContactService` agora troca o nome quando o salvo era só o número e não apaga foto existente.
- **Sessão caindo / "um dispositivo por vez":** os interceptores do axios em `useAuth` eram registrados a cada render (dezenas de `refresh_token` em paralelo) e qualquer 401 deslogava. Agora registram uma vez, um 401/403 tenta renovar o token e repete a requisição, e só desloga se a renovação falhar. Cookie `jrt` com `SameSite=None; Secure; 7 dias` + `trust proxy`. Vários dispositivos logados ao mesmo tempo funcionam.
- **/tickets no celular** abre direto na lista de atendimentos (antes exigia clicar em "Selecionar Ticket").
- **Som de notificação** ligado por padrão (volume 1; ajustável no ícone de volume do topo).
- **PWA "ALEQUIZÃO MULT360":** `manifest.json` (nome, ícones 192/512/maskable, standalone, tema #2f0549), `index.html` (título, metas Apple/Android, pt-BR), ícones gerados do logo do macaco (`frontend/public/*.png`, `src/assets/logo.png`), service worker registrado (react-scripts 3.4). Nome nos "Dispositivos conectados" do celular: `ALEQUIZÃO MULT360`.
- **Instagram/Facebook via token da Meta:** este fork só tem o canal WhatsApp (Baileys). Não há tabela/rotas/canal para Instagram — é um módulo novo a ser desenvolvido (webhook Meta + envio Graph + canal `instagram` nos tickets), não uma configuração.

### 9. Rodada final (2026-09-09, fim de tarde)
- **Sessão definitiva:** interceptores do axios movidos para `frontend/src/services/api.js` (registram no carregamento do módulo — antes viviam no hook `useAuth` e havia uma corrida em que requisições saíam sem token e o app deslogava). Token de acesso **12 h** e refresh **365 dias** (`backend/src/config/auth.ts`, cookie `jrt` 365 dias). Só desloga se o `refresh_token` falhar.
- **Tema clean:** todo `#2f0549` (roxo) virou `#2563EB` (azul); login com fundo cinza-claro em gradiente suave e cartão branco com sombra; `theme_color` do PWA `#2563EB`.
- **Logo e nome no login/cadastro/topo:** o app carrega `BACKEND_URL/public/logotipos/{login,signup,interno}.png` — criados com o logo do macaco + "ALEQUIZÃO MULT360 · atendimento multicanal" (`backend/public/logotipos/`, gerados por PIL). Para trocar, basta substituir esses PNGs (ou usar Configurações → Logotipos no painel).
- **Chatbot sem fila (já suportado, sem alteração de código):** em *Conexões → editar conexão* há os campos **Prompt (OpenAI)** e **Integração (Typebot/n8n/webhook)** e a **Mensagem de saudação**; quando preenchidos na conexão, o bot responde mesmo sem nenhuma fila (`wbotMessageListener.ts` linhas ~2155–2175 e ~2301). Só o *menu de opções* (chatbot de botões) fica dentro de uma fila, porque as opções pertencem à fila.
- **"Tudo estilo AJAX":** o painel é uma SPA React com Socket.IO — tickets, mensagens, contatos, conexões e QR atualizam em tempo real sem recarregar; o que parecia "recarregar" era o logout indevido, já corrigido.
- **Causa raiz do "um dispositivo por vez" (corrigida):** `frontend/src/layout/index.js` escutava o evento `company-<id>-auth` (emitido pelo backend a cada login) e, se era o mesmo usuário, mostrava "Sua conta foi acessada em outro computador", fazia `localStorage.clear()` e recarregava. Bloco removido: o mesmo usuário fica logado em quantos aparelhos quiser. `useAuth` também passou a usar a renovação compartilhada `renovarToken()` (era chamado por 3 componentes da tela de Configurações, disparando 3 `refresh_token` em paralelo).
- **Nome do contato = nome do WhatsApp:** confirmado no banco após a correção (ex.: contato que estava como `118597485633703` virou `🐺` / 558288105432; Eduarda, Jessica, nildaalvesa86 salvos com nome e foto). Quem ainda aparece com número é chat iniciado por nós em que a pessoa ainda não respondeu (o WhatsApp só entrega o pushName quando ela envia algo) — corrige sozinho na primeira resposta.

### 10. Sessão eterna + atualização automática do app (2026-09-09, final)
- **Sessão nunca expira:** token de acesso 7 dias (renovado sozinho) e refresh/cookie `jrt` **10 anos** (`refreshExpiresIn: "3650d"`, `maxAge` 3650 dias). Só sai quem clicar em Sair.
- **Service worker com atualização imediata** (`frontend/src/serviceWorker.js`): build novo → SW novo assume na hora (`SKIP_WAITING`) e a página recarrega uma vez; checa versão a cada 60 s e ao voltar ao primeiro plano. Antes, o app instalado no celular ficava preso ao build antigo (com os bugs de logout) até fechar todas as abas — por isso "continuava deslogando" mesmo depois das correções. **Na primeira vez após este build, fechar o app/aba uma vez** para o SW novo entrar; daí em diante é automático.
- **"Pedindo para reconectar":** a conexão VLT reconecta sozinha em ~5 s quando o socket cai (log: `close` 12:47:56 → `open` 12:48:01); o aviso apareceu nos momentos em que o backend foi reiniciado durante as correções (5 vezes hoje). Nada a corrigir no fluxo de reconexão (`wbot.ts`: só pede QR novo em `loggedOut`/403).
- Ajuste final do SW: recarrega só quando um SW novo substitui um antigo (na primeira instalação não recarrega — isso interrompia o login). Teste final (build 8, 12:58): login OK, 20 telas sem deslogar, 20 navegações seguidas com token preservado, QR em 8 s, envio entregue, status page verde.
