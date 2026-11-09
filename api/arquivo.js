// Anexos dos eventos.
// POST   /api/arquivo  { evento_id, nome, tipo, base64 } → anexa ao evento
// GET    /api/arquivo?id=...                              → abre/baixa o arquivo
// DELETE /api/arquivo?id=...&evento=...                   → remove o anexo
import { obter, salvar, gravarArquivo, lerArquivo, apagarArquivos } from './_lib.js';
import { randomUUID } from 'node:crypto';

const LIMITE = 3.3 * 1024 * 1024; // ~3 MB por arquivo (limite de envio da Vercel é 4,5 MB)
const uuid = v => /^[0-9a-f-]{36}$/i.test(v || '');

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const id = req.query.id;
      if (!uuid(id)) return res.status(400).send('anexo inválido');
      const b64 = await lerArquivo(id);
      if (!b64) return res.status(404).send('anexo não encontrado');
      const nome = String(req.query.nome || 'anexo').replace(/["\r\n]/g, '');
      const tipo = String(req.query.tipo || 'application/octet-stream').replace(/[^\w.+\/-]/g, '');
      res.setHeader('Content-Type', tipo || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(nome)}`);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.status(200).send(Buffer.from(b64, 'base64'));
    }

    if (req.method === 'POST') {
      const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      if (!uuid(b.evento_id) || !b.base64) return res.status(400).json({ erro: 'dados incompletos' });
      const bytes = Math.floor(String(b.base64).length * 3 / 4);
      if (bytes > LIMITE) return res.status(413).json({ erro: 'arquivo maior que 3 MB' });
      const ev = await obter('eventos', b.evento_id);
      if (!ev) return res.status(404).json({ erro: 'evento não encontrado' });
      const meta = { id: randomUUID(), nome: String(b.nome || 'anexo').slice(0, 120), tipo: String(b.tipo || 'application/octet-stream').slice(0, 100), tamanho: bytes };
      await gravarArquivo(meta.id, b.base64);
      await salvar('eventos', { ...ev, anexos: [...(ev.anexos || []), meta] });
      return res.status(200).json(meta);
    }

    if (req.method === 'DELETE') {
      const { id, evento } = req.query;
      if (!uuid(id) || !uuid(evento)) return res.status(400).json({ erro: 'dados incompletos' });
      const ev = await obter('eventos', evento);
      if (ev) await salvar('eventos', { ...ev, anexos: (ev.anexos || []).filter(a => a.id !== id) });
      await apagarArquivos([id]);
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ erro: 'método não permitido' });
  } catch (e) {
    return res.status(500).json({ erro: String(e.message || e) });
  }
}
