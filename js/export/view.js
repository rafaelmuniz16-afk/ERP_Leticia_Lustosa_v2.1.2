(function () {
  'use strict';
  const E = window.ERPExport, D = E.Data, F = E.Filters;
  const dialog = document.getElementById('erpExportDialog'), opener = document.getElementById('erpExportOpen');
  if (!dialog || !opener) return;
  let snapshot, result, filters = F.defaults(), page = 0, timer, controller, busy = false, initialized = false;
  let returnFocus = opener;
  const PAGE_SIZE = 25;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const options = items => (items instanceof Map ? Array.from(items) : Object.entries(items)).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join('');
  const select = (key, label, items, multiple = false) => `<label class="export-field">${label}<select id="ex-${key}" data-field="${key}"${multiple ? ' multiple size="4"' : ''}>${options(items)}</select>${multiple ? `<small>Ctrl/Cmd + clique para várias opções. ${key === 'excludeTypes' ? 'Nenhuma seleção = nenhum tipo excluído.' : 'Nenhuma seleção = sem restrição.'}</small>` : ''}</label>`;
  const input = (key, label, type = 'text', extra = '') => `<label class="export-field">${label}<input id="ex-${key}" data-field="${key}" type="${type}" ${extra}></label>`;
  const textarea = (key, label) => `<label class="export-field">${label}<textarea id="ex-${key}" data-field="${key}" rows="2" spellcheck="false"></textarea></label>`;
  const section = (title, html, open = false) => `<details class="export-section"${open ? ' open' : ''}><summary>${title}</summary><div class="export-section-content">${html}</div></details>`;
  const grid = html => `<div class="export-grid">${html}</div>`;
  const months = new Map(['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'].map((v, i) => [String(i + 1).padStart(2, '0'), v]));
  const weekdays = { 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado', 0: 'Domingo' };
  function initialize() {
    if (initialized) return; initialized = true;
    $('ex-controls').innerHTML =
      section('Período e datas', grid(select('period', 'Período', F.periods) + select('years', 'Ano da data do registro', {}, true)) +
        `<div class="export-grid" id="ex-custom">${input('start', 'Data inicial', 'date')}${input('end', 'Data final', 'date')}</div>` +
        grid(select('reference', 'Mês de referência', months, true) + select('referenceRelation', 'Comparar referência com a data', { all: 'Sem comparação', same: 'Igual ao mês da data', different: 'Diferente do mês da data', invalid: 'Referência ausente / inválida' })) +
        '<p class="export-hint">Mês de referência e data são independentes. O cadastro não possui ano de referência. Sem filtro de data, registros com data inválida também entram.</p>', true) +
      section('Tipo de encerramento', grid(select('types', 'Incluir tipos (OU)', {}, true) + select('excludeTypes', 'Excluir tipos', {}, true))) +
      section('Status Panjud', `<label class="export-field">Atalho<select id="ex-shortcut">${options({ '': 'Escolher um atalho…', all: 'Todos os status', confirmed: 'Confirmados (Sim)', unconfirmed: 'Não confirmados (Não)', refused: 'Recusados (Sim)', notRefused: 'Não recusados (Não)', pending: 'Não confirmados e não recusados', confirmedNotRefused: 'Confirmados e não recusados', conflict: 'Status conflitantes (ambos Sim)', incomplete: 'Status incompletos' })}</select></label>` +
        select('statusMode', 'Leitura dos status', { normalized: 'Normalizada (padrão da exportação)', literal: 'Valores exatos do cadastro (Central de Trabalho)' }) +
        select('workReview', 'Conferência da Central de Trabalho', { false: 'Sem restrição', true: 'Registros para conferência (observações opcionais)' }) +
        grid(select('panjud', 'Encerrado no Panjud', F.statusOps) + select('recusado', 'Recusado no Panjud', F.statusOps)) +
        select('statusIssue', 'Conferência dos status', { all: 'Sem condição adicional', conflict: 'Ambos Sim', incomplete: 'Ao menos um ausente / inválido' })) +
      section('Identificação do processo', grid(select('idOp', 'Condição do ID', F.textOps) + textarea('idValue', 'ID ou lista de IDs')) +
        grid(select('cnjOp', 'Condição do processo', { ...F.textOps, valid: 'CNJ válido', invalid: 'CNJ inválido ou ausente' }) + textarea('cnjValue', 'CNJ ou lista de CNJs')) +
        '<p class="export-hint">Listas: separe por vírgula ou quebra de linha. CNJ aceita pesquisa com ou sem máscara. Duplicidades são conferidas na base inteira, antes dos filtros.</p>') +
      section('Observações', '<p class="export-hint">Cada grupo precisa ser atendido (E). Dentro do grupo, basta uma condição (OU). Use NÃO para inverter uma condição. A busca é textual, sem interpretação por IA.</p><label class="export-check"><input type="checkbox" id="ex-ignoreAccents" data-field="ignoreAccents" checked> Ignorar diferenças de acentuação</label><div id="ex-obs-groups"></div><button type="button" id="ex-add-group">+ Adicionar grupo (E)</button>') +
      section('Filtros avançados', grid(select('dateOp', 'Condição adicional de data', F.dateOps) + input('dateA', 'Data da condição / início', 'date') + input('dateB', 'Fim da condição', 'date') + input('day', 'Dia do mês (1 a 31)', 'number', 'min="1" max="31" step="1"')) +
        grid(select('weekdays', 'Dias da semana (OU)', weekdays, true) + select('dayGroup', 'Grupo de dias', { all: 'Todos', weekdays: 'Segunda a sexta (sem feriados)', saturday: 'Somente sábados', sunday: 'Somente domingos', weekend: 'Finais de semana' })) +
        '<h3>Segmentos do CNJ</h3><p class="export-hint">Apenas CNJs com 20 dígitos e verificador válido. Use códigos; ano do processo é diferente do ano da data de encerramento.</p>' +
        grid(input('cnjYear', 'Ano do processo (4 dígitos)', 'text', 'inputmode="numeric" maxlength="4"') + input('cnjBranch', 'Ramo (1 dígito)', 'text', 'inputmode="numeric" maxlength="1"') + input('cnjCourt', 'Tribunal (2 dígitos)', 'text', 'inputmode="numeric" maxlength="2"') + input('cnjOrigin', 'Origem (4 dígitos)', 'text', 'inputmode="numeric" maxlength="4"')) +
        select('quality', 'Qualidade dos registros (uma ou mais ocorrências: OU)', F.qualityLabels, true) + '<p class="export-hint">Conferência apenas: nenhum dado será corrigido. “Sem ocorrências” inclui observações preenchidas e ausência de todas as condições listadas.</p>') +
      section('Ordenação', grid(select('sort', 'Ordenar primeiro por', F.sortLabels) + select('direction', 'Direção principal', { asc: 'Crescente', desc: 'Decrescente' }) + select('sort2', 'Depois por', F.sortLabels) + select('direction2', 'Direção secundária', { asc: 'Crescente', desc: 'Decrescente' })) + '<p class="export-hint">Empates mantêm a ordem original. Datas inválidas ficam ao final. Excel e PDF usam a mesma seleção e ordem.</p>');
    $('ex-controls').addEventListener('input', onInput);
    $('ex-controls').addEventListener('change', event => { if (event.target.id !== 'ex-shortcut') { clearTimeout(timer); read(); update(); } });
    $('ex-shortcut').addEventListener('change', e => { read(); filters = F.shortcut(filters, e.target.value); fill(); update(); });
    $('ex-add-group').addEventListener('click', () => { read(); filters.obsGroups.push([{ op: 'contains', value: '', not: false }]); renderGroups(); update(); $('ex-obs-groups').lastElementChild?.querySelector('textarea')?.focus(); });
    $('ex-obs-groups').addEventListener('click', event => {
      const b = event.target.closest('button[data-obs-action]'); if (!b) return;
      read(); const gi = +b.dataset.group, ri = +b.dataset.rule;
      if (b.dataset.obsAction === 'add') filters.obsGroups[gi].push({ op: 'contains', value: '', not: false });
      else if (b.dataset.obsAction === 'remove') { filters.obsGroups[gi].splice(ri, 1); if (!filters.obsGroups[gi].length) filters.obsGroups.splice(gi, 1); }
      renderGroups(); update();
    });
  }
  function renderGroups() {
    const box = $('ex-obs-groups'); box.replaceChildren();
    filters.obsGroups.forEach((g, gi) => {
      const group = document.createElement('fieldset'); group.className = 'export-obs-group';
      const legend = document.createElement('legend'); legend.textContent = `${gi ? 'E · ' : ''}Grupo ${gi + 1}`; group.append(legend);
      g.forEach((r, ri) => {
        const row = document.createElement('div'); row.className = 'export-obs-rule'; row.dataset.group = gi; row.dataset.rule = ri;
        row.innerHTML = `<span class="export-operator">${ri ? 'OU' : 'SE'}</span><label class="export-check"><input type="checkbox" data-obs="not"> NÃO</label><label class="export-field">Condição<select data-obs="op">${options(F.obsOps)}</select></label><label class="export-field">Texto / palavras / expressões<textarea rows="2" data-obs="value"></textarea></label><button type="button" data-obs-action="remove" data-group="${gi}" data-rule="${ri}" aria-label="Remover condição ${ri + 1} do grupo ${gi + 1}">✕</button>`;
        row.querySelector('[data-obs=op]').value = r.op; row.querySelector('[data-obs=value]').value = r.value; row.querySelector('[data-obs=not]').checked = r.not; group.append(row);
      });
      const add = document.createElement('button'); add.type = 'button'; add.textContent = '+ Alternativa (OU)'; add.dataset.obsAction = 'add'; add.dataset.group = gi; group.append(add); box.append(group);
    });
  }
  function read() {
    dialog.querySelectorAll('[data-field]').forEach(el => { filters[el.dataset.field] = el.multiple ? Array.from(el.selectedOptions, o => o.value) : el.type === 'checkbox' ? el.checked : el.value; });
    const groups = [];
    dialog.querySelectorAll('.export-obs-rule').forEach(el => { (groups[+el.dataset.group] ||= []).push({ op: el.querySelector('[data-obs=op]').value, value: el.querySelector('[data-obs=value]').value, not: el.querySelector('[data-obs=not]').checked }); });
    filters.obsGroups = groups; filters.workReview = $('ex-workReview').value === 'true';
  }
  function fill() {
    dialog.querySelectorAll('[data-field]').forEach(el => {
      const value = filters[el.dataset.field];
      if (el.multiple) Array.from(el.options).forEach(o => { o.selected = value.includes(o.value); });
      else if (el.type === 'checkbox') el.checked = value; else el.value = String(value);
    }); renderGroups();
  }
  function setOptions(id, values) {
    const el = $(id); el.replaceChildren();
    for (const [value, label] of values) { const o = document.createElement('option'); o.value = value; o.textContent = label; el.append(o); }
  }
  function capture() {
    const ctx = typeof window.obterContextoERP === 'function' ? window.obterContextoERP() : null;
    // Read only the array and existing calendar helper. Never retain keys or the full context.
    const source = ctx?.bd ?? (typeof bd !== 'undefined' ? bd : []);
    const today = typeof getTodayLocal === 'function' ? getTodayLocal() : new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
    snapshot = D.snapshot(source, today, window.ERPProcessCNJ?.isValid);
    const typeSet = new Set([...D.knownTypes, ...snapshot.rows.map(r => r.type), ...filters.types, ...filters.excludeTypes]); typeSet.add('__invalid__');
    const types = Array.from(typeSet).map(t => [t, t === '__invalid__' ? 'Ausente / inválido' : t]);
    setOptions('ex-types', types); setOptions('ex-excludeTypes', types);
    setOptions('ex-years', [...new Set([...snapshot.rows.filter(r => r.date).map(r => r.date.y), ...filters.years.map(Number)])].sort((a, b) => b - a).map(y => [String(y), String(y)]));
    $('ex-source').textContent = `Leitura dos dados disponíveis em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza', dateStyle: 'short', timeStyle: 'short' })}. Nuvem: ${$('sideStatus')?.textContent || 'estado não informado'}. Esta ação não sincroniza nem confirma a atualização do servidor; pode incluir cache local.`;
    fill(); update();
  }
  function onInput() { clearTimeout(timer); timer = setTimeout(() => { read(); update(); }, 120); }
  function update(resetPage = true) {
    if (!snapshot) return;
    if (resetPage) page = 0;
    $('ex-custom').hidden = filters.period !== 'custom';
    $('ex-dateA').disabled = filters.dateOp === 'all'; $('ex-dateB').disabled = !['between', 'outside'].includes(filters.dateOp);
    for (const prefix of ['id', 'cnj']) $('ex-' + prefix + 'Value').disabled = ['all', 'empty', 'filled', 'unique', 'duplicate', 'valid', 'invalid'].includes(filters[prefix + 'Op']);
    dialog.querySelectorAll('.export-obs-rule').forEach(el => { el.querySelector('textarea').disabled = ['empty', 'filled'].includes(el.querySelector('select').value); });
    result = F.run(snapshot, filters);
    const chips = F.chips(filters), container = $('ex-chips'); container.replaceChildren();
    if (!chips.length) container.textContent = 'Nenhum filtro ativo · toda a base disponível.';
    chips.forEach(chip => { const b = document.createElement('button'); b.type = 'button'; b.className = 'export-chip'; b.textContent = chip.label + ' ×'; b.title = 'Remover: ' + chip.label; b.setAttribute('aria-label', b.title); b.addEventListener('click', () => { filters = F.remove(filters, chip); fill(); update(); }); container.append(b); });
    $('ex-count').textContent = `${result.rows.length} encontrados de ${snapshot.rows.length} disponíveis · ${result.rows.length} serão exportados`;
    $('ex-errors').textContent = result.errors.join(' '); $('ex-errors').hidden = !result.errors.length;
    const s = result.stats;
    $('ex-stats').textContent = `${s.types.map(([k, n]) => `${k}: ${n}`).join(' · ')}${s.types.length ? ' · ' : ''}Confirmados: ${s.confirmed} · Recusados: ${s.refused}${s.min ? ' · Datas: ' + D.formatDate(s.min) + ' a ' + D.formatDate(s.max) : ''}${s.invalidDates ? ' · Datas inválidas/ausentes: ' + s.invalidDates : ''}`;
    renderPreview(); updateFormat();
  }
  function renderPreview() {
    const count = result.rows.length, pages = Math.max(1, Math.ceil(count / PAGE_SIZE)); page = Math.min(page, pages - 1);
    const tbody = $('ex-preview-body'); tbody.replaceChildren();
    result.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).forEach(r => {
      const tr = document.createElement('tr');
      D.fields.forEach(k => { const td = document.createElement('td'); const div = document.createElement('div'); div.textContent = k === 'data' ? D.formatDate(r.record[k]) : r.record[k]; td.append(div); tr.append(td); }); tbody.append(tr);
    });
    $('ex-empty').hidden = count > 0;
    $('ex-page').textContent = `Página ${page + 1} de ${pages} · prévia de até ${PAGE_SIZE} registros`;
    $('ex-prev').disabled = page === 0; $('ex-next').disabled = page + 1 >= pages;
    $('ex-generate').disabled = busy || !count || Boolean(result.errors.length);
  }
  function updateFormat() {
    const pdf = $('ex-format').value === 'pdf'; $('ex-summary-label').hidden = pdf;
    $('ex-format-info').textContent = pdf ? 'PDF · A4 retrato · 6 colunas · sem Observações · todos os resultados encontrados.' : 'Excel · 7 colunas · inclui Observações integrais · todos os resultados encontrados.';
  }
  function importDashboard() {
    clearTimeout(timer); filters = F.defaults();
    const value = id => $(id)?.value || '';
    filters.dashboard = { month: typeof getSelectedMonth === 'function' ? getSelectedMonth() : value('filterMonth'), type: value('filterTipo') === 'Todos' ? '' : value('filterTipo'), panjud: value('filterEncerrado') === 'Todos' ? '' : value('filterEncerrado'), query: value('searchInput').trim(), search: 'both', start: value('dateStart'), end: value('dateEnd') };
    fill(); update(); $('ex-status').textContent = 'Filtros do dashboard importados. Confira os chips; o dashboard permanece como estava.';
  }
  function reset() { clearTimeout(timer); filters = F.defaults(); fill(); update(); $('ex-status').textContent = 'Toda a base disponível selecionada, independentemente do dashboard.'; }
  function setBusy(value) { busy = value; $('ex-workspace').disabled = value; $('ex-generate').disabled = value || !result?.rows.length || Boolean(result?.errors.length); $('ex-cancel-job').hidden = !value; dialog.setAttribute('aria-busy', String(value)); }
  async function generate() {
    if (busy) return; clearTimeout(timer); read(); update();
    if (!result.rows.length || result.errors.length) return;
    controller = new AbortController(); const jobController = controller;
    const rows = result.rows.slice(), format = $('ex-format').value;
    const meta = { generatedAt: new Date().toISOString(), generatedLabel: new Date().toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' }), period: F.periodLabel(filters, snapshot.today), stats: result.stats, filters: F.chips(filters).map(c => c.label), filtered: F.chips(filters).length > 0, includeSummary: $('ex-summary').checked, sortLabel: `${F.sortLabels[filters.sort]} (${filters.direction === 'asc' ? 'crescente' : 'decrescente'}); ${F.sortLabels[filters.sort2]} (${filters.direction2 === 'asc' ? 'crescente' : 'decrescente'})` };
    // Observations do not even cross into the PDF worker payload.
    const exportRows = format === 'pdf' ? rows.map(r => ({ ...r, record: { ...r.record, observacoes: '' } })) : rows;
    if (format === 'pdf') meta.filters = [];
    setBusy(true); $('ex-status').textContent = `Gerando ${format.toUpperCase()} com ${rows.length} registros…`;
    try {
      const buffer = await E.Documents.generate(format, exportRows, meta, jobController.signal);
      if (jobController.signal.aborted || !dialog.open) return;
      E.Documents.download(buffer, format, snapshot.today); $('ex-status').textContent = `Arquivo gerado: ${rows.length} registros. Confira o download do navegador.`;
    } catch (error) { $('ex-status').textContent = error.name === 'AbortError' ? 'Exportação cancelada.' : error.message || 'Não foi possível gerar o arquivo. Tente novamente.'; }
    finally { if (controller === jobController) { controller = null; setBusy(false); } }
  }
  function open(options = {}) {
    if (dialog.open) return;
    returnFocus = options.returnFocus || opener;
    if (options.filters) filters = { ...F.defaults(), ...structuredClone(options.filters) };
    initialize(); $('ex-status').textContent = ''; dialog.showModal();
    try { capture(); } catch (e) { $('ex-status').textContent = e.message; $('ex-generate').disabled = true; }
    if (options.filters) $('ex-status').textContent = 'Consulta recebida da Central de Trabalho. Todos os critérios foram transferidos; a base disponível foi relida.';
    $('ex-close').focus();
  }
  E.View = Object.freeze({ open });
  opener.addEventListener('click', () => open());
  $('ex-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(dialog.querySelectorAll('button, input, select, textarea, summary, [tabindex]'))
      .filter(el => !el.matches(':disabled') && el.tabIndex >= 0 && el.getClientRects().length);
    const first = focusable[0], last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  });
  dialog.addEventListener('close', () => { clearTimeout(timer); controller?.abort(); snapshot = null; result = null; $('ex-preview-body').replaceChildren(); if (!document.querySelector('dialog[open]')) returnFocus.focus({ preventScroll: true }); });
  $('ex-clear').addEventListener('click', reset); $('ex-all').addEventListener('click', reset);
  $('ex-dashboard').addEventListener('click', importDashboard);
  $('ex-reload').addEventListener('click', () => { read(); try { capture(); $('ex-status').textContent = 'Dados disponíveis relidos. Nenhuma sincronização foi solicitada.'; } catch (e) { $('ex-status').textContent = e.message; } });
  $('ex-prev').addEventListener('click', () => { page--; renderPreview(); }); $('ex-next').addEventListener('click', () => { page++; renderPreview(); });
  $('ex-format').addEventListener('change', updateFormat);
  $('ex-generate').addEventListener('click', generate); $('ex-cancel-job').addEventListener('click', () => controller?.abort());
})();
