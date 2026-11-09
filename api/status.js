// Diagnóstico: mostra se o app está enxergando o banco de dados.
// Lista só os NOMES das variáveis (nunca os valores/senhas).
import { acharPostgres, acharRedis, lerTudo } from './_lib.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const nomes = Object.keys(process.env)
    .filter(n => /DATABASE|POSTGRES|^PG|NEON|KV_|REDIS|UPSTASH/i.test(n) && !/^VERCEL_/.test(n))
    .sort();
  const pg = acharPostgres(), rd = acharRedis();
  const out = {
    banco: pg ? `Postgres (variável ${pg.nome})` : rd ? `Redis (variável ${rd.nome})` : 'nenhum encontrado',
    variaveis_encontradas: nomes,
    ambiente: process.env.VERCEL_ENV || 'desconhecido',
    conexao: 'não testada'
  };
  if (pg || rd) {
    try {
      const t = await lerTudo();
      out.conexao = 'OK';
      out.registros = Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.length]));
    } catch (e) { out.conexao = 'ERRO: ' + String(e.message || e).slice(0, 200); }
  }
  res.status(200).json(out);
}
