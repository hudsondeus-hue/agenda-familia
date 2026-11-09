// Funções compartilhadas pelas rotas da API (arquivos com "_" não viram rota na Vercel)
// Banco de dados: Upstash Redis (ativado em Vercel → Storage). Cada tabela é um hash "af:<tabela>".

export const TABELAS = ['membros', 'eventos', 'supermercado', 'acoes'];

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('BANCO_NAO_CONECTADO');
  return { url: url.replace(/\/$/, ''), token };
}

// Executa vários comandos Redis numa única chamada
export async function redis(...comandos) {
  const { url, token } = redisEnv();
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

const chave = t => `af:${t}`;

function hashParaLista(arr) {
  const out = [];
  for (let i = 0; i < (arr || []).length; i += 2) {
    try { out.push(JSON.parse(arr[i + 1])); } catch {}
  }
  return out;
}

export async function lerTudo() {
  const res = await redis(...TABELAS.map(t => ['HGETALL', chave(t)]));
  return Object.fromEntries(TABELAS.map((t, i) => [t, hashParaLista(res[i])]));
}

export async function lerTabela(t) {
  const [res] = await redis(['HGETALL', chave(t)]);
  return hashParaLista(res);
}

export async function salvar(t, item) {
  await redis(['HSET', chave(t), item.id, JSON.stringify(item)]);
  return item;
}

export async function obter(t, id) {
  const [v] = await redis(['HGET', chave(t), id]);
  return v ? JSON.parse(v) : null;
}

export async function excluir(t, ids) {
  if (!ids.length) return 0;
  await redis(['HDEL', chave(t), ...ids]);
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
