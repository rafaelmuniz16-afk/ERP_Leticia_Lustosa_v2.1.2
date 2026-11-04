(() => {
  'use strict';
  const dates = () => window.AuroraLiveMetrics;
  const fmtDate = value => value.split('-').reverse().join('/');
  const number = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const monthEnd = key => {
    const [y, m] = key.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0, 12)).toISOString().slice(0, 10);
  };
  function range(selection, today) {
    if (!dates().validDate(today)) throw new Error('Data atual indisponível.');
    let start = today, end = today;
    switch (selection.period) {
      case 'today': break;
      case 'yesterday': start = end = dates().shiftDate(today, -1); break;
      case 'week': {
        const day = new Date(today + 'T12:00:00Z').getUTCDay();
        start = dates().shiftDate(today, -((day + 6) % 7)); break;
      }
      case 'month': start = today.slice(0, 7) + '-01'; break;
      case 'custom': start = selection.start; end = selection.end; break;
      default: throw new Error('Selecione um período válido.');
    }
    if (!dates().validDate(start) || !dates().validDate(end)) throw new Error('Informe as duas datas válidas.');
    if (start > end) throw new Error('A data inicial deve ser anterior ou igual à final.');
    if (end > today) throw new Error('O relatório pode incluir datas até hoje.');
    return { start, end };
  }
  function count(rows, meta = 0, month = '') {
    const c = calculateRows(rows, meta, month);
    return { registered: c.quant, confirmed: c.reais, refused: c.recusados,
      pending: c.quant - c.reais - c.recusados, effective: c.totais,
      types: { onus: c.onus, agreement: c.acordo, success: c.exito, inactive: c.inativacao, other: c.quant - c.onus - c.acordo - c.exito - c.inativacao } };
  }
  function build(records, goals, today, selection) {
    const period = range(selection, today);
    const rows = [], warnings = { invalidDates: 0, futureDates: 0, conflictingStatus: 0, referenceDiffers: 0 };
    for (const row of records || []) {
      const date = dates().validDate(row?.data);
      if (!date) { warnings.invalidDates++; continue; }
      if (date > today) { warnings.futureDates++; continue; }
      // Projeção imutável: nenhum dado sensível é necessário para os cálculos.
      // A recusa tem precedência em registros antigos com estados contraditórios.
      rows.push({ data: date, tipo: row.tipo, panjud: row.recusado === 'Sim' ? 'Não' : row.panjud,
        recusado: row.recusado, mesReferencia: getMesCorreto(row), conflict: row.panjud === 'Sim' && row.recusado === 'Sim' });
    }
    const selected = rows.filter(r => r.data >= period.start && r.data <= period.end);
    warnings.conflictingStatus = selected.filter(r => r.conflict).length;
    warnings.referenceDiffers = selected.filter(r => r.mesReferencia !== r.data.slice(5, 7)).length;
    const production = count(selected);
    // Meses com produção e limites do intervalo. Não cria milhares de meses vazios.
    const keys = new Set([period.start.slice(0, 7), period.end.slice(0, 7)]);
    selected.forEach(r => {
      keys.add(r.data.slice(0, 7));
      if (/^(0[1-9]|1[0-2])$/.test(r.mesReferencia)) keys.add(r.data.slice(0, 4) + '-' + r.mesReferencia);
    });
    const months = [...keys].sort().map(key => {
      const year = key.slice(0, 4), month = key.slice(5, 7);
      const until = [period.end, monthEnd(key), today].sort()[0];
      const monthRows = rows.filter(r => r.data.slice(0, 4) === year && r.mesReferencia === month && r.data <= until);
      const configured = Number(goals?.[month]);
      // O ERP não guarda ano/versões da meta: só a configuração do ano atual.
      const goal = year === today.slice(0, 4) && Number.isFinite(configured) && configured > 0 ? configured : null;
      const stats = count(monthRows, goal || 0, month);
      const remaining = goal === null ? null : Math.max(0, goal - stats.confirmed);
      const current = key === today.slice(0, 7) && period.end === today;
      const days = current ? dates().workingDaysRemaining(today) : null;
      const pace = goal !== null && current && days > 0 ? Math.ceil(remaining / days) : null;
      const item = { key, until, ...stats, goal, percent: goal === null ? null : stats.confirmed / goal * 100,
        remaining, days, pace, goalNote: goal === null ? 'Meta histórica/ano indisponível ou não configurada.' : 'Configuração mensal vigente; o ERP não guarda versões da meta.' };
      if (selection.finance) {
        // A única fonte de faixas, valores e multiplicadores é calcFinancial().
        item.finance = goal === null ? null : { calculated: calcFinancial(calculateRows(monthRows, goal, month)).total };
      }
      return item;
    });
    // Somente janelas fechadas de igual duração, com início do histórico anterior à comparação.
    const closed = period.end < today;
    const length = Math.round((Date.parse(period.end + 'T12:00:00Z') - Date.parse(period.start + 'T12:00:00Z')) / 86400000) + 1;
    const previousEnd = dates().shiftDate(period.start, -1), previousStart = dates().shiftDate(period.start, -length);
    const hasHistory = rows.some(r => r.data <= previousStart);
    const previous = rows.filter(r => r.data >= previousStart && r.data <= previousEnd).length;
    const comparison = closed && hasHistory && previous > 0
      ? { start: previousStart, end: previousEnd, registered: previous, delta: (production.registered / previous - 1) * 100 } : null;
    return { period, today, production, months, comparison, warnings, includeFinance: !!selection.finance };
  }
  function format(m, comments = null) {
    const p = m.production;
    const integrated = comments?.integration === true && comments.source === 'groq';
    const localAnalysis = comments?.integration === true && comments.source === 'local'
      && ['factual_rejected', 'format_rejected'].includes(comments.reason)
      && typeof comments.text === 'string' && !!comments.text.trim();
    const detailed = integrated || localAnalysis || Array.isArray(comments) && comments.length > 0;
    const label = m.period.start === m.period.end ? fmtDate(m.period.start) : fmtDate(m.period.start) + ' a ' + fmtDate(m.period.end);
    const lines = [detailed ? '📊 *RELATÓRIO DETALHADO DE PRODUTIVIDADE*' : '📊 *RELATÓRIO DE PRODUTIVIDADE*', '', '📅 *Período:* ' + label,
      '', '✅ *Encerramentos cadastrados no período:* ' + number(p.registered),
      '• Confirmados no Panjud: ' + number(p.confirmed), '• Recusados no Panjud: ' + number(p.refused),
      '• Ainda não confirmados, sem recusa: ' + number(p.pending), '', '📂 *Distribuição dos cadastrados:*',
      '• Ônus: ' + number(p.types.onus), '• Acordo: ' + number(p.types.agreement), '• Êxito: ' + number(p.types.success), '• Inativação: ' + number(p.types.inactive)];
    if (p.types.other) lines.push('• Outros/sem classificação: ' + number(p.types.other));
    if (!p.registered) lines.push('', 'Nenhum registro na base para o período escolhido.');
    lines.push('', '📈 *ACOMPANHAMENTO MENSAL*', 'Acumulados por mês de referência, separados da produção do período.');
    for (const month of m.months) {
      lines.push('', '*' + month.key.slice(5, 7) + '/' + month.key.slice(0, 4) + ' · posição até ' + fmtDate(month.until) + '*',
        '• Encerramentos confirmados no Panjud: ' + number(month.confirmed));
      if (month.goal !== null) {
        lines.push('• Meta mensal configurada: ' + number(month.goal), '• Atingimento: ' + number(month.percent) + '%', '• Restantes para a meta: ' + number(month.remaining));
        if (month.pace !== null) lines.push('• Ritmo restante: ' + number(month.pace) + ' casos/dia · ' + month.days + ' dias de segunda a sexta, incluindo hoje quando útil');
      } else lines.push('• Meta/atingimento: indisponíveis para este mês/ano.');
      if (m.includeFinance) lines.push(month.finance
        ? '• Bonificação calculada acumulada: ' + formatMoney(month.finance.calculated) + ' (regra vigente do ERP; não é confirmação de pagamento)'
        : '• Bonificação: indisponível sem uma meta aplicável.');
    }
    if (m.months.some(month => month.goal !== null)) lines.push('', 'Metas e regras vigentes na consulta; o ERP não mantém versões históricas.');
    lines.push('O ano do acompanhamento é o ano da data registrada; o mês vem da referência do registro.');
    if (m.comparison) lines.push('', '📉 *Comparação de períodos completos*',
      '• ' + fmtDate(m.comparison.start) + ' a ' + fmtDate(m.comparison.end) + ': ' + number(m.comparison.registered) + ' cadastrados',
      '• Variação de cadastrados: ' + (m.comparison.delta > 0 ? '+' : '') + number(m.comparison.delta) + '%');
    if (integrated) lines.push('', '✦ *ANÁLISE DA AURORA*', comments.text);
    else if (localAnalysis) lines.push('', '✦ *LEITURA LOCAL DO ERP*', comments.text,
      '_A resposta da IA não passou na validação; esta leitura utiliza apenas dados verificados do ERP._');
    else if (detailed) lines.push('', '✦ *ANÁLISE DA AURORA*', ...comments.map(text => '• ' + text));
    if (m.warnings.invalidDates || m.warnings.futureDates || m.warnings.conflictingStatus || m.warnings.referenceDiffers) {
      lines.push('', '🔎 *Notas da base*');
      if (m.warnings.invalidDates) lines.push('• ' + m.warnings.invalidDates + ' registro(s) da base sem data válida foram excluídos da análise.');
      if (m.warnings.futureDates) lines.push('• Registros com data futura foram excluídos da análise.');
      if (m.warnings.conflictingStatus) lines.push('• ' + m.warnings.conflictingStatus + ' registro(s) do período têm confirmação e recusa simultâneas; foram contados como recusados.');
      if (m.warnings.referenceDiffers) lines.push('• Há registros do período com mês de referência diferente do mês da data; veja os acumulados identificados acima.');
    }
    lines.push('', 'Datas de encerramento registradas no ERP; cadastro não comprova baixa judicial.', '',
      integrated || Array.isArray(comments) && comments.length > 0
        ? '📌 Relatório gerado com auxílio da Aurora AI — ERP Letícia Lustosa.'
        : localAnalysis
          ? '📌 Relatório do ERP Letícia Lustosa com leitura local, sem análise de IA aprovada.'
          : '📌 Relatório gerado pelo ERP Letícia Lustosa.');
    return lines.join('\n');
  }
  window.ERPWhatsAppMetrics = Object.freeze({ range, build, format, fmtDate });
})();
