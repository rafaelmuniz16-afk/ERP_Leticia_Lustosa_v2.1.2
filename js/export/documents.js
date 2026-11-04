(function () {
  'use strict';
  const scriptURL = document.currentScript.src, base = new URL('../../', scriptURL), loads = new Map();
  const abortError = () => new DOMException('Exportação cancelada.', 'AbortError');
  function load(path) {
    if (loads.has(path)) return loads.get(path);
    const promise = new Promise((resolve, reject) => {
      const s = document.createElement('script'); let timer;
      const finish = error => { clearTimeout(timer); s.onload = s.onerror = null; if (error) { s.remove(); loads.delete(path); reject(error); } else resolve(); };
      s.src = new URL(path, base).href; s.onload = () => finish();
      s.onerror = () => finish(new Error('Não foi possível carregar os arquivos locais de exportação. Confira a pasta vendor/export.'));
      timer = setTimeout(() => finish(new Error('Tempo excedido ao carregar os arquivos locais de exportação.')), 20000);
      document.head.appendChild(s);
    }); loads.set(path, promise); return promise;
  }
  async function mainThread(format, rows, meta, signal) {
    const check = () => { if (signal.aborted) throw abortError(); };
    check();
    if (format === 'xlsx') await load('vendor/export/exceljs-4.4.0.min.js');
    else { await load('vendor/export/pdfmake-0.2.20.min.js'); await load('vendor/export/vfs_fonts-0.2.20.js'); }
    check(); await new Promise(r => setTimeout(r, 30));
    const result = format === 'xlsx' ? await ERPExport.Excel.generate(rows, meta, window.ExcelJS, async () => { check(); await new Promise(r => setTimeout(r, 0)); }) : await ERPExport.PDF.generate(rows, meta, window.pdfMake);
    check(); return result;
  }
  async function generate(format, rows, meta, signal) {
    if (signal.aborted) throw abortError();
    if (!window.Worker || location.protocol === 'file:') return mainThread(format, rows, meta, signal);
    return new Promise((resolve, reject) => {
      let worker, timer;
      const clean = () => { clearTimeout(timer); signal.removeEventListener('abort', cancel); worker?.terminate(); };
      const cancel = () => { clean(); reject(abortError()); };
      signal.addEventListener('abort', cancel, { once: true });
      try {
        worker = new Worker(new URL('worker.js', scriptURL));
        timer = setTimeout(() => { clean(); reject(new Error('A geração excedeu três minutos. Reduza a seleção e tente novamente.')); }, 180000);
        worker.onmessage = ({ data }) => { clean(); data.error ? reject(new Error(data.error)) : resolve(data.buffer); };
        // Restricted browsers may disallow workers; local scripts still support file:// and HTTPS.
        worker.onerror = event => { event.preventDefault(); clean(); mainThread(format, rows, meta, signal).then(resolve, reject); };
        worker.postMessage({ format, rows, meta });
      } catch (_) { clean(); mainThread(format, rows, meta, signal).then(resolve, reject); }
    });
  }
  function download(buffer, format, today) {
    const blob = new Blob([buffer], { type: format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = `ERP_Leticia_Lustosa_Exportacao_Personalizada_${today}.${format}`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  ERPExport.Documents = Object.freeze({ generate, download });
})();
