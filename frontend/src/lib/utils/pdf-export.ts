import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PdfOptions {
  title: string;
  filename: string;
  headers: string[];
  data: (string | number)[][];
  dateRange?: string;
}

export const exportToPdf = async ({ title, filename, headers, data, dateRange }: PdfOptions) => {
  // Load logo
  const logoUrl = '/logo.png';
  let logoData = '';
  try {
    const img = new Image();
    img.src = logoUrl;
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(null);
      img.onerror = reject;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      logoData = canvas.toDataURL('image/png');
    }
  } catch (e) {
    console.warn('Could not load logo for PDF', e);
  }

  // Set orientation based on columns
  const orientation = headers.length > 5 ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startY = 20;

  // Header and Logo
  if (logoData) {
    // Attempting reasonable logo sizing. 
    // Logo width ~40mm.
    const logoWidth = 35;
    const logoHeight = 12; 
    doc.addImage(logoData, 'PNG', 14, 15, logoWidth, logoHeight);
    startY = 40;
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 138); // brand-900 approx #1e3a8a
  const titleX = logoData ? 55 : 14;
  const titleY = logoData ? 21 : 25;
  doc.text(title, titleX, titleY);

  if (dateRange) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Período: ${dateRange}`, titleX, titleY + 6);
  }

  // Draw a horizontal line under the header
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(14, startY - 5, pageWidth - 14, startY - 5);

  // Data Table
  autoTable(doc, {
    startY: startY,
    head: [headers],
    body: data as any,
    theme: 'striped',
    headStyles: {
      fillColor: [37, 99, 235], // brand-600 #2563eb
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      textColor: 50,
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 4,
      overflow: 'linebreak',
    },
  });

  doc.save(filename);
};
