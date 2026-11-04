(() => {
  'use strict';
  const number = value => Number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const dateLabel = date => date ? date.slice(8, 10) + '/' + date.slice(5, 7) : '—';
  let achievementCatalog = [];
  let dialogBound = false;
  let dialogCloseTimer = null;
  function text(id, value) {
    const el = document.getElementById(id);
    if (el && el.textContent !== String(value)) el.textContent = value;
  }
  function bar(id, value, label) {
    const el = document.getElementById(id);
    if (!el) return;
    const bounded = Math.max(0, Math.min(100, value || 0));
    el.style.setProperty('--live-progress', bounded + '%');
    el.setAttribute('aria-valuenow', String(Math.round(bounded)));
    el.setAttribute('aria-valuetext', label);
  }

  function renderAchievementCatalog() {
    const list = document.getElementById('auroraAchievementsCatalog');
    if (!list) return;
    text('auroraAchievementsCount', achievementCatalog.filter(item => item.unlocked).length + ' de ' + achievementCatalog.length + ' conquistadas');
    list.replaceChildren(...achievementCatalog.map(item => {
      const li = document.createElement('li');
      li.dataset.achievement = item.id;
      li.className = item.unlocked ? 'is-unlocked' : 'is-pending';
      const icon = document.createElement('span');
      icon.className = 'aurora-catalog-icon'; icon.setAttribute('aria-hidden', 'true');
      icon.textContent = item.unlocked ? '✓' : '○';
      const content = document.createElement('div');
      const title = document.createElement('h3'); title.textContent = item.title;
      const status = document.createElement('span'); status.className = 'aurora-catalog-status';
      status.textContent = item.unlocked ? 'Conquistada' : 'Ainda não conquistada';
      const requirement = document.createElement('p'); requirement.textContent = item.requirement;
      content.append(title, status, requirement);
      li.append(icon, content);
      return li;
    }));
  }

  function bind() {
    if (window.AuroraAchievements) { window.AuroraAchievements.bind(); return; }
    const dialog = document.getElementById('auroraAchievementsDialog');
    const opener = document.getElementById('auroraAchievementsOpen');
    const closer = document.getElementById('auroraAchievementsClose');
    if (dialogBound || !dialog || !opener || !closer) return;
    dialogBound = true;
    function finishClose() {
      clearTimeout(dialogCloseTimer); dialogCloseTimer = null;
      if (dialog.open) dialog.close();
      dialog.classList.remove('is-closing');
    }
    function close() {
      if (!dialog.open || dialogCloseTimer !== null) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finishClose(); return; }
      dialog.classList.add('is-closing');
      dialogCloseTimer = setTimeout(finishClose, 160);
    }
    opener.addEventListener('click', () => {
      if (dialog.open) return;
      clearTimeout(dialogCloseTimer); dialogCloseTimer = null;
      dialog.classList.remove('is-closing');
      renderAchievementCatalog();
      dialog.showModal();
      dialog.querySelector('.aurora-catalog-body').scrollTop = 0;
      closer.focus();
    });
    closer.addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    dialog.addEventListener('close', () => {
      clearTimeout(dialogCloseTimer); dialogCloseTimer = null;
      dialog.classList.remove('is-closing');
      if (opener.isConnected) opener.focus({ preventScroll: true });
    });
  }

  function render(m, insights) {
    const card = document.getElementById('sideAuroraCard');
    if (!card) return;
    card.dataset.liveRecord = String(m.isRecord);
    text('auroraLiveDate', 'Hoje · ' + dateLabel(m.today) + '/' + m.year);
    text('auroraPower', m.power === null ? '—' : number(m.power));
    text('auroraPowerRelation', m.delta === null ? 'Histórico em formação' : Math.abs(m.delta) < .05 ? 'Na sua média' : number(Math.abs(m.delta)) + '% ' + (m.delta > 0 ? 'acima' : 'abaixo') + ' da média');
    text('auroraPowerBaseline', m.average === null ? m.historyDays + ' de 3 dias anteriores necessários · ' + number(m.count) + ' encerramento(s) hoje' : number(m.count) + ' encerramentos hoje · média de ' + number(m.average) + '/dia');
    document.getElementById('auroraPowerBaseline').title = 'Média dos últimos ' + m.historyDays + ' dias anteriores com encerramentos, no ano atual (até 20 dias).';
    text('auroraPowerBarNote', m.power === null ? 'Barra aguardando histórico suficiente' : 'Barra completa ao alcançar a média');
    bar('auroraPowerBar', m.power, m.power === null ? 'Histórico insuficiente' : m.power + ' pontos. 100 pontos equivalem à sua média. ' + (m.power >= 100 ? 'Barra completa; a pontuação pode superar 100.' : 'Barra preenchida em ' + m.power + '% até a média.'));
    text('auroraTodayCount', number(m.count));
    text('auroraPersonalBest', number(m.best.total));
    text('auroraBestLabel', 'Melhor dia de ' + m.year + (m.best.date ? ' · ' + dateLabel(m.best.date) : ''));
    text('auroraRecordGap', m.isRecord ? 'Novo recorde! Seu melhor dia anterior tinha ' + number(m.record.total) + '.' : m.toBeat === null ? 'Seu primeiro dia será a referência para os próximos.' : m.count === m.record.total ? 'Recorde anterior igualado. Mais 1 encerramento para superar.' : 'Mais ' + number(m.toBeat) + ' encerramento(s) para superar o melhor dia anterior.');
    bar('auroraRecordBar', m.best.total ? m.count / m.best.total * 100 : 0, m.count + ' hoje; melhor dia com ' + m.best.total);
    text('auroraDailyPace', m.dailyGoal === null ? 'Sem ritmo diário calculado para hoje' : m.todayReal + ' / ' + m.dailyGoal + ' confirmados · ritmo necessário hoje');
    text('auroraMonthGoal', m.goal === null ? 'Meta mensal não configurada' : m.monthReal + ' / ' + number(m.goal) + ' confirmados · mês atual');

    const trend = document.getElementById('auroraTrend');
    const max = Math.max(1, ...m.last7.map(d => d.count || 0));
    const items = m.last7.map(day => {
      const li = document.createElement('li');
      li.className = 'aurora-live-day';
      if (day.date === m.today) li.classList.add('is-today');
      const value = document.createElement('span'); value.className = 'aurora-live-day-value'; value.textContent = day.count === null ? '—' : number(day.count);
      const track = document.createElement('span'); track.className = 'aurora-live-day-track'; track.setAttribute('aria-hidden', 'true');
      const fill = document.createElement('i'); fill.style.height = Math.max(0, (day.count || 0) / max * 100) + '%'; track.append(fill);
      const label = document.createElement('span'); label.textContent = dateLabel(day.date);
      li.setAttribute('aria-label', dateLabel(day.date) + ': ' + (day.count === null ? 'fora do ano atual' : day.count + ' encerramentos'));
      li.append(value, track, label);
      return li;
    });
    trend?.replaceChildren(...items);
    text('auroraTrendDelta', !m.canComparePeriods ? 'A comparação semanal precisa de 14 dias de histórico no ano.' : m.periodDelta === null ? m.recentTotal + ' nos últimos 7 dias completos; período anterior sem registros.' : (m.periodDelta >= 0 ? '+' : '−') + number(Math.abs(m.periodDelta)) + '% · últimos 7 dias completos vs. 7 anteriores');
    text('auroraStreak', m.streak + ' dia(s) útil(eis) seguido(s) com encerramentos');
    text('auroraAnnualTotal', number(m.annualTotal) + ' encerramentos em ' + m.year);
    if (!window.AuroraAchievements && !insights.progression) {
    const milestones = document.getElementById('auroraAchievements');
    const badges = insights.achievements.map(item => {
      const li = document.createElement('li');
      const title = document.createElement('strong'); title.textContent = item.title;
      const detail = document.createElement('span'); detail.textContent = item.detail;
      li.append(title, detail);
      return li;
    });
    if (!badges.length) {
      const li = document.createElement('li'); li.className = 'aurora-live-empty'; li.textContent = 'Os marcos aparecem conforme seu histórico cresce.'; badges.push(li);
    }
    milestones?.replaceChildren(...badges);
    achievementCatalog = insights.achievementCatalog;
    if (document.getElementById('auroraAchievementsDialog')?.open) renderAchievementCatalog();
    }
    text('auroraDateNote', m.invalidDates ? m.invalidDates + ' registro(s) sem data válida não entram nas novas comparações.' : 'Encerramentos por data de finalização · histórico do ano atual');
  }

  function observation(item) {
    if (!item) return;
    text('auroraObservationLabel', item.label);
    text('auroraObservation', item.text);
    text('auroraObservationSource', item.source === 'ai' ? 'Comentário da Aurora · IA' : item.origin === 'fallback' ? 'Leitura local · análise por IA indisponível' : 'Leitura local do ERP');
    const message=document.getElementById('auroraObservation');
    if(message){message.dataset.autonomy=String(item.type==='autonomy');if(item.type==='autonomy')message.setAttribute('tabindex','0');else message.removeAttribute('tabindex');}
    const fact = document.getElementById('auroraObservationFact');
    if (fact) { fact.textContent = item.fact || ''; fact.hidden = !item.fact; }
  }

  function radar(item, index, total) {
    text('sideAuroraMsg', item.text);
    text('auroraRadarPosition', (index + 1) + ' / ' + total);
    text('auroraRadarMonth', 'Mês de análise: ' + monthName(getSelectedMonth()));
  }

  window.AuroraLiveView = Object.freeze({ render, observation, radar, bind });
})();
