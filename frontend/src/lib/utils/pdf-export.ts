import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { apiClient } from '@/lib/api/client';

interface PdfOptions {
  title: string;
  filename: string;
  headers: string[];
  data: (string | number)[][];
  dateRange?: string;
  totals?: { label: string; value: string }[];
}

export const exportToPdf = async ({ title, filename, headers, data, dateRange, totals }: PdfOptions) => {
  // Load tenant logo
  let logoData = '';
  try {
    const r = await apiClient.get('/tenant/settings');
    const tenantLogoUrl = r.data?.logoUrl;
    
    if (tenantLogoUrl) {
      if (tenantLogoUrl.startsWith('data:image')) {
        logoData = tenantLogoUrl;
      } else {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = tenantLogoUrl;
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
      }
    }
  } catch (e) {
    console.warn('Could not load tenant logo for PDF', e);
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.width;

  let startY = 20;

  let titleX = 14;
  let titleY = 25;

  // Header and Logo
  if (logoData) {
    try {
      const imgProps = doc.getImageProperties(logoData);
      const ratio = imgProps.width / imgProps.height;
      let logoHeight = 14;
      let logoWidth = logoHeight * ratio;

      if (logoWidth > 45) {
        logoWidth = 45;
        logoHeight = logoWidth / ratio;
      }
      
      doc.addImage(logoData, 'PNG', 14, 15, logoWidth, logoHeight);
      startY = Math.max(40, 15 + logoHeight + 10);
      titleX = 14 + logoWidth + 6;
      titleY = 21;
    } catch (e) {
      console.warn('Invalid logo image format', e);
    }
  }

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 58, 138); // brand-900 approx #1e3a8a
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
      fontSize: 7,
      cellPadding: 3,
      overflow: 'ellipsize',
    },
  });

  if (totals && totals.length > 0) {
    const finalY: number = (doc as any).lastAutoTable?.finalY ?? startY + 20;
    const totalsY = finalY + 8;

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, totalsY - 2, pageWidth - 14, totalsY - 2);

    let currentY = totalsY + 6;
    for (const t of totals) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(30, 58, 138);
      doc.text(`${t.label}:`, pageWidth - 14 - 75, currentY);
      doc.setTextColor(30, 30, 30);
      doc.text(t.value, pageWidth - 14, currentY, { align: 'right' });
      currentY += 7;
    }
  }

  doc.save(filename);
};
