// ==== JANELA FLUTUANTE DE AUDITORIA ====
function toggleAuditoria() {
  const win = $('winAuditoria');
  if (!win) return;
  if (win.style.display === 'none' || !win.style.display) {
    win.style.display = 'flex';
    renderLogs();
    if (!win.dataset.moved) {
      win.style.top = '14%';
      win.style.left = Math.max(10, Math.round((window.innerWidth - win.offsetWidth) / 2)) + 'px';
    }
  } else {
    win.style.display = 'none';
  }
}

(function setupDraggableWindow() {
  const win = $('winAuditoria');
  const header = $('winAuditoriaHeader');
  if (!win || !header) return;
  let p1 = 0, p2 = 0, p3 = 0, p4 = 0;
  header.onmousedown = function(e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    p3 = e.clientX;
    p4 = e.clientY;
    document.onmouseup = closeDrag;
    document.onmousemove = dragElement;
  };
  function dragElement(e) {
    e.preventDefault();
    p1 = p3 - e.clientX;
    p2 = p4 - e.clientY;
    p3 = e.clientX;
    p4 = e.clientY;
    win.dataset.moved = 'true';
    win.style.top = Math.max(10, (win.offsetTop - p2)) + 'px';
    win.style.left = Math.max(10, (win.offsetLeft - p1)) + 'px';
  }
  function closeDrag() {
    document.onmouseup = null;
    document.onmousemove = null;
  }
})();

