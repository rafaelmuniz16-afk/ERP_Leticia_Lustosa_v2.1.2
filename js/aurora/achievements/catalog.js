/* Aurora Achievements 2.0. Catálogo determinístico; sem rede ou dados pessoais. */
(() => {
  'use strict';
  const VERSION = '2.0.0';
  const totals = [5,10,15,20,30,40,50,65,80,100,125,150,180,220,260,300,350,400,450,500,550,600,650,700,750,800,850,900,950,1000,1100,1200,1300,1400,1500,1600,1700,1800,1900,2000,2150,2300,2450,2600,2750,2900,3050,3200,3350,3500,3750,4000,4250,4500,4750,5000,5250,5500,5750,6000,6400,6800,7200,7600,8000,8400,8800,9200,9600,10000];
  const titles = ["Novato", "Primeiro Passo", "Aprendiz", "Iniciante Dedicado", "Explorador", "Operador em Formação", "Determinado", "Desbravador", "Promessa da Aurora", "Iniciado", "Operador", "Em Ascensão", "Guardião dos Registros", "Persistente", "Analista", "Estrategista Iniciante", "Guardião do Panjud", "Conquistador", "Analista Experiente", "Veterano", "Especialista", "Especialista em Ascensão", "Mestre dos Registros", "Sentinela da Produtividade", "Especialista Sênior", "Estrategista", "Guardião das Metas", "Referência Operacional", "Especialista Supremo", "Especialista de Elite", "Mestre da Consistência", "Mestre do Panjud", "Comandante Operacional", "Guardião da Excelência", "Mestre da Produtividade", "Estrategista Avançado", "Executor de Elite", "Guardião dos Marcos", "Comandante da Aurora", "Mestre Supremo", "Titã da Consistência", "Titã dos Encerramentos", "Arquiteto de Resultados", "Soberano das Metas", "Mestre Lendário", "Guardião Supremo", "Comandante de Elite", "Titã Operacional", "Ícone da Produtividade", "Lenda em Ascensão", "Guardião Lendário", "Titã da Aurora", "Mestre dos Mil Marcos", "Soberano da Consistência", "Arquiteto da Excelência", "Lenda dos Encerramentos", "Mestre dos Recordes", "Guardião do Legado", "Soberano dos Resultados", "Lenda Operacional", "Ascendente Supremo", "Guardião Eterno", "Titã Lendário", "Soberano da Aurora", "Mestre Imortal", "Lenda dos Sete Marcos", "Guardião do Infinito", "Entidade da Aurora", "Lenda Absoluta", "Lenda da Aurora"];
  const stages = ['Primeiros Passos','Aprendizado','Especialização','Alto Desempenho','Maestria','Elite','Lendária'];
  const difficulty = ['Muito fácil a fácil','Fácil a moderada','Moderada','Moderada a difícil','Difícil','Muito difícil','Extremamente difícil'];
  const metrics = {
    total: 'encerramentos acumulados', confirmed: 'confirmações válidas no Panjud',
    onus: 'encerramentos Ônus', acordo: 'encerramentos Acordo', exito: 'encerramentos Êxito', inativacao: 'encerramentos Inativação',
    types: 'tipos diferentes de encerramento', minType: 'encerramentos em cada um dos três tipos',
    diverseMonths: 'meses civis com os três tipos', days: 'dias distintos com produção',
    confirmedDays: 'dias distintos com confirmação válida', weeks: 'semanas distintas com produção',
    months: 'meses civis distintos com produção', years: 'anos distintos com produção',
    streak: 'dias úteis na melhor sequência histórica', daily: 'encerramentos no melhor dia',
    weekly: 'encerramentos na melhor semana', monthly: 'encerramentos no melhor mês civil',
    annual: 'encerramentos no melhor ano', days3: 'dias com pelo menos três encerramentos',
    weeks5: 'semanas com pelo menos cinco encerramentos', months10: 'meses civis com pelo menos dez encerramentos'
  };
  const source = 'Registros disponíveis, sem repetir _uid; data de finalização válida e não futura. Períodos civis por essa data, em todos os anos. Panjud: Sim e recusado: Não, exatamente como cadastrados.';
  const gte = (metric, target) => ({ operator: 'gte', metric, target });
  const all = (...conditions) => ({ operator: 'all', conditions });
  const any = (...conditions) => ({ operator: 'any', conditions });
  function describe(rule) {
    if (rule.operator === 'gte') return Number(rule.target).toLocaleString('pt-BR') + ' ' + metrics[rule.metric];
    return '(' + rule.conditions.map(describe).join(rule.operator === 'all' ? ' E ' : ' OU ') + ')';
  }
  function mission(level, slot, category, title, rule) {
    return { id: 'aa2-l' + String(level).padStart(2,'0') + '-m' + slot, level, category, title,
      description: 'Alcançar ' + describe(rule) + '.', source, ...rule };
  }
  const levels = totals.map((total, i) => {
    const level = i + 1, band = Math.floor(i / 10), days = Math.max(level + 1, Math.ceil(total / 20));
    const confirmed = level === 1 ? 1 : Math.ceil(total * .6);
    // Tipos não são controláveis pelo usuário: sempre há uma rota de consistência.
    const fallback = gte('days', days + Math.ceil(level / 5));
    const type = ['onus','acordo','exito'][i % 3];
    const mix = level === 1 ? gte('types',1) : level % 4 === 0
      ? (level < 24 ? gte('types',3) : level < 48 ? gte('minType',Math.ceil(total * .01)) : gte('diverseMonths',Math.ceil(level / 12)))
      : gte(type, Math.max(1, Math.ceil(total * .03)));
    const consistency = level % 3 === 0
      ? all(gte('days',days), any(gte('streak',Math.min(10,Math.ceil(level / 7))),gte('weeks',Math.ceil(days / 3))))
      : level % 3 === 1 && level > 1 ? all(gte('days',days),gte('confirmedDays',Math.ceil(days * .4))) : gte('days',days);
    const periodRules = [
      any(gte('daily',Math.min(20,Math.max(3,Math.ceil(level / 4) + 2))),gte(level === 1 ? 'days' : 'days3',Math.max(3,Math.ceil(level / 3)))),
      level === 2 ? gte('weekly',5) : any(gte('weekly',Math.min(80,Math.max(5,Math.ceil(total * .15)))),gte('weeks5',Math.ceil(level / 2))),
      level === 3 ? gte('monthly',10) : any(gte('monthly',Math.min(200,Math.max(10,Math.ceil(total * .12)))),gte('months10',Math.ceil(level / 3))),
      any(gte('annual',Math.min(3000,Math.max(15,Math.ceil(total * .3)))),all(gte('years',Math.ceil(level / 24)),gte('total',Math.ceil(total * .8)))),
      any(gte('months10',Math.min(24,Math.ceil(level / 4))),all(gte('weeks',Math.ceil(days / 4)),gte('days',days)))
    ];
    return { id: 'aa2-level-' + String(level).padStart(2,'0'), number: level, title: titles[i],
      icon: { symbol: i % 10, tier: band, id: 'aa2-emblem-' + level }, stage: stages[band],
      difficulty: level === 70 ? 'Conquista máxima' : difficulty[band],
      evolution: 'Etapa ' + stages[band] + ': volume, confirmação, repertório e constância comprovados no histórico.',
      prerequisite: level === 1 ? null : 'aa2-level-' + String(level - 1).padStart(2,'0'),
      missions: [
        mission(level,1,'Acumulado','Trajetória · ' + total,gte('total',total)),
        mission(level,2,'Panjud','Confirmações · ' + confirmed,gte('confirmed',confirmed)),
        mission(level,3,level % 4 === 0 ? 'Diversidade' : 'Tipos','Repertório · ' + level,any(mix,fallback)),
        mission(level,4,level % 3 === 0 ? 'Sequência' : 'Dias produtivos','Constância · ' + level,consistency),
        mission(level,5,['Recorde diário','Semanal','Mensal','Anual','Especial'][i % 5],['Um dia marcante','Uma semana marcante','Um mês marcante','Um ano marcante','Histórico consistente'][i % 5] + ' · ' + level,periodRules[i % 5])
      ] };
  });
  function validate(catalog = levels) {
    const errors = [], ids = new Set(), names = new Set(), icons = new Set(), conditions = new Set();
    const canonical = r => r.operator === 'gte' ? r.metric + '>=' + r.target : r.operator + '(' + r.conditions.map(canonical).sort().join(',') + ')';
    function rule(r, ancestors = new Set()) {
      if (!r || typeof r !== 'object' || ancestors.has(r)) { errors.push('Regra inválida/circular'); return; }
      const next = new Set(ancestors); next.add(r);
      if (r.operator === 'gte') { if (!Object.hasOwn(metrics,r.metric) || !Number.isSafeInteger(r.target) || r.target <= 0 || (r.metric === 'types' && r.target > 3)) errors.push('Métrica ou alvo inválido'); }
      else if (['all','any'].includes(r.operator) && Array.isArray(r.conditions) && r.conditions.length >= 2) r.conditions.forEach(c => rule(c,next));
      else errors.push('Operador inválido');
    }
    if (catalog.length !== 70) errors.push('São necessários 70 níveis');
    catalog.forEach((l,i) => {
      if (l.number !== i+1 || l.id !== 'aa2-level-' + String(i+1).padStart(2,'0') || l.prerequisite !== (i ? catalog[i-1].id : null)) errors.push('Pré-requisito/ordem inválido');
      if (!l.title || names.has(l.title)) errors.push('Título inválido'); names.add(l.title);
      if (!l.icon || !Number.isInteger(l.icon.symbol) || l.icon.symbol < 0 || l.icon.symbol > 9 || l.icon.tier !== Math.floor(i/10) || icons.has(l.icon.id)) errors.push('Ícone inválido'); icons.add(l.icon?.id);
      if (l.missions.length !== 5) errors.push('Cinco missões por nível');
      l.missions.forEach(m => {
        if (!m.id || ids.has(m.id) || m.level !== l.number || !m.description || !m.source) errors.push('Missão inválida'); ids.add(m.id);
        const before = errors.length; rule(m);
        if (errors.length === before) { const c = canonical(m); if (conditions.has(c)) errors.push('Condição repetida: ' + m.id); conditions.add(c); }
      });
    });
    if (ids.size !== 350) errors.push('São necessárias 350 missões únicas');
    return errors;
  }
  function freeze(value) { Object.values(value).forEach(v => { if (v && typeof v === 'object') freeze(v); }); return Object.freeze(value); }
  window.AuroraAchievementCatalog = freeze({ VERSION, levels, metrics, source, describe, validate });
})();
