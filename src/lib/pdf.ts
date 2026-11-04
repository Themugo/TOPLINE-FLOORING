import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Quotation, QuotationItem, Invoice, InvoiceItem, Payment } from '@/lib/types';
import { formatKES } from './utils';
import type { CustomerPaymentAccount } from '@/lib/payment-accounts';

interface CompanyInfo {
  name: string;
  tagline?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxLabel?: string;
  taxPin?: string;
}

function accountLines(a: CustomerPaymentAccount): string[] {
  const l: string[] = [];
  if (a.bank_name) l.push(`Bank: ${a.bank_name}${a.branch ? ' - ' + a.branch : ''}`);
  if (a.account_name) l.push(`Account name: ${a.account_name}`);
  if (a.account_number) l.push(`Account no: ${a.account_number}`);
  if (a.swift_code) l.push(`SWIFT: ${a.swift_code}`);
  if (a.paybill_number) l.push(`Paybill: ${a.paybill_number}${a.account_number ? '' : ''}`);
  if (a.till_number) l.push(`Till (Buy Goods): ${a.till_number}`);
  if (a.phone_number) l.push(`Phone: ${a.phone_number}`);
  if (a.reference_hint) l.push(`Reference: ${a.reference_hint}`);
  return l;
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
  if (company.taxPin) doc.text(`${company.taxLabel === 'VAT' ? 'KRA PIN' : 'Tax no'}: ${company.taxPin}`, 14, 47);

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
    const taxRate = quotation.tax_rate ?? 16;
    const taxAmount = quotation.tax_amount || 0;
    const total = quotation.total_amount || 0;

    doc.setFontSize(10);
    doc.text(`Subtotal: ${formatKES(subtotal)}`, pageWidth - 14, finalY, { align: 'right' });
    doc.text(`${company.taxLabel || 'VAT'} (${taxRate}%): ${formatKES(taxAmount)}`, pageWidth - 14, finalY + 6, { align: 'right' });
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

export function generateInvoicePdf(
  invoice: Invoice,
  items: InvoiceItem[],
  payments: Payment[],
  company: CompanyInfo,
  accounts: CustomerPaymentAccount[] = []
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(company.name, 14, 20);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  if (company.tagline) doc.text(company.tagline, 14, 26);
  if (company.phone) doc.text(`Tel: ${company.phone}`, 14, 32);
  if (company.email) doc.text(`Email: ${company.email}`, 14, 37);
  if (company.address) doc.text(company.address, 14, 42);
  if (company.taxPin) doc.text(`${company.taxLabel === 'VAT' ? 'KRA PIN' : 'Tax no'}: ${company.taxPin}`, 14, 47);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', pageWidth - 14, 20, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${invoice.invoice_number}`, pageWidth - 14, 26, { align: 'right' });
  doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, pageWidth - 14, 32, { align: 'right' });
  if (invoice.due_date) doc.text(`Due: ${new Date(invoice.due_date).toLocaleDateString()}`, pageWidth - 14, 37, { align: 'right' });

  const statusLabel = invoice.status.toUpperCase();
  doc.setFont('helvetica', 'bold');
  doc.text(statusLabel, pageWidth - 14, 44, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  doc.setDrawColor(200);
  doc.line(14, 50, pageWidth - 14, 50);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 14, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.customer_name, 14, 64);
  let billY = 69;
  if (invoice.customer_email) { doc.text(invoice.customer_email, 14, billY); billY += 5; }
  if (invoice.customer_phone) { doc.text(invoice.customer_phone, 14, billY); billY += 5; }
  if (invoice.billing_address) { doc.text(invoice.billing_address, 14, billY); billY += 5; }

  const tableStartY = billY + 8;

  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: items.map((item) => [
      item.description,
      item.quantity.toString(),
      formatKES(item.unit_price),
      formatKES(item.line_total),
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [201, 151, 31] },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  const taxLabel = company.taxLabel || 'VAT';
  const balance = invoice.total_amount - invoice.amount_paid;
  const totalsBody: string[][] = [
    ['Subtotal (excl. ' + taxLabel + ')', formatKES(invoice.subtotal)],
    [`${taxLabel} @ ${invoice.tax_rate}%`, formatKES(invoice.tax_amount)],
    ['Invoice total', formatKES(invoice.total_amount)],
  ];
  if (invoice.amount_paid > 0) totalsBody.push(['Less: payments received', '-' + formatKES(invoice.amount_paid)]);
  totalsBody.push([balance > 0 ? 'BALANCE DUE' : 'PAID IN FULL', formatKES(Math.max(balance, 0))]);
  autoTable(doc, {
    startY: finalY - 4,
    margin: { left: pageWidth - 14 - 90 },
    tableWidth: 90,
    body: totalsBody,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 1.8 },
    columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 38, halign: 'right' } },
    didParseCell: (d) => {
      const last = d.row.index === totalsBody.length - 1;
      if (d.row.index === 2 || last) d.cell.styles.fontStyle = 'bold';
      if (last) { d.cell.styles.fillColor = [244, 238, 220]; }
    },
  });
  let paymentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  if (payments.length > 0) {
    autoTable(doc, {
      startY: paymentY,
      head: [['Date', 'Method', 'Reference', 'Amount']],
      body: payments.map((p) => [new Date(p.paid_at).toLocaleDateString(), String(p.method).replace('_', ' '), p.reference || '-', formatKES(p.amount)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [12, 45, 87] },
      columnStyles: { 3: { halign: 'right' } },
    });
    paymentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  if (balance > 0 && accounts.length > 0) {
    autoTable(doc, {
      startY: paymentY,
      head: [['How to pay', 'Details']],
      body: accounts.map((a) => [a.label, accountLines(a).join('\n') + `\nUse invoice ${invoice.invoice_number} as the payment reference.`]),
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [12, 45, 87] },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    });
    paymentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
  }

  if (invoice.notes) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Notes:', 14, paymentY);
    const lines = doc.splitTextToSize(invoice.notes, pageWidth - 28);
    doc.text(lines, 14, paymentY + 5);
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('Thank you for your business.', 14, 285);

  doc.save(`Invoice-${invoice.invoice_number}.pdf`);
}
