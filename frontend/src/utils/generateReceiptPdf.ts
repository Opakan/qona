import { jsPDF } from 'jspdf';
import type { InvoiceData } from '../components/shared/PaymentReceiptModal';

export function generateReceiptPdf(
  invoice: InvoiceData,
  customerName?: string,
  customerEmail?: string
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const receiptNumber = `INV-${(invoice.providerRef || invoice.id).replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase()}`;
  const planName = invoice.subscription?.plan?.name || (invoice.metadata as any)?.plan ? `${(invoice.metadata as any).plan.charAt(0).toUpperCase() + (invoice.metadata as any).plan.slice(1)} Plan` : 'Starter Plan';
  const currency = (invoice.currency || 'USD').toUpperCase();
  const amountFormatted = `$${Number(invoice.amount).toFixed(2)} ${currency}`;
  const clientName = customerName || customerEmail?.split('@')[0] || 'Valued Subscriber';
  const clientEmail = customerEmail || 'customer@qonace.com';
  const transactionRef = invoice.providerRef || invoice.id;
  const paymentDate = new Date(invoice.paidAt || invoice.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Colors
  const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo-600 #4f46e5
  const darkTextColor: [number, number, number] = [15, 23, 42]; // Slate-900 #0f172a
  const mutedTextColor: [number, number, number] = [100, 116, 139]; // Slate-500 #64748b
  const lightBg: [number, number, number] = [248, 250, 252]; // Slate-50 #f8fafc
  const borderColor: [number, number, number] = [226, 232, 240]; // Slate-200 #e2e8f0
  const emeraldColor: [number, number, number] = [5, 150, 105]; // Emerald-600 #059669

  // Top accent bar
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 6, 'F');

  // Header Left: Brand Logo & Title
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('Qonace AI', 20, 24);

  doc.setTextColor(...mutedTextColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('AI Automation & n8n Workflow Studio', 20, 30);
  doc.text('support@qonace.com  |  https://qonace.com', 20, 35);

  // Header Right: Invoice Title & Status Badge
  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PAYMENT RECEIPT', 190, 22, { align: 'right' });

  // Status Badge box
  doc.setFillColor(236, 253, 245); // Emerald-50
  doc.setDrawColor(167, 243, 208); // Emerald-200
  doc.roundedRect(148, 26, 42, 7, 2, 2, 'FD');
  doc.setTextColor(...emeraldColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('PAID & VERIFIED', 169, 31, { align: 'center' });

  // Receipt Number & Date
  doc.setTextColor(...mutedTextColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Receipt #: ${receiptNumber}`, 190, 39, { align: 'right' });
  doc.text(`Date: ${paymentDate}`, 190, 44, { align: 'right' });

  // Divider
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.4);
  doc.line(20, 50, 190, 50);

  // Info Block (Billed To & Payment Details)
  // Billed To Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(20, 56, 82, 34, 3, 3, 'F');
  doc.setDrawColor(...borderColor);
  doc.roundedRect(20, 56, 82, 34, 3, 3, 'D');

  doc.setTextColor(...mutedTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILLED TO:', 25, 63);

  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(clientName, 25, 70);

  doc.setTextColor(...mutedTextColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(clientEmail, 25, 76);

  // Payment Details Box
  doc.setFillColor(...lightBg);
  doc.roundedRect(108, 56, 82, 34, 3, 3, 'F');
  doc.setDrawColor(...borderColor);
  doc.roundedRect(108, 56, 82, 34, 3, 3, 'D');

  doc.setTextColor(...mutedTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PAYMENT DETAILS:', 113, 63);

  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Processor: Flutterwave Gateway', 113, 70);
  doc.text(`Currency: ${currency}`, 113, 76);
  const truncatedRef = transactionRef.length > 25 ? `${transactionRef.slice(0, 25)}...` : transactionRef;
  doc.text(`Ref: ${truncatedRef}`, 113, 82);

  // Line Items Table Header
  const tableTop = 100;
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.roundedRect(20, tableTop, 170, 9, 2, 2, 'F');

  doc.setTextColor(...mutedTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('ITEM DESCRIPTION', 25, tableTop + 6);
  doc.text('QTY', 125, tableTop + 6, { align: 'center' });
  doc.text('UNIT PRICE', 152, tableTop + 6, { align: 'right' });
  doc.text('TOTAL', 185, tableTop + 6, { align: 'right' });

  // Line Item Row
  const rowTop = tableTop + 16;
  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`Qonace ${planName} Subscription`, 25, rowTop);

  doc.setTextColor(...mutedTextColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('1-Month Workflow Generation & n8n Direct Export Access', 25, rowTop + 5);

  doc.setTextColor(...darkTextColor);
  doc.text('1', 125, rowTop + 2, { align: 'center' });
  doc.text(amountFormatted, 152, rowTop + 2, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(amountFormatted, 185, rowTop + 2, { align: 'right' });

  // Table bottom border
  doc.setDrawColor(...borderColor);
  doc.line(20, rowTop + 14, 190, rowTop + 14);

  // Totals Area
  const totalsTop = rowTop + 22;
  const totalsLabelX = 145;
  const totalsValueX = 185;

  doc.setTextColor(...mutedTextColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal:', totalsLabelX, totalsTop, { align: 'right' });
  doc.setTextColor(...darkTextColor);
  doc.text(amountFormatted, totalsValueX, totalsTop, { align: 'right' });

  doc.setTextColor(...mutedTextColor);
  doc.text('Taxes / VAT (0%):', totalsLabelX, totalsTop + 7, { align: 'right' });
  doc.setTextColor(...darkTextColor);
  doc.text('$0.00 USD', totalsValueX, totalsTop + 7, { align: 'right' });

  // Total Paid highlight box
  doc.setFillColor(...lightBg);
  doc.roundedRect(totalsLabelX - 35, totalsTop + 12, 80, 11, 2, 2, 'F');
  doc.setDrawColor(...primaryColor);
  doc.setLineWidth(0.5);
  doc.roundedRect(totalsLabelX - 35, totalsTop + 12, 80, 11, 2, 2, 'D');

  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('Total Paid:', totalsLabelX - 5, totalsTop + 19, { align: 'right' });

  doc.setTextColor(...emeraldColor);
  doc.setFontSize(11);
  doc.text(amountFormatted, totalsValueX - 2, totalsTop + 19, { align: 'right' });

  // Notice & Security Badge
  const footerTop = 220;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(20, footerTop, 170, 28, 3, 3, 'F');
  doc.setDrawColor(...borderColor);
  doc.roundedRect(20, footerTop, 170, 28, 3, 3, 'D');

  doc.setTextColor(...darkTextColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('OFFICIAL RECORD & RECEIPT CONFIRMATION', 25, footerTop + 7);

  doc.setTextColor(...mutedTextColor);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(
    'This document confirms that payment was received in full by Qonace Inc. via Flutterwave.',
    25,
    footerTop + 13
  );
  doc.text(
    'This receipt is suitable for corporate reimbursement, accounting, and tax documentation.',
    25,
    footerTop + 18
  );
  doc.text(
    'Questions or enterprise invoice inquiries? Contact support@qonace.com',
    25,
    footerTop + 23
  );

  // Bottom Footer
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFontSize(7.5);
  doc.text('Generated by Qonace AI Platform • https://qonace.com', 105, 285, { align: 'center' });

  // Trigger browser file download
  doc.save(`Qonace-Receipt-${receiptNumber}.pdf`);
}
