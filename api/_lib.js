// Funções compartilhadas pelas rotas da API (arquivos com "_" não viram rota na Vercel)

export const TABELAS = ['membros', 'eventos', 'supermercado', 'acoes'];

// ---------- Banco de dados ----------
// Usa Neon Postgres (Vercel → Storage → Neon, plano Free).
// Se houver um Upstash Redis conectado em vez dele, usa o Redis.

const chave = t => `af:${t}`;

// Acha o endereço do banco mesmo que a Vercel tenha posto um prefixo no nome
// (ex.: DATABASE_URL, POSTGRES_URL, STORAGE_DATABASE_URL, NEON_DATABASE_URL...)
export function acharPostgres() {
  const env = process.env;
  const preferidos = ['DATABASE_URL', 'POSTGRES_URL'];
  for (const n of preferidos) if (/^postgres(ql)?:\/\//.test(env[n] || '')) return { nome: n, url: env[n] };
  const nomes = Object.keys(env).filter(n => /^postgres(ql)?:\/\//.test(env[n] || '') && !/UNPOOLED|NON_POOLING|NO_SSL/i.test(n))
    .sort((a, b) => (/DATABASE_URL$/.test(b) - /DATABASE_URL$/.test(a)) || a.length - b.length);
  return nomes.length ? { nome: nomes[0], url: env[nomes[0]] } : null;
}
export function acharRedis() {
  const env = process.env;
  const u = Object.keys(env).find(n => /(KV_REST_API_URL|REDIS_REST_URL)$/.test(n) && /^https:/.test(env[n] || ''));
  if (!u) return null;
  const t = u.replace(/URL$/, 'TOKEN');
  return env[t] ? { nome: u, url: env[u], token: env[t] } : null;
}
const usarRedis = () => !acharPostgres() && !!acharRedis();

// ----- Postgres (Neon) -----
let _sql = null, _pronto = null;
async function pg(texto, params = []) {
  if (!_sql) {
    if (globalThis.__SQL__) _sql = globalThis.__SQL__;            // usado só nos testes
    else {
      const pgEnv = acharPostgres();
      if (!pgEnv) throw new Error('BANCO_NAO_CONECTADO');
      const url = pgEnv.url;
      const { neon } = await import('@neondatabase/serverless');
      const c = neon(url);
      _sql = (t, p) => c.query(t, p);
    }
  }
  if (!_pronto) {
    // Cria a tabela sozinho no primeiro acesso — não precisa rodar SQL à mão
    _pronto = _sql(`create table if not exists registros (
      tabela text not null, id text not null, dados jsonb not null,
      primary key (tabela, id))`, []).catch(e => { _pronto = null; throw e; });
  }
  await _pronto;
  return _sql(texto, params);
}

// ----- Redis (Upstash), alternativa -----
async function redis(...comandos) {
  const r0 = acharRedis();
  if (!r0) throw new Error('BANCO_NAO_CONECTADO');
  const url = r0.url.replace(/\/$/, ''), token = r0.token;
  const r = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(comandos)
  });
  if (!r.ok) throw new Error(`Redis ${r.status}: ${await r.text()}`);
  const res = await r.json();
  const erro = res.find(x => x.error);
  if (erro) throw new Error('Redis: ' + erro.error);
  return res.map(x => x.result);
}
function hashParaLista(arr) {
  const out = [];
  for (let i = 0; i < (arr || []).length; i += 2) { try { out.push(JSON.parse(arr[i + 1])); } catch {} }
  return out;
}

// ----- Operações usadas pelo app -----
export async function lerTudo() {
  if (!acharPostgres() && !acharRedis()) throw new Error('BANCO_NAO_CONECTADO');
  const tudo = Object.fromEntries(TABELAS.map(t => [t, []]));
  if (usarRedis()) {
    const res = await redis(...TABELAS.map(t => ['HGETALL', chave(t)]));
    TABELAS.forEach((t, i) => { tudo[t] = hashParaLista(res[i]); });
    return tudo;
  }
  const rows = await pg('select tabela, dados from registros', []);
  for (const r of rows) if (tudo[r.tabela]) tudo[r.tabela].push(r.dados);
  return tudo;
}

export async function lerTabela(t) {
  if (usarRedis()) { const [res] = await redis(['HGETALL', chave(t)]); return hashParaLista(res); }
  return (await pg('select dados from registros where tabela = $1', [t])).map(r => r.dados);
}

export async function salvar(t, item) {
  if (usarRedis()) { await redis(['HSET', chave(t), item.id, JSON.stringify(item)]); return item; }
  await pg(`insert into registros (tabela, id, dados) values ($1, $2, $3::jsonb)
            on conflict (tabela, id) do update set dados = excluded.dados`, [t, item.id, JSON.stringify(item)]);
  return item;
}

export async function obter(t, id) {
  if (usarRedis()) { const [v] = await redis(['HGET', chave(t), id]); return v ? JSON.parse(v) : null; }
  const rows = await pg('select dados from registros where tabela = $1 and id = $2', [t, id]);
  return rows[0] ? rows[0].dados : null;
}

export async function excluir(t, ids) {
  if (!ids.length) return 0;
  if (usarRedis()) { await redis(['HDEL', chave(t), ...ids]); return ids.length; }
  await pg('delete from registros where tabela = $1 and id = any($2::text[])', [t, ids]);
  return ids.length;
}

// Data de hoje no fuso de Brasília, formato AAAA-MM-DD
export function hojeBR() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

export function limparTelefone(t) {
  const d = String(t || '').replace(/\D/g, '');
  return d ? '+' + d : '';
}

export async function enviarWhatsApp(membro, texto) {
  const phone = limparTelefone(membro.telefone);
  if (!phone || !membro.apikey) {
    return { ok: false, membro: membro.nome, erro: 'sem telefone ou chave CallMeBot' };
  }
  const u = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}` +
            `&text=${encodeURIComponent(texto)}&apikey=${encodeURIComponent(membro.apikey)}`;
  try {
    const r = await fetch(u);
    const resposta = (await r.text()).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
    const ok = r.ok && !/apikey is invalid|error/i.test(resposta);
    return { ok, membro: membro.nome, status: r.status, resposta };
  } catch (e) {
    return { ok: false, membro: membro.nome, erro: String(e.message || e) };
  }
}

export const espera = ms => new Promise(r => setTimeout(r, ms));
