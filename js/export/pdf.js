(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./data.js') : root.ERPExport.Data);
  if (typeof module === 'object' && module.exports) module.exports = api; else root.ERPExport.PDF = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (D) {
  'use strict';
  function definition(rows, meta) {
    if (!rows.length) throw new Error('Nenhum registro encontrado para exportar.');
    const body = [D.headers.slice(0, 6).map(text => ({ text, bold: true, color: '#ffffff', fillColor: '#233e5d', margin: [0, 3, 0, 3] }))];
    let oversizedRow = false;
    rows.forEach(r => {
      const values = D.fields.slice(0, 6).map(k => k === 'data' ? D.formatDate(r.record[k]) : r.record[k]);
      if (values.some(v => v.length > 400 || v.split('\n').length > 35)) oversizedRow = true;
      body.push(values.map((text, i) => ({ text, alignment: i >= 3 ? 'center' : 'left' })));
    });
    // No observation field, query or filter descriptors enter this definition, even metadata.
    return {
      pageSize: 'A4', pageOrientation: 'portrait', pageMargins: [30, 34, 30, 48],
      info: { title: 'ERP LETICIA LUSTOSA', author: 'ERP Leticia Lustosa', subject: 'Relatório de Encerramentos Processuais' },
      defaultStyle: { font: 'Roboto', fontSize: 8, color: '#25364c', lineHeight: 1.18 },
      content: [
        { text: 'ERP LETICIA LUSTOSA', alignment: 'center', fontSize: 19, bold: true, color: '#162c48', margin: [0, 0, 0, 5] },
        { text: 'Relatório de Encerramentos Processuais', alignment: 'center', fontSize: 10, color: '#52647b', margin: [0, 0, 0, 16] },
        { columns: [{ text: `Gerado em ${meta.generatedLabel}` }, { text: `${rows.length} registro(s)`, alignment: 'right', bold: true }], margin: [0, 0, 0, 5] },
        { text: `Período: ${meta.period}${meta.filtered ? ' • Exportação personalizada' : ''}`, color: '#52647b', margin: [0, 0, 0, 4] },
        { text: 'Dados disponíveis no ERP no momento da seleção.', fontSize: 7, color: '#52647b', margin: [0, 0, 0, 14] },
        { table: { headerRows: 1, dontBreakRows: !oversizedRow, keepWithHeaderRows: oversizedRow ? 0 : 1, widths: [57, 125, 83, 57, 75, '*'], body },
          layout: { hLineWidth: () => .4, vLineWidth: () => 0, hLineColor: () => '#dce3ec', paddingLeft: () => 4, paddingRight: () => 4, paddingTop: () => 6, paddingBottom: () => 6, fillColor: i => i === 0 ? '#233e5d' : i % 2 === 0 ? '#f1f5f9' : '#ffffff' } }
      ],
      footer: (current, total) => ({ margin: [30, 15, 30, 0], columns: [{ text: 'ERP Leticia Lustosa • Relatório de encerramentos', color: '#52647b', fontSize: 7 }, { text: `Página ${current} de ${total}`, alignment: 'right', color: '#52647b', fontSize: 7 }] })
    };
  }
  function generate(rows, meta, pdfMake) {
    return new Promise((resolve, reject) => {
      try { pdfMake.createPdf(definition(rows, meta)).getBuffer(buffer => resolve(buffer)); } catch (error) { reject(error); }
    });
  }
  return Object.freeze({ definition, generate });
});
