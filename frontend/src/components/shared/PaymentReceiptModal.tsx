import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react';

export interface InvoiceData {
  id: string;
  amount: number;
  currency?: string;
  status: string;
  provider?: string;
  providerRef?: string;
  paidAt?: string;
  createdAt: string;
  metadata?: any;
  subscription?: {
    plan?: {
      name: string;
      slug?: string;
      price?: number;
    };
  };
}

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: InvoiceData | null;
  customerName?: string;
  customerEmail?: string;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  isOpen,
  onClose,
  invoice,
  customerName,
  customerEmail,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !invoice) return null;

  const planName = invoice.subscription?.plan?.name || invoice.metadata?.plan ? `${invoice.metadata.plan.charAt(0).toUpperCase() + invoice.metadata.plan.slice(1)} Plan` : 'Starter Plan';
  const currency = (invoice.currency || 'USD').toUpperCase();
  const amountFormatted = `$${Number(invoice.amount).toFixed(2)} ${currency}`;
  const receiptNumber = `INV-${(invoice.providerRef || invoice.id).replace(/[^a-zA-Z0-9]/g, '').slice(-10).toUpperCase()}`;
  const transactionRef = invoice.providerRef || invoice.id;
  const paymentDate = new Date(invoice.paidAt || invoice.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const clientName = customerName || customerEmail?.split('@')[0] || 'Valued Subscriber';
  const clientEmail = customerEmail || 'customer@qonace.com';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadHtml = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Receipt ${receiptNumber} - Qonace</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 40px; background: #fff; }
    .receipt-container { max-width: 680px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: 900; color: #4f46e5; letter-spacing: -0.5px; }
    .badge { background: #ecfdf5; color: #059669; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; border: 1px solid #a7f3d0; text-transform: uppercase; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; font-size: 13px; line-height: 1.6; }
    .info-title { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-bottom: 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { text-align: left; padding: 12px; font-size: 12px; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0; }
    td { padding: 14px 12px; font-size: 14px; border-bottom: 1px solid #f1f5f9; }
    .totals { margin-left: auto; width: 280px; margin-bottom: 32px; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; color: #64748b; }
    .totals-total { display: flex; justify-content: space-between; padding: 12px 0; border-top: 2px solid #0f172a; font-size: 16px; font-weight: 800; color: #0f172a; }
    .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 24px; }
  </style>
</head>
<body>
  <div class="receipt-container">
    <div class="header">
      <div>
        <div class="logo">Qonace AI</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">AI Automation &amp; n8n Workflow Studio</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">PAID • VERIFIED</span>
        <div style="font-size: 12px; font-weight: 700; color: #334155; margin-top: 8px;">${receiptNumber}</div>
      </div>
    </div>

    <div class="info-grid">
      <div>
        <div class="info-title">Billed To</div>
        <div style="font-weight: 700; color: #0f172a;">${clientName}</div>
        <div>${clientEmail}</div>
      </div>
      <div>
        <div class="info-title">Payment Info</div>
        <div><strong>Date:</strong> ${paymentDate}</div>
        <div><strong>Processor:</strong> Flutterwave</div>
        <div style="word-break: break-all;"><strong>Ref:</strong> ${transactionRef}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${planName} Subscription</div>
            <div style="font-size: 12px; color: #64748b;">Full platform workflow generation &amp; n8n export access</div>
          </td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right; font-weight: 700;">${amountFormatted}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${amountFormatted}</span>
      </div>
      <div class="totals-row">
        <span>Taxes / VAT (0%)</span>
        <span>$0.00 USD</span>
      </div>
      <div class="totals-total">
        <span>Total Paid</span>
        <span>${amountFormatted}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for building with Qonace! This receipt serves as official proof of payment for your accounting records.</p>
      <p>Need help? Contact support@qonace.com • https://qonace.com</p>
    </div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Qonace-Receipt-${receiptNumber}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in">
      {/* Print-specific style tag */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt-card, #printable-receipt-card * {
            visibility: visible;
          }
          #printable-receipt-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Modal Controls (No Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/80">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Official Payment Receipt</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-750 transition-colors cursor-pointer shadow-2xs"
              title="Print receipt or save as PDF"
            >
              <Printer className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
              title="Download standalone HTML receipt"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download (.html)</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Body */}
        <div ref={receiptRef} id="printable-receipt-card" className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200/80 dark:border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Qonace" className="h-6 w-6 object-contain" />
                <span className="text-xl font-black font-display tracking-tight text-slate-950 dark:text-white">
                  Qonace AI
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                AI Automation Studio • n8n Workflow Generation
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                support@qonace.com • https://qonace.com
              </p>
            </div>

            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                PAID &amp; VERIFIED
              </span>
              <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 mt-2">
                {receiptNumber}
              </div>
              <div className="text-[11px] text-slate-400 dark:text-slate-500">
                {paymentDate}
              </div>
            </div>
          </div>

          {/* Customer & Transaction Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 p-4 border border-slate-200/60 dark:border-slate-800 text-xs">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Billed To
              </span>
              <div className="font-bold text-slate-900 dark:text-white mt-1">{clientName}</div>
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">{clientEmail}</div>
            </div>

            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Payment Method &amp; Reference
              </span>
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white mt-1">
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Flutterwave Payment Gateway</span>
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-mono text-[10px] truncate" title={transactionRef}>
                Ref: {transactionRef}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-extrabold">
                <tr>
                  <th className="py-2.5 px-4">Item &amp; Description</th>
                  <th className="py-2.5 px-4 text-center">Billing Period</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                <tr>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{planName}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Standard Claude AI workflow builder + direct n8n JSON exports
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-400 font-medium">
                    1 Month
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                    {amountFormatted}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Breakdown */}
          <div className="flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Subtotal</span>
                <span>{amountFormatted}</span>
              </div>
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Sales Tax / VAT (0%)</span>
                <span>$0.00 USD</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-black text-sm text-slate-950 dark:text-white">
                <span>Total Paid</span>
                <span className="text-emerald-600 dark:text-emerald-400">{amountFormatted}</span>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-slate-200/60 dark:border-slate-800/80 pt-4 text-center space-y-1">
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
              This receipt confirms full payment for your Qonace subscription and serves as an official proof of payment.
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              For billing questions, please contact <a href="mailto:support@qonace.com" className="text-indigo-600 dark:text-indigo-400 hover:underline">support@qonace.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
