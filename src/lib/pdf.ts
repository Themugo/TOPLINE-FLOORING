import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quotation, QuotationItem } from '@/lib/types';
import { formatKES } from './utils';

interface CompanyInfo {
  name: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export function generateQuotationPdf(
  quotation: Quotation,
  items: QuotationItem[],
  company: CompanyInfo
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (company.tagline) doc.text(company.tagline, 14, 26);
  if (company.phone) doc.text(`Tel: ${company.phone}`, 14, 32);
  if (company.email) doc.text(`Email: ${company.email}`, 14, 37);
  if (company.address) doc.text(company.address, 14, 42);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('QUOTATION', pageWidth - 14, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const quoteNumber = quotation.quotation_number;
  if (quoteNumber) doc.text(`#${quoteNumber}`, pageWidth - 14, 26, { align: 'right' });
  doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`, pageWidth - 14, 32, { align: 'right' });
  const validUntil = quotation.valid_until;
  if (validUntil) doc.text(`Valid until: ${new Date(validUntil).toLocaleDateString()}`, pageWidth - 14, 37, { align: 'right' });

  // Bill to
  doc.setDrawColor(200);
  doc.line(14, 48, pageWidth - 14, 48);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared For:', 14, 56);
  doc.setFont('helvetica', 'normal');
  doc.text(quotation.name, 14, 62);
  if (quotation.company) doc.text(quotation.company, 14, 67);
  doc.text(quotation.email, 14, quotation.company ? 72 : 67);
  doc.text(quotation.phone, 14, quotation.company ? 77 : 72);

  let cursorY = quotation.company ? 85 : 80;

  if (quotation.project_type || quotation.location || quotation.area_size) {
    doc.setFont('helvetica', 'bold');
    doc.text('Project Details:', 14, cursorY);
    doc.setFont('helvetica', 'normal');
    cursorY += 6;
    if (quotation.project_type) { doc.text(`Type: ${quotation.project_type}`, 14, cursorY); cursorY += 5; }
    if (quotation.area_size) { doc.text(`Area: ${quotation.area_size}`, 14, cursorY); cursorY += 5; }
    if (quotation.location) { doc.text(`Location: ${quotation.location}`, 14, cursorY); cursorY += 5; }
    cursorY += 4;
  }

  // Line items (if any have been added by admin) or fall back to the
  // free-text project description captured at request time
  if (items.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [['Description', 'Qty', 'Unit', 'Unit Price', 'Total']],
      body: items.map((item) => [
        item.description,
        item.quantity.toString(),
        item.unit,
        formatKES(item.unit_price),
        formatKES(item.line_total),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [201, 151, 31] },
    });

    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
    const subtotal = quotation.subtotal || 0;
    const taxRate = quotation.tax_rate || 16;
    const taxAmount = quotation.tax_amount || 0;
    const total = quotation.total_amount || 0;

    doc.setFontSize(10);
    doc.text(`Subtotal: ${formatKES(subtotal)}`, pageWidth - 14, finalY, { align: 'right' });
    doc.text(`VAT (${taxRate}%): ${formatKES(taxAmount)}`, pageWidth - 14, finalY + 6, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${formatKES(total)}`, pageWidth - 14, finalY + 13, { align: 'right' });
    cursorY = finalY + 24;
  } else if (quotation.message) {
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 14, cursorY);
    doc.setFont('helvetica', 'normal');
    cursorY += 6;
    const lines = doc.splitTextToSize(quotation.message, pageWidth - 28);
    doc.text(lines, 14, cursorY);
    cursorY += lines.length * 5 + 10;
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('This is a preliminary quotation and is subject to site inspection and final measurement.', 14, 285);

  doc.save(`Quotation-${quoteNumber || quotation.id.slice(0, 8)}.pdf`);
}
