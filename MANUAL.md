# ALEQUIZÃO MULT360 — Manual completo

Guia de **instalação**, **configuração** e **uso** da plataforma de atendimento multicanal via WhatsApp.
Base: Whaticket SaaS 10.9 (Baileys) com módulos e correções próprios (marcados `ALEQUIZAO` no código).

Sumário

1. [Visão geral e arquitetura](#1-visão-geral-e-arquitetura)
2. [Requisitos](#2-requisitos)
3. [Instalação passo a passo](#3-instalação-passo-a-passo)
4. [Proxy reverso (Apache ou Nginx)](#4-proxy-reverso-apache-ou-nginx)
5. [Primeiro acesso](#5-primeiro-acesso)
6. [Configuração inicial do painel](#6-configuração-inicial-do-painel)
7. [Como usar (dia a dia)](#7-como-usar-dia-a-dia)
8. [Módulos próprios do Alequizão](#8-módulos-próprios-do-alequizão)
9. [Atualização, backup e manutenção](#9-atualização-backup-e-manutenção)
10. [Problemas comuns](#10-problemas-comuns)

---

## 1. Visão geral e arquitetura

| Componente | Tecnologia | Porta padrão |
|---|---|---|
| Backend (API + motor WhatsApp + Socket.IO) | Node.js 20+, Express, Sequelize, Baileys | 7777 |
| Frontend (painel React, PWA) | React 17 (react-scripts 3), servido por `frontend/server.js` | 6666 |
| Banco de dados | **PostgreSQL** 14+ (o código tem SQL nativo do Postgres; MySQL não funciona) | 5432 |
| Fila/cache | Redis 6+ | 6379 |
| Processos | PM2 (`whaticket-backend`, `whaticket-frontend`) | — |
| Proxy/HTTPS | Apache ou Nginx na frente (ou Cloudflare) | 80/443 |

Fluxo: o celular com o WhatsApp lê um QR code no painel → o backend mantém a sessão (Baileys) → mensagens entram como **tickets** → atendentes respondem no painel → o backend envia pelo WhatsApp. Tudo em tempo real via Socket.IO.

---

## 2. Requisitos

- Servidor Linux (Ubuntu 22.04+), 2 vCPU, 4 GB RAM (8 GB recomendado), 20 GB de disco.
- Node.js **20 ou superior** (`node -v`), npm.
- PostgreSQL 14+ com um banco e um usuário dedicados.
- Redis.
- PM2: `npm i -g pm2`.
- Dois subdomínios apontando para o servidor, ex.: `app.seudominio.com` (painel) e `api.seudominio.com` (API).
- HTTPS obrigatório (o PWA, o microfone e o cookie de sessão dependem disso). Pode ser certificado próprio ou Cloudflare com proxy ligado.

Instalação rápida das dependências no Ubuntu:

```bash
sudo apt update && sudo apt install -y postgresql redis-server git build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2
```

---

## 3. Instalação passo a passo

### 3.1 Baixar o código

```bash
cd /www/wwwroot            # ou a pasta que preferir
git clone https://github.com/alequizao/alequizao-mult360.git whaticket
cd whaticket
```

### 3.2 Banco de dados PostgreSQL

```bash
sudo -u postgres psql <<'SQL'
CREATE ROLE whaticket LOGIN PASSWORD 'troque_esta_senha';
CREATE DATABASE whaticket OWNER whaticket;
\c whaticket
GRANT ALL ON SCHEMA public TO whaticket;
ALTER SCHEMA public OWNER TO whaticket;
SQL
```

### 3.3 Backend

```bash
cd backend
cp .env.example .env
nano .env
```

Preencha no `.env`:

| Variável | O que colocar |
|---|---|
| `BACKEND_URL` | `https://api.seudominio.com` |
| `FRONTEND_URL` | `https://app.seudominio.com` |
| `PORT` | `7777` (porta interna do backend) |
| `PROXY_PORT` | `443` |
| `DB_DIALECT` / `DB_HOST` / `DB_PORT` | `postgres` / `127.0.0.1` / `5432` |
| `DB_USER` / `DB_PASS` / `DB_NAME` | usuário, senha e banco criados acima |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | gere com `openssl rand -base64 32` (um para cada) |
| `REDIS_URI` | `redis://127.0.0.1:6379` (com senha: `redis://:senha@127.0.0.1:6379`) |
| `USER_LIMIT` / `CONNECTIONS_LIMIT` | `999999` (sem limite) |

Depois:

```bash
npm install --legacy-peer-deps
npm run build
npm run db:migrate      # cria as tabelas
npm run db:seed         # cria empresa, plano e usuário admin iniciais
pm2 start ecosystem.config.js   # processo "whaticket-backend"
pm2 save
```

Teste: `curl -s -X POST http://127.0.0.1:7777/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@admin.com","password":"123456"}'` deve devolver um `token`.

### 3.4 Frontend

```bash
cd ../frontend
cp .env.example .env
nano .env          # REACT_APP_BACKEND_URL=https://api.seudominio.com  e  REACT_APP_NAME_SYSTEM=Nome do sistema
npm install --legacy-peer-deps
npm run build      # leva ~3 min
PORT=6666 pm2 start server.js --name whaticket-frontend
pm2 save
pm2 startup        # copie e execute o comando que ele mostrar (inicia no boot)
```

### 3.5 Logos e ícones (opcional)

- Ícones do PWA e favicon: `frontend/public/*.png`, `frontend/public/manifest.json` (nome curto e cores).
- Logos do login, cadastro e topo: `backend/public/logotipos/login.png`, `signup.png`, `interno.png` (PNG com fundo transparente, ~1000×320 e 600×160).
- Nome no rodapé do login: `nomeEmpresa` em `frontend/package.json`.

Depois de alterar arquivos do frontend, rode `npm run build` e `pm2 restart whaticket-frontend`.

---

## 4. Proxy reverso (Apache ou Nginx)

O backend precisa de **WebSocket** em `/socket.io/`. Exemplos na porta 80 (HTTPS pelo Cloudflare); se o certificado for local, use `*:443` com `SSLEngine on`.

### Apache (módulos `proxy`, `proxy_http`, `proxy_wstunnel`, `rewrite`, `headers`)

```apache
# painel
<VirtualHost *:80>
    ServerName app.seudominio.com
    ProxyPreserveHost On
    RequestHeader set X-Forwarded-Proto "https"
    ProxyPass / http://127.0.0.1:6666/
    ProxyPassReverse / http://127.0.0.1:6666/
</VirtualHost>

# API
<VirtualHost *:80>
    ServerName api.seudominio.com
    ProxyPreserveHost On
    ProxyTimeout 600
    RequestHeader set X-Forwarded-Proto "https"
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule ^/socket.io/(.*) ws://127.0.0.1:7777/socket.io/$1 [P,L]
    ProxyPass / http://127.0.0.1:7777/
    ProxyPassReverse / http://127.0.0.1:7777/
    LimitRequestBody 209715200
</VirtualHost>
```

### Nginx

```nginx
server {
    server_name api.seudominio.com;
    client_max_body_size 200M;
    location / {
        proxy_pass http://127.0.0.1:7777;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 600;
    }
}
server {
    server_name app.seudominio.com;
    location / { proxy_pass http://127.0.0.1:6666; proxy_set_header Host $host; }
}
```

Teste pela internet: `https://app.seudominio.com` abre o login; `https://api.seudominio.com/auth/login` (POST) responde.

---

## 5. Primeiro acesso

1. Abra `https://app.seudominio.com`.
2. Login inicial criado pelo seed: `admin@admin.com` / `123456`. **Troque na hora** em Usuários → editar.
3. Para ter um usuário master simples (ex.: `alequizao`): Usuários → editar → em "E-mail ou usuário" digite o nome desejado (não precisa ser e-mail) e defina a senha.
4. Plano sem limites: no banco, `UPDATE "Plans" SET users=999999, connections=999999, queues=999999, "useCampaigns"=true, "useSchedules"=true, "useInternalChat"=true, "useExternalApi"=true, "useKanban"=true, "useOpenAi"=true, "useIntegrations"=true WHERE id=1;` e `UPDATE "Companies" SET "dueDate"='2099-12-31' WHERE id=1;` (ou pelo painel Empresas, se for super admin).
5. Instale como aplicativo: no celular, "Adicionar à tela inicial"; no Chrome do computador, ícone de instalar na barra de endereço.

---

## 6. Configuração inicial do painel

### 6.1 Conectar o WhatsApp

Conexões → **Adicionar WhatsApp** → nome (ex.: "Loja") → Salvar → botão **QR Code** → no celular: WhatsApp → Dispositivos conectados → Conectar dispositivo → ler o QR. O status muda para **Conectado** em segundos. Pode conectar quantos números quiser (uma conexão por número).

Na mesma tela de edição da conexão ficam as **mensagens automáticas sem fila**:
- Mensagem de saudação (quando o contato inicia conversa).
- Mensagem de conclusão (ao encerrar).
- Mensagem fora de expediente.
- Mensagem de avaliação.
- Prompt (OpenAI) ou Integração (Typebot/n8n/webhook) para um robô responder sozinho.
- Filas vinculadas (opcional).

### 6.2 Usuários e perfis

Usuários → Adicionar: nome, **e-mail ou usuário** (ex.: `joao`), senha e perfil.
- **Admin**: tudo, inclusive excluir contatos/tickets, conexões e configurações.
- **Usuário**: atende, vê todos os atendimentos e contatos, edita contatos, usa chat interno; não exclui.

Na tela de login aparece um **seletor com todos os usuários**; só a senha é digitada.

### 6.3 Filas & Chatbot (opcional)

Filas & Chatbot → Adicionar fila: nome, cor, saudação e (aba Opções) o **menu de opções** do chatbot (1 - Vendas, 2 - Suporte...). Vincule a fila à conexão em Conexões → editar. Sem fila o sistema funciona normalmente; a fila só organiza departamentos e o menu numérico.

### 6.4 Configurações

Configurações: horário de expediente (por empresa ou por fila), avaliação, aceitar grupos, envio de saudação ao aceitar, transferência, tipo de chatbot (texto/botões/lista), integrações (OpenAI, Typebot, n8n, webhook), logotipos, cores.

### 6.5 Etiquetas e Kanban

Etiquetas → Nova → nome, cor e a chave **Kanban** ligada. Cada etiqueta com Kanban vira uma **coluna** no quadro Kanban; arraste os atendimentos entre colunas.

---

## 7. Como usar (dia a dia)

### 7.1 Atendimentos (tickets)

- Abas: **Aguardando** (novos, sem atendente), **Atendendo** (em andamento) e **Resolvidos**. O botão "Todos" já vem ligado: todos os usuários veem todos os atendimentos, novos e antigos.
- **Aceitar** um ticket na aba Aguardando o coloca no seu nome. Você pode **transferir** (para outro atendente ou fila), **encerrar**, **reabrir**, **agendar** mensagem, aplicar **etiquetas**, ver a **ficha do contato** (ícone no topo) e o histórico completo da conversa.
- Enviar: texto, emoji, áudio (microfone), imagens, vídeos, documentos, respostas rápidas (`/atalho`), assinatura do atendente (toggle).
- Notificações: som e badge no menu; ajuste no ícone de volume no topo.

### 7.2 Contatos

Contatos: lista com nome e foto (salvos automaticamente a partir do WhatsApp), busca, importar da agenda do celular, importar/exportar planilha, campos extras. Ao editar, o fim do modal mostra o **Histórico de edições** (quem alterou, quando, campo, valor antigo → novo). Só admin exclui.

### 7.3 Respostas Rápidas

Respostas Rápidas → Adicionar: atalho + mensagem (+ anexo opcional). No chat, digite `/` e escolha.

### 7.4 Campanhas (disparo em massa)

1. Listas de contatos → criar lista e adicionar contatos (manual ou planilha).
2. Campanhas → Nova: nome, conexão, lista, até 5 variações de mensagem (evita bloqueio), agendamento e intervalos (Configurações de campanha: intervalo entre mensagens e pausa a cada N envios).
3. Acompanhe o relatório (enviadas/entregues) na própria campanha.

Use intervalos generosos (20–60 s) e números aquecidos para reduzir risco de bloqueio pelo WhatsApp.

### 7.5 Agendamentos

Agendamentos → Novo: contato, mensagem, data/hora. O envio é feito pelo backend no horário.

### 7.6 Chat Interno

Chat Interno → Nova conversa: título e participantes. Conversa entre usuários da equipe, em tempo real, com anexos.

### 7.7 Kanban

Kanban: arraste os atendimentos entre as colunas (etiquetas Kanban) para acompanhar o funil (ex.: Orçamento → Aguardando pagamento → Concluído).

### 7.8 API externa (integrações)

Conexões → editar → campo **Token**. Com ele:

```bash
curl -X POST https://api.seudominio.com/api/messages/send \
  -H "Authorization: Bearer TOKEN_DA_CONEXAO" -H "Content-Type: application/json" \
  -d '{"number":"5582999999999","body":"Olá! Mensagem via API"}'
```

Mídia: `multipart/form-data` com o campo `medias`. Documentação resumida no menu "API" do painel.

---

## 8. Módulos próprios do Alequizão

### 8.1 Respostas Automáticas por palavra-chave (sem fila)

Menu **Respostas Automáticas** → **+ Nova**:
- **Palavras-chave**: separe por `;` ou vírgula (`areia; areia lavada`). Ignora maiúsculas e acentos.
- **Como comparar**: contém a palavra (padrão, casa em qualquer posição da frase), palavra inteira, começa com, exata ou expressão regular.
- **Resposta**: texto enviado pelo robô; aceita `{{name}}` e `{{firstName}}`.
- **Não repetir por N minutos** para o mesmo contato (0 = sempre).
- **Só sem atendente**: responde apenas se o ticket ainda não foi aceito por alguém.
- **Não acionar saudação/chatbot** depois de responder (ligado por padrão).
- Caixa **Testar**: digite uma frase e veja qual regra casaria.
As regras são avaliadas na ordem da lista; a primeira que casa responde. Só mensagens recebidas (não de grupos).

### 8.2 Suporte a LID (identificador novo do WhatsApp)

Contatos que chegam com o id interno (14+ dígitos) são convertidos para o telefone real automaticamente na próxima mensagem; envio, leitura e foto funcionam nos dois formatos.

### 8.3 Contatos automáticos com nome e foto

A agenda do celular conectado e o nome público (pushName) alimentam os contatos sem cadastro manual; a foto é buscada em alta resolução.

### 8.4 Sessão que não cai

Renovação de token compartilhada, refresh de 10 anos, vários dispositivos ao mesmo tempo. Só sai quem clicar em **Sair**.

### 8.5 Página de status (opcional)

`index.php` + `whaticket-status.sh` (cron por minuto) mostram serviços, PM2, banco, conexões e últimos erros. Ver `INSTALACAO.md` seção 5 para o vhost.

---

## 9. Atualização, backup e manutenção

### Atualizar o código

```bash
cd /www/wwwroot/whaticket && git pull
cd backend && npm install --legacy-peer-deps && npm run build && npm run db:migrate && pm2 restart whaticket-backend
cd ../frontend && npm install --legacy-peer-deps && npm run build && pm2 restart whaticket-frontend
```

O PWA instalado atualiza sozinho em até 60 s (service worker com atualização imediata).

### Backup diário do banco (recomendado)

Pronto para usar: copie [`docs/whaticket-backup.sh`](docs/whaticket-backup.sh) para `/usr/local/bin/`, ajuste a senha e o caminho, `chmod 700`, e agende `30 3 * * * root /usr/local/bin/whaticket-backup.sh` em `/etc/cron.d/whaticket-backup`. Alternativa mínima:

```bash
sudo tee /etc/cron.d/whaticket-backup >/dev/null <<'EOF'
30 3 * * * root mkdir -p /root/backups && PGPASSWORD=SENHA pg_dump -h 127.0.0.1 -U whaticket whaticket | gzip > /root/backups/whaticket-$(date +\%F).sql.gz && find /root/backups -name 'whaticket-*.sql.gz' -mtime +7 -delete
EOF
```

Restaurar: `gunzip -c arquivo.sql.gz | PGPASSWORD=SENHA psql -h 127.0.0.1 -U whaticket whaticket`.

Também faça backup de `backend/public/` (mídias) e `backend/private/` (se existir).

### Comandos úteis

```bash
pm2 list                          # status dos processos
pm2 logs whaticket-backend        # log ao vivo
pm2 restart whaticket-backend     # reinicia (a conexão do WhatsApp reconecta em ~5 s)
redis-cli ping                    # Redis
psql -h 127.0.0.1 -U whaticket -d whaticket -c 'select id,name,status from "Whatsapps"'
```

---

## 10. Problemas comuns

| Sintoma | Causa / solução |
|---|---|
| QR code não aparece | backend fora do ar ou porta 7777 bloqueada; `pm2 logs whaticket-backend`. Aguarde ~10 s após clicar em QR Code. |
| "Desconectado" após reiniciar o servidor | normal por alguns segundos; reconecta sozinho. Se pedir QR de novo, o celular desconectou o dispositivo. |
| Mensagem não chega no cliente | verifique se o número do contato é um telefone (não um código de 14+ dígitos); o sistema corrige na próxima mensagem recebida. |
| Painel desloga sozinho | confira `FRONTEND_URL` no `.env` do backend igual ao domínio do painel (CORS/cookie) e HTTPS ativo. |
| Erro 524/timeout pelo Cloudflare | proxy sem WebSocket em `/socket.io/`; veja a seção 4. |
| Áudio/microfone não grava | o painel precisa estar em HTTPS. |
| Frontend em branco após atualizar | rode `npm run build` no frontend e `pm2 restart whaticket-frontend`; feche e reabra o app uma vez. |
| `npm install` falha | use Node 20+ e `--legacy-peer-deps`. |

---

Desenvolvido por **@alequizao** · [Instagram](https://instagram.com/alequizao) · [WhatsApp (82) 98871-7072](https://wa.me/5582988717072)
