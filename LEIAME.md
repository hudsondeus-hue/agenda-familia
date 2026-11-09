# Agenda da Família — como colocar no ar

App com 5 abas: **Agenda**, **Escola** (tarefas escolares), **Supermercado**, **Ações Futuras** e **Família**.
Toda manhã, entre 6h e 7h, cada pessoa recebe no WhatsApp os eventos do dia dela + os da família toda, e as tarefas escolares que vencem hoje ou amanhã.

Usa apenas **GitHub** + **Vercel** (o banco de dados é o Neon Postgres, ativado dentro da própria Vercel, plano grátis) e o **CallMeBot** (WhatsApp, grátis).

## 1. GitHub
1. github.com → **+** → **New repository** → nome `agenda-familia` → **Create repository**.
2. Clique em **uploading an existing file**, arraste o conteúdo desta pasta (incluindo a pasta `api`) → **Commit changes**.

## 2. Vercel — publicar
1. vercel.com → **Add New… → Project** → **Import** no `agenda-familia`.
2. Em **Environment Variables**, crie `CRON_SECRET` com uma senha qualquer (ex.: `familia2026xyz`).
3. **Deploy**.

## 3. Vercel — criar o banco de dados (Neon, grátis)
1. No projeto, abra a aba **Storage** → **Create Database** → **Neon** → **Continue**.
2. Escolha o plano **Free**, região **São Paulo** (ou a mais próxima), nome `agenda-familia-db` → **Create**.
3. Confirme a conexão com o projeto `agenda-familia` (Production, Preview e Development marcados) → **Connect**.
4. Aba **Deployments** → nos **⋯** do último deploy → **Redeploy**.

Não precisa criar tabelas: o app cria tudo sozinho no primeiro acesso.

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
- **Mudar o horário:** em `vercel.json`, `"0 9 * * *"` = 6h de Brasília (UTC−3). No plano grátis a Vercel dispara em algum minuto dentro dessa hora (6h00–6h59). Para 7h, `"0 10 * * *"`.
- **Atualização:** o app recarrega sozinho a cada 20 segundos e sempre que você volta para ele.
- **Segurança:** sem login — compartilhe o link só com a família.
- **Plano grátis do Neon:** 0,5 GB de dados — anos de uso para uma família.
