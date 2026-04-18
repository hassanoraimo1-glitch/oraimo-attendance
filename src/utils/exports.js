// ────────────────────────────────────────────────────────────
// EXPORT UTILITIES  (v3) — Excel & PDF
// ────────────────────────────────────────────────────────────
// Third-pass notes:
//   • Loader promises reset on failure so the user can retry.
//   • Defensive checks on inputs to surface helpful errors.
// ────────────────────────────────────────────────────────────

let _xlsxPromise = null;
async function loadXLSX() {
  if (_xlsxPromise) return _xlsxPromise;
  _xlsxPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = () => resolve(window.XLSX);
    s.onerror = () => { _xlsxPromise = null; reject(new Error('Failed to load XLSX')); };
    document.head.appendChild(s);
  });
  return _xlsxPromise;
}

let _jsPdfPromise = null;
async function loadJsPDF() {
  if (_jsPdfPromise) return _jsPdfPromise;
  _jsPdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.0/dist/jspdf.plugin.autotable.min.js';
      s2.onload = () => resolve(window.jspdf);
      s2.onerror = () => { _jsPdfPromise = null; reject(new Error('Failed to load autotable')); };
      document.head.appendChild(s2);
    };
    s.onerror = () => { _jsPdfPromise = null; reject(new Error('Failed to load jsPDF')); };
    document.head.appendChild(s);
  });
  return _jsPdfPromise;
}

function safeFilename(name) {
  return String(name || 'report').replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80) || 'report';
}

export async function exportToExcel(filename, rows, sheetName = 'Sheet1') {
  if (!Array.isArray(rows)) throw new Error('rows must be an array');
  const XLSX = await loadXLSX();
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, String(sheetName).slice(0, 31));
  XLSX.writeFile(wb, `${safeFilename(filename)}.xlsx`);
}

export async function exportToPDF(filename, title, headers, rows) {
  if (!Array.isArray(headers) || !Array.isArray(rows)) {
    throw new Error('headers and rows must be arrays');
  }
  const { jsPDF } = await loadJsPDF();
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(String(title || 'Report'), 14, 18);
  doc.setFontSize(10);
  doc.text(new Date().toLocaleString(), 14, 26);
  doc.autoTable({
    head: [headers],
    body: rows,
    startY: 32,
    theme: 'striped',
    headStyles: { fillColor: [0, 200, 83] },
  });
  doc.save(`${safeFilename(filename)}.pdf`);
}
