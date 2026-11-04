(() => {
  'use strict';
  let busy = false;
  const cache = new Map();
  function context(m) {
    const allowedBases = { production: 'A produção é medida por registros cadastrados, separados de confirmações no Panjud.' };
    if (!m.production.registered) allowedBases.empty = 'Não há registros na base para o período selecionado.';
    if (m.production.pending) allowedBases.pending = 'Existem registros sem confirmação e sem recusa no Panjud; acompanhar o status pode ajudar.';
    if (m.production.refused) allowedBases.refused = 'Há recusas no Panjud; os dados agregados não informam o motivo.';
    if (m.months.length === 1 && m.months[0].goal !== null) {
      if (m.months[0].remaining === 0) allowedBases.goalReached = 'O acumulado alcança a meta mensal configurada atualmente.';
      else allowedBases.goalProgress = 'O acumulado ainda não alcança a meta mensal configurada atualmente.';
    }
    if (m.comparison) allowedBases[m.comparison.delta > 0 ? 'increase' : m.comparison.delta < 0 ? 'decrease' : 'equal'] =
      'Comparação de cadastros em períodos completos de igual duração, conforme delta calculado. Não é medida de eficiência ou presença.';
    if (m.includeFinance && m.months.some(month => month.finance)) allowedBases.finance = 'A bonificação é um cálculo pelas regras vigentes; não confirma pagamento.';
    return {
      period: { ...m.period }, production: { ...m.production, types: { ...m.production.types } },
      months: m.months.map(month => ({ month: month.key, until: month.until, confirmed: month.confirmed,
        goal: month.goal, percentage: month.percent, remaining: month.remaining, pace: month.pace,
        ...(m.includeFinance ? { finance: month.finance } : {}) })),
      comparison: m.comparison ? { ...m.comparison } : null, includeFinance: m.includeFinance, allowedBases
    };
  }
  function validateComment(item, ctx) {
    if (!item || Object.keys(item).sort().join() !== 'basis,text' || !Object.hasOwn(ctx.allowedBases, item.basis) || typeof item.text !== 'string') return null;
    // Quebras/espaços de apresentação não mudam o conteúdo factual.
    const text = item.text.replace(/\s+/g, ' ').trim();
    const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (text.length < 15 || text.length > 240 || /[\p{N}<>{}%$*`]|https?:|www\./iu.test(text)) return null;
    // Só o ERP escreve quantidades. Não se liberam números livres para corrigir o formato.
    if (/\b(zero|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|treze|catorze|quatorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa|cem|cento|mil|milhao|bilhao|centenas|milhares|milhoes|bilhoes|metade|dobro|triplo|dobrou|triplicou)\b/.test(normalized)) return null;
    if (/\b(um|uma)\s+(registro|caso|encerramento|dia|semana|mes|ano|real|reais|por cento)\b/.test(normalized)) return null;
    const financialClaims = normalized.replace(/\bencerramentos reais\b/g, ''); // Nome operacional já usado no ERP.
    if (!ctx.includeFinance && /bonus|bonifica|financeir|pagamento|remunera|salari|dinheiro|reais|receita|lucro/.test(financialClaims)) return null;

    // Reconhece negações específicas, sem ignorar o restante da frase.
    // "A meta ainda não foi atingida" não afirma "meta atingida".
    const goalNotReached = /\bmeta(?: mensal| configurada| vigente| atual| do mes)*(?: ainda)? nao (?:foi |esta |e )?(?:atingida|alcancada|batida|concluida)\b|\bnao (?:atingiu|alcancou) (?:a |sua )?meta(?: mensal| configurada| vigente| atual)?\b/g;
    if (goalNotReached.test(normalized) && !ctx.allowedBases.goalProgress) return null;
    goalNotReached.lastIndex = 0;
    let claims = normalized.replace(goalNotReached, '');
    // Estas ressalvas explicam os limites da base; não declaram baixa/pagamento.
    claims = claims.replace(/\bnao (?:comprova|significa|representa|confirma|garante|e|equivale a) (?:a |uma |um )?(?:baixa judicial|encerramento judicial|pagamento (?:garantido|confirmado)|valor garantido)\b/g, '');
    if (ctx.production.refused && /\b(?:nao ha|nao existem) recusas?\b|\bos registros estao sem recusas?\b/.test(claims)) return null;
    if (ctx.production.pending && /\b(?:nao ha|nao existem) (?:registros )?pendentes\b/.test(claims)) return null;
    if (!ctx.production.refused) claims = claims.replace(/\b(?:sem|nao ha|nao existem) recusas?\b/g, '');
    if (!ctx.production.pending) claims = claims.replace(/\b(?:sem|nao ha|nao existem) (?:registros )?pendentes\b/g, '');

    if (/recorde|acima da media|abaixo da media|baixa judicial|encerrad[oa]s? judicialmente/.test(claims)) return null;
    if ((ctx.production.pending || ctx.production.refused) && /todos.*confirmad|totalidade.*confirmad|integralmente confirmad/.test(claims)) return null;
    if (/pagamento (garantido|confirmado)|valor garantido|recebera|vai receber|sera pago|garantidamente|horas trabalhadas|faltou ao trabalho|transito em julgado|recusad[oa]s? (por|porque|devido)|causa da recusa/.test(claims)) return null;
    if (!ctx.allowedBases.goalReached && /meta.*(atingida|alcancada|batida|superada|concluida)|atingiu.*meta|alcancou.*meta/.test(claims)) return null;
    if (!ctx.allowedBases.increase && /aument|cresceu|crescimento|melhorou|superior|evolucao positiva/.test(claims)) return null;
    if (!ctx.allowedBases.decrease && /diminui|caiu|queda|inferior|piorou/.test(claims)) return null;
    if (!ctx.allowedBases.refused && /recus/.test(claims)) return null;
    if (!ctx.allowedBases.pending && /pendente|aguardando confirmacao/.test(claims)) return null;
    return text;
  }
  function validate(raw, ctx) {
    if (typeof raw !== 'string' || raw.length > 12000) return null;
    let data;
    // Compatibilidade com uma cerca JSON completa, nunca com prosa arbitrária.
    const source = raw.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/i, '$1');
    try { data = JSON.parse(source); } catch (_) { return null; }
    if (!data || Object.keys(data).join() !== 'comments' || !Array.isArray(data.comments) || !data.comments.length || data.comments.length > 3) return null;
    const seen = new Set(), output = [];
    for (const item of data.comments) {
      const text = validateComment(item, ctx);
      if (!text || seen.has(item.basis)) continue;
      seen.add(item.basis); output.push(text);
    }
    // Aproveita somente os comentários de IA aprovados. Não fabrica fallback de IA.
    return output.length ? output : null;
  }
  async function generate(metrics, { signal } = {}) {
    if (window.AuroraIntegration) {
      const result = await AuroraIntegration.generate(AuroraIntegration.reports(metrics), { signal });
      if (result.source !== 'groq') {
        // A rejected model response is NEVER presented as AI-authored content.
        // The integration already built a safe, read-only local explanation
        // from verified ERP facts. Preserve that explanation for the WhatsApp
        // preview instead of discarding it and showing a misleading error.
        if (result.source === 'local' &&
            ['factual_rejected', 'format_rejected'].includes(result.reason) &&
            typeof result.text === 'string' && result.text.trim() &&
            Array.isArray(result.sections) && result.sections.some(s =>
              Array.isArray(s.paragraphs) && s.paragraphs.some(p => typeof p === 'string' && p.trim()))) {
          return { ...result, integration: true, source: 'local' };
        }
        const codes={missing_key:'NO_API_KEY',chat_busy:'CHAT_BUSY',agent_unavailable:'AURORA_LOAD_FAILED',ai_unavailable:'AURORA_UNAVAILABLE',insufficient_context:'ANALYTICAL_CONTEXT_UNAVAILABLE',api_key_rejected:'GROQ_AUTH',api_forbidden:'GROQ_FORBIDDEN',rate_limited:'GROQ_RATE_LIMIT',timeout:'GROQ_TIMEOUT',schema_unsupported:'GROQ_SCHEMA',request_rejected:'GROQ_REQUEST',provider_unavailable:'GROQ_UNAVAILABLE',format_rejected:'CONTEXTUAL_FORMAT_REJECTED',factual_rejected:'CONTEXTUAL_CONTENT_REJECTED',transport_unavailable:'CONTEXTUAL_NETWORK_ERROR'};
        throw new Error(codes[result.reason]||'CONTEXTUAL_ANALYSIS_UNAVAILABLE');
      }
      return { integration: true, ...result };
    }
    if (busy) throw new Error('REPORT_BUSY');
    if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
    busy = true;
    try {
      const ctx = context(metrics), key = JSON.stringify(ctx), saved = cache.get(key);
      if (saved && Date.now() - saved.at < 5 * 60 * 1000) return [...saved.comments];
      if (window.AuroraAgentReady) await window.AuroraAgentReady;
      if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
      if (!window.AuroraSummaryAI) throw new Error('AI_UNAVAILABLE');
      // Uma única nova tentativa para conteúdo inválido/truncado; não repete
      // falha de chave, rede, recusa ou cancelamento. Cada tentativa mantém
      // os limites/fallback de modelos do transporte existente.
      for (let attempt = 0; attempt < 2; attempt++) {
        if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
        let raw;
        try { raw = await window.AuroraSummaryAI.generate(ctx, { signal, repair: attempt === 1 }); }
        catch (error) {
          if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
          if (attempt === 0 && ['TRUNCATED_REPORT_RESPONSE', 'INVALID_REPORT_RESPONSE'].includes(error.message)) continue;
          throw error;
        }
        if (signal?.aborted) throw new DOMException('Cancelado', 'AbortError');
        const comments = validate(raw, ctx);
        if (!comments) continue;
        cache.set(key, { comments, at: Date.now() });
        if (cache.size > 10) cache.delete(cache.keys().next().value);
        return [...comments];
      }
      throw new Error('INVALID_REPORT_RESPONSE');
    } finally { busy = false; }
  }
  window.ERPWhatsAppAI = Object.freeze({ context, validate, generate });
})();
