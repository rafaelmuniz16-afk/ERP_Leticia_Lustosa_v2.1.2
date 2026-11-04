/* One job per worker; terminated after download/cancel. No network service receives records. */
'use strict';
self.onmessage = async ({ data: job }) => {
  try {
    importScripts('data.js');
    let buffer;
    if (job.format === 'xlsx') {
      importScripts('../../vendor/export/exceljs-4.4.0.min.js', 'excel.js');
      buffer = await self.ERPExport.Excel.generate(job.rows, job.meta, self.ExcelJS);
    } else {
      importScripts('../../vendor/export/pdfmake-0.2.20.min.js', '../../vendor/export/vfs_fonts-0.2.20.js', 'pdf.js');
      buffer = await self.ERPExport.PDF.generate(job.rows, job.meta, self.pdfMake);
    }
    const bytes = new Uint8Array(buffer); self.postMessage({ buffer: bytes.buffer }, [bytes.buffer]);
  } catch (error) { self.postMessage({ error: error.message || 'Não foi possível gerar o documento.' }); }
};
