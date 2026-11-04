(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./data.js') : root.ERPExport.Data);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ERPExport.Excel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  const navy = 'FF162C48', line = 'FFDCE3EC';
  // OOXML uses _xHHHH_ escapes. Escape literal sequences first, then XML controls.
  // Otherwise readers can turn a user-written "_x0041_" into "A", strip controls,
  // or normalize CRLF. The stored cell stays a string, never a formula.
  const xmlText = value => String(value)
    .replace(/_x[\da-f]{4}_/gi, match => '_x005F_' + match.slice(1))
    .replace(/[\u0000-\u0008\u000b-\u001f\ufffe\uffff]/g, c => '_x' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') + '_');
  async function generate(rows, meta, ExcelJS, yieldTask = () => Promise.resolve()) {
    if (!rows.length) throw new Error('Nenhum registro encontrado para exportar.');
    if (rows.length > 1048573) throw new Error('A seleção excede o limite de linhas de uma planilha Excel. Reduza o período.');
    // Excel has a hard cell limit; reject instead of silently losing original content.
    rows.forEach((r, i) => D.fields.forEach(k => { if (r.record[k].length > 32767) throw new Error(`Registro ${i + 1}: o campo ${k} excede 32.767 caracteres, limite do Excel. Nenhum arquivo foi gerado.`); }));
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ERP Leticia Lustosa'; wb.created = new Date(meta.generatedAt);
    const ws = wb.addWorksheet('Encerramentos', { views: [{ state: 'frozen', ySplit: 3, topLeftCell: 'A4', activeCell: 'A4' }] });
    const widths = [19, 29, 23, 14, 22, 22, 60];
    widths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });
    ws.mergeCells('A1:G2'); const title = ws.getCell('A1'); title.value = 'ERP LETICIA LUSTOSA';
    title.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } };
    title.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 25; ws.getRow(2).height = 22;
    const header = ws.getRow(3); header.values = D.headers; header.height = 34;
    header.eachCell(c => {
      c.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF314B69' } };
      c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    });
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i], values = D.fields.map(k => xmlText(r.record[k]));
      if (r.date && r.date.y >= 1900) values[3] = new Date(r.date.ordinal * 86400000);
      const row = ws.addRow(values);
      row.eachCell({ includeEmpty: true }, (cell, column) => {
        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FF24364C' } };
        cell.alignment = { vertical: 'middle', horizontal: [4, 5, 6].includes(column) ? 'center' : 'left', wrapText: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 ? 'FFF1F5F9' : 'FFFFFFFF' } };
        cell.border = { bottom: { style: 'hair', color: { argb: line } } };
        // Explicit strings: =, +, -, @ remain ordinary text, never formula objects.
        cell.numFmt = column === 4 && values[3] instanceof Date ? 'dd/mm/yyyy' : '@';
        if ([5, 6].includes(column)) {
          const status = D.status(cell.value);
          if (status !== 'invalid') cell.font = { ...cell.font, color: { argb: status === 'sim' ? 'FF205D49' : 'FF6A5260' } };
        }
      });
      const lines = Math.max(...D.fields.map((k, col) => r.record[k].split('\n').reduce((n, s) => n + Math.max(1, Math.ceil(s.length / Math.max(8, widths[col] - 2))), 0)));
      row.height = Math.min(409, Math.max(27, lines * 15 + 10));
      if (i % 250 === 0) await yieldTask();
    }
    ws.autoFilter = { from: 'A3', to: `G${rows.length + 3}` };
    ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:3' };
    if (meta.includeSummary) {
      const summary = wb.addWorksheet('Resumo da Exportação'); summary.columns = [{ width: 29 }, { width: 90 }];
      const info = [['Resumo da Exportação', 'ERP LETICIA LUSTOSA'], ['Geração', meta.generatedLabel], ['Base', 'Cópia dos dados disponíveis no ERP; sem sincronização adicional'], ['Período', meta.period], ['Registros', rows.length], ['Confirmados (Sim)', meta.stats.confirmed], ['Recusados (Sim)', meta.stats.refused], ['Ordenação', meta.sortLabel], ...meta.filters.map(s => ['Filtro', s]), ...meta.stats.types.map(([k, n]) => ['Tipo: ' + k, n])];
      const summaryRows = info.flatMap(([label, value]) => typeof value === 'string' && value.length > 32767
        ? Array.from({ length: Math.ceil(value.length / 32767) }, (_, i) => [label + (i ? ' (continuação)' : ''), value.slice(i * 32767, (i + 1) * 32767)]) : [[label, value]]);
      summaryRows.forEach((v, i) => { const r = summary.addRow(v.map(x => typeof x === 'string' ? xmlText(x) : x)); r.height = Math.min(409, Math.max(25, Math.ceil(String(v[1]).length / 85) * 15 + 10)); r.eachCell(c => { c.font = { name: 'Calibri', size: i ? 11 : 14, bold: !i, color: { argb: i ? 'FF24364C' : 'FFFFFFFF' } }; c.alignment = { vertical: 'middle', wrapText: true }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: !i ? navy : i % 2 ? 'FFF1F5F9' : 'FFFFFFFF' } }; }); });
    }
    return wb.xlsx.writeBuffer();
  }
  return Object.freeze({ generate });
});
