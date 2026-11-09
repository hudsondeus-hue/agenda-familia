// Botão "Testar WhatsApp" da aba Família: manda uma mensagem de teste para um membro.
import { obter, enviarWhatsApp } from './_lib.js';

export default async function handler(req, res) {
  const id = req.query && req.query.id;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).json({ erro: 'membro inválido' });
  try {
    const membro = await obter('membros', id);
    if (!membro) return res.status(404).json({ erro: 'membro não encontrado' });
    const r = await enviarWhatsApp(membro, `✅ Teste da *Agenda da Família*: tudo certo, ${membro.nome}! Você vai receber aqui os eventos do dia, toda manhã.`);
    return res.status(r.ok ? 200 : 502).json(r);
  } catch (e) {
    return res.status(500).json({ erro: String(e.message || e) });
  }
}
