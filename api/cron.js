// Roda todo dia de manhã (ver vercel.json) e manda no WhatsApp os eventos do dia.
// Cada membro recebe os eventos marcados para ele + os eventos da família toda.
import { lerTudo, hojeBR, enviarWhatsApp, espera } from './_lib.js';

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export default async function handler(req, res) {
  // A Vercel envia "Authorization: Bearer <CRON_SECRET>" nas execuções agendadas.
  const segredo = process.env.CRON_SECRET;
  if (segredo && req.headers.authorization !== `Bearer ${segredo}`) {
    return res.status(401).json({ erro: 'não autorizado' });
  }

  try {
    const hoje = (req.query && req.query.data) || hojeBR();
    const tudo = await lerTudo();
    const eventos = tudo.eventos.filter(e => e.data === hoje)
      .sort((x, y) => (x.hora || '').localeCompare(y.hora || ''));
    const membros = tudo.membros.filter(m => m.avisar !== false);
    const nomePorId = Object.fromEntries(tudo.membros.map(x => [x.id, x.nome]));

    if (!eventos.length) return res.status(200).json({ hoje, eventos: 0, enviados: [] });

    const [a, m, d] = hoje.split('-').map(Number);
    const diaSemana = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];

    const dominio = process.env.VERCEL_PROJECT_PRODUCTION_URL || req.headers['x-forwarded-host'] || req.headers.host;
    const base = dominio ? `https://${dominio}` : '';
    const enviados = [];
    for (const membro of membros) {
      const meus = eventos.filter(e => !e.membros || !e.membros.length || e.membros.includes(membro.id));
      if (!meus.length) continue;

      const linhas = meus.map(e => {
        const hora = e.hora ? e.hora.slice(0, 5) : 'Dia todo';
        const quem = e.membros && e.membros.length
          ? e.membros.map(id => nomePorId[id]).filter(Boolean).join(', ')
          : 'Família toda';
        let t = `⏰ *${hora}* — *${e.nome}*\n👤 ${quem}`;
        if (e.descricao) t += `\n📝 ${e.descricao}`;
        for (const anx of e.anexos || []) {
          t += `\n📎 ${anx.nome}`;
          if (base) t += `: ${base}/api/arquivo?id=${anx.id}&nome=${encodeURIComponent(anx.nome)}&tipo=${encodeURIComponent(anx.tipo)}`;
        }
        return t;
      });

      const texto =
        `Bom dia, ${membro.nome}! ☀️\n` +
        `📅 *Agenda da Família — ${diaSemana}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}*\n\n` +
        linhas.join('\n\n');

      enviados.push(await enviarWhatsApp(membro, texto));
      await espera(1500); // evita bloqueio por excesso de mensagens seguidas
    }

    return res.status(200).json({ hoje, eventos: eventos.length, enviados });
  } catch (e) {
    return res.status(500).json({ erro: String(e.message || e) });
  }
}
