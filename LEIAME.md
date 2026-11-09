# Agenda da Família — como colocar no ar

App com 4 abas: **Agenda**, **Supermercado**, **Ações Futuras** e **Família**.
Toda manhã, entre 8h e 9h, cada pessoa recebe no WhatsApp os eventos do dia dela + os da família toda.

Usa apenas **GitHub** + **Vercel** (o banco de dados é o Upstash Redis, ativado dentro da própria Vercel, plano grátis) e o **CallMeBot** (WhatsApp, grátis).

## 1. GitHub
1. github.com → **+** → **New repository** → nome `agenda-familia` → **Create repository**.
2. Clique em **uploading an existing file**, arraste o conteúdo desta pasta (incluindo a pasta `api`) → **Commit changes**.

## 2. Vercel — publicar
1. vercel.com → **Add New… → Project** → **Import** no `agenda-familia`.
2. Em **Environment Variables**, crie `CRON_SECRET` com uma senha qualquer (ex.: `familia2026xyz`).
3. **Deploy**.

## 3. Vercel — criar o banco de dados
1. No projeto, abra a aba **Storage** → **Create Database** (ou *Browse Marketplace*) → **Upstash for Redis** → **Continue**.
2. Escolha o plano **Free**, região **São Paulo** (ou a mais próxima), dê o nome `agenda-familia-db` → **Create**.
3. Na tela seguinte, confirme a conexão com o projeto `agenda-familia` (marque Production, Preview e Development) → **Connect**.
4. Aba **Deployments** → nos **⋯** do último deploy → **Redeploy**.

## 4. Família e WhatsApp
1. Abra o app → aba **Família** → **+** e cadastre cada pessoa (nome e WhatsApp com 55 e DDD).
2. Cada pessoa, no próprio celular: abra https://www.callmebot.com/blog/free-api-whatsapp-messages/, salve o número do bot, mande `I allow callmebot to send me messages` e copie a **APIKEY** que ele responde.
3. Cole a APIKEY no cadastro da pessoa e toque em **Testar**.
4. Em cada celular, escolha em **"Neste aparelho, eu sou"** o próprio nome.

## 5. Instalar no celular
- **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*.
- **Android (Chrome):** menu ⋮ → *Adicionar à tela inicial*.

## Dúvidas comuns
- **Testar o aviso agora:** crie um evento para hoje → Vercel → **Settings → Cron Jobs** → **Run**.
- **Mudar o horário:** em `vercel.json`, `"0 11 * * *"` = 8h de Brasília (UTC−3). Para 7h, `"0 10 * * *"`.
- **Atualização:** o app recarrega sozinho a cada 20 segundos e sempre que você volta para ele.
- **Segurança:** sem login — compartilhe o link só com a família.
- **Limite grátis do Upstash:** 500 mil operações/mês, muito acima do uso de uma família.
