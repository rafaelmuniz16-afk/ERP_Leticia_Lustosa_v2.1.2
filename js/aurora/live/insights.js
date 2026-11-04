(() => {
  'use strict';
  const number = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const financialCategories = ['projecao', 'meta', 'financeiro', 'financeiro', 'meta', 'produtividade', 'panjud', 'panjud', 'financeiro', 'financeiro', 'financeiro', 'panjud', 'calendario', 'distribuicao', 'meta'];

  function financial(messages) {
    return messages.map((text, index) => ({ id: 'radar-' + index, category: financialCategories[index] || 'financeiro', priority: 10, source: 'erp', text }));
  }

  // Catálogo declarativo: adicionar um marco não exige alterar o renderizador.
  const achievements = [
    { id: 'cases-50', title: '50 encerramentos', test: m => m.annualTotal >= 50, detail: m => '50 ou mais encerramentos em ' + m.year,
      requirement: m => 'Registrar pelo menos 50 encerramentos em ' + m.year + '. Atual: ' + number(m.annualTotal) + '.' },
    { id: 'cases-100', title: '100 encerramentos', test: m => m.annualTotal >= 100, detail: m => '100 ou mais encerramentos em ' + m.year,
      requirement: m => 'Registrar pelo menos 100 encerramentos em ' + m.year + '. Atual: ' + number(m.annualTotal) + '.' },
    { id: 'monthly-goal', title: 'Meta do mês', test: m => m.monthlyGoalReached, detail: m => number(m.monthReal) + ' confirmados de ' + number(m.goal),
      requirement: m => m.goal === null ? 'Configurar e atingir a meta do mês atual com encerramentos confirmados no Panjud. Nenhuma meta configurada.' : 'Atingir a meta de ' + number(m.goal) + ' confirmados no Panjud no mês atual. Atual: ' + number(m.monthReal) + '.' },
    { id: 'personal-record', title: 'Novo recorde hoje', test: m => m.isRecord, detail: m => number(m.count) + ' encerramentos hoje',
      requirement: m => m.record.date ? 'Superar hoje o melhor dia anterior de ' + m.year + ': ' + number(m.record.total) + ' encerramentos. Hoje: ' + number(m.count) + '.' : 'Superar hoje o melhor dia anterior do ano. É necessário um dia anterior com encerramentos para comparação.' },
    { id: 'streak-5', title: 'Constância', test: m => m.streak >= 5, detail: m => m.streak + ' dias úteis seguidos com encerramentos',
      requirement: m => 'Manter 5 dias úteis seguidos com encerramentos. Sequência atual: ' + m.streak + '. Hoje sem registros ainda não interrompe a sequência anterior.' }
  ];

  const definitions = [
    { type: 'personal-record', category: 'recorde', priority: 100, label: 'Novo recorde do ano', test: m => m.isRecord,
      text: m => 'Novo recorde de ' + m.year + ': ' + number(m.count) + ' encerramentos hoje. Seu melhor dia anterior tinha ' + number(m.record.total) + '. Um avanço para comemorar.' },
    { type: 'monthly-goal', category: 'meta', priority: 95, label: 'Meta mensal atingida', test: m => m.monthlyGoalReached,
      text: m => 'Meta mensal atingida: ' + number(m.monthReal) + ' confirmados no Panjud, para uma meta de ' + number(m.goal) + '. Excelente conquista.' },
    { type: 'daily-goal', category: 'meta', priority: 85, label: 'Ritmo diário alcançado', test: m => m.dailyGoalReached,
      text: m => 'Você alcançou o ritmo necessário de hoje: ' + number(m.todayReal) + ' confirmados no Panjud para uma referência de ' + number(m.dailyGoal) + '.' },
    { type: 'cases-100', category: 'marco', priority: 80, label: 'Marco de 100 encerramentos', test: m => m.annualTotal >= 100,
      text: m => 'Você já soma ' + number(m.annualTotal) + ' encerramentos em ' + m.year + '. O marco de 100 faz parte dessa história.' },
    { type: 'cases-50', category: 'marco', priority: 75, label: 'Marco de 50 encerramentos', test: m => m.annualTotal >= 50,
      text: m => 'O marco de 50 chegou: ' + number(m.annualTotal) + ' encerramentos em ' + m.year + '. Cada caso conta.' },
    { type: 'streak-5', category: 'consistencia', priority: 70, label: 'Sequência de produtividade', test: m => m.streak >= 5,
      text: m => 'São ' + m.streak + ' dias úteis seguidos com encerramentos. Consistência também merece reconhecimento.' },
    { type: 'above-average', category: 'desempenho', priority: 60, label: 'Acima da média', test: m => m.delta !== null && m.delta >= 25,
      text: m => 'Hoje você está ' + number(m.delta) + '% acima da média de ' + m.historyDays + ' dias anteriores com encerramentos. Bom ritmo, Leticia.' },
    { type: 'near-record', category: 'historico', priority: 50, label: 'Perto do melhor dia', test: m => m.record.total >= 10 && m.count >= Math.ceil(m.record.total * .9) && m.count <= m.record.total,
      text: m => 'Seu melhor dia está perto: mais ' + number(m.toBeat) + ' encerramento(s) superam o recorde anterior de ' + number(m.record.total) + '. No seu ritmo.' }
  ];

  function eventId(type, m) {
    if (type === 'monthly-goal') return type + ':' + m.year + '-' + m.month;
    if (type.startsWith('cases-')) return type + ':' + m.year;
    return type + ':' + m.today;
  }

  function events(m) {
    return definitions.filter(d => d.test(m)).map(d => ({
      id: eventId(d.type, m), type: d.type, category: d.category, priority: d.priority,
      label: d.label, text: d.text(m), source: 'erp'
    }));
  }

  function common(m) {
    if (m.count === 0) return { label: 'Acompanhando o dia', text: 'Ainda não há encerramentos com a data de hoje. Quando eles chegarem, eu acompanho seu progresso por aqui.', source: 'erp' };
    if (m.average === null) return { label: 'Construindo sua referência', text: 'Hoje já tem ' + number(m.count) + ' encerramento(s). A comparação com a média aparece a partir de três dias anteriores com registros.', source: 'erp' };
    const relation = Math.abs(m.delta) < .05 ? 'na média' : number(Math.abs(m.delta)) + '% ' + (m.delta > 0 ? 'acima' : 'abaixo') + ' da média';
    return { label: 'Seu dia em andamento', text: 'Até agora, ' + number(m.count) + ' encerramento(s): ' + relation + ' dos dias anteriores. Essa é uma comparação parcial, sem cobrança de ritmo.', source: 'erp' };
  }

  function context(event, m) {
    const tokens = {
      hoje: number(m.count), ano: m.year, total_ano: number(m.annualTotal),
      recorde_anterior: number(m.record.total), panjud_hoje: number(m.todayReal),
      panjud_mes: number(m.monthReal), sequencia: number(m.streak)
    };
    if (m.average !== null) { tokens.media = number(m.average); tokens.percentual = number(Math.abs(m.delta)) + '%'; }
    if (m.goal !== null) tokens.meta = number(m.goal);
    if (m.dailyGoal !== null) tokens.ritmo_diario = number(m.dailyGoal);
    if (m.toBeat !== null) tokens.faltam_recorde = number(m.toBeat);
    return {
      evento: event.type, descricao: event.label, fatoConfirmado: event.text,
      data: m.today, escopo: 'Data de finalização; mesmo ano; hoje ainda em andamento.',
      flags: { recorde: m.isRecord, metaMensal: m.monthlyGoalReached, ritmoDiario: m.dailyGoalReached, acimaMedia: m.delta !== null && m.delta > 0 },
      tokens
    };
  }

  function build(m, messages, progression = null) {
    // Uma única avaliação alimenta o painel e o catálogo, inclusive os pendentes.
    const achievementCatalog = progression ? progression.levels.flatMap(l => l.missions.map(a => ({
      id: a.id, title: a.title, detail: a.description, requirement: a.description, unlocked: a.unlocked, level: l.number, progress: a.percent
    }))) : achievements.map(a => ({
      id: a.id, title: a.title, detail: a.detail(m), requirement: a.requirement(m), unlocked: a.test(m)
    }));
    return {
      financial: financial(messages), events: events(m), common: common(m), progression,
      achievements: achievementCatalog.filter(a => a.unlocked), achievementCatalog
    };
  }

  window.AuroraLiveInsights = Object.freeze({ build, financial, events, common, context, definitions, achievements });
})();
