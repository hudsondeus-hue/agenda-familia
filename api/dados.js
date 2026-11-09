// API do app: lê e grava os dados da família no Upstash Redis.
// GET  /api/dados                     → todas as tabelas
// POST /api/dados { acao, tabela, ... } → inserir | atualizar | excluir
import { TABELAS, lerTudo, lerTabela, salvar, obter, excluir, apagarArquivos } from './_lib.js';
import { randomUUID } from 'node:crypto';

const CAMPOS = {
  membros: ['nome', 'telefone', 'apikey', 'cor', 'avisar'],
  eventos: ['data', 'hora', 'nome', 'descricao', 'membros'],
  supermercado: ['item', 'quantidade', 'adicionado_por', 'comprado'],
  acoes: ['nome', 'descricao', 'responsavel', 'prazo', 'status']
};
const PADRAO = {
  membros: { cor: '#3b82f6', avisar: true },
  eventos: { hora: null, descricao: null, membros: [], anexos: [] },
  supermercado: { quantidade: null, adicionado_por: null, comprado: false },
  acoes: { descricao: null, responsavel: null, prazo: null, status: 'Pendente' }
};
const limpar = (t, d = {}) => Object.fromEntries(Object.entries(d).filter(([k]) => CAMPOS[t].includes(k)));
const casa = (item, filtro) => Object.entries(filtro).every(([k, v]) => item[k] === v);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return res.status(200).json(await lerTudo());
    if (req.method !== 'POST') return res.status(405).json({ erro: 'método não permitido' });

    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const { acao, tabela, filtro = {} } = b;
    if (!TABELAS.includes(tabela)) return res.status(400).json({ erro: 'tabela inválida' });

    if (acao === 'inserir') {
      const item = { ...PADRAO[tabela], ...limpar(tabela, b.dados), id: randomUUID(), created_at: new Date().toISOString() };
      return res.status(200).json(await salvar(tabela, item));
    }

    // Atualizar/excluir: por id (rápido) ou por outro filtro (ex.: comprado = true)
    let alvos;
    if (filtro.id && Object.keys(filtro).length === 1) {
      const it = await obter(tabela, filtro.id);
      alvos = it ? [it] : [];
    } else {
      alvos = (await lerTabela(tabela)).filter(i => casa(i, filtro));
    }

    if (acao === 'atualizar') {
      for (const it of alvos) await salvar(tabela, { ...it, ...limpar(tabela, b.dados) });
      return res.status(200).json({ alterados: alvos.length });
    }
    if (acao === 'excluir') {
      if (tabela === 'eventos') await apagarArquivos(alvos.flatMap(e => (e.anexos || []).map(a => a.id)));
      return res.status(200).json({ excluidos: await excluir(tabela, alvos.map(i => i.id)) });
    }
    return res.status(400).json({ erro: 'ação inválida' });
  } catch (e) {
    const msg = String(e.message || e);
    return res.status(msg === 'BANCO_NAO_CONECTADO' ? 503 : 500).json({ erro: msg });
  }
}
