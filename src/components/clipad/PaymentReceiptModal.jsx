import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, X, Printer, ShieldCheck, Star, Building2, Calendar, FileText } from 'lucide-react';

export default function PaymentReceiptModal({ isOpen, onClose, transactionDetails }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!transactionDetails) return null;

  const receiptNumber = transactionDetails.receiptNumber || `CLIP-${transactionDetails.reference?.slice(-8).toUpperCase() || Math.random().toString(36).slice(2,10).toUpperCase()}`;
  const isAdminAssigned = transactionDetails.isAdminAssigned === true;
  const amountValue = isAdminAssigned ? 0 : (transactionDetails.amount / 100);
  const formattedAmount = isAdminAssigned ? 'Admin Assigned' : `${transactionDetails.currency} ${amountValue.toFixed(2)}`;
  const dateFormatted = new Date(transactionDetails.date || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const timeFormatted = new Date(transactionDetails.date || Date.now()).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit'
  });

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt ${receiptNumber}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              color: #1e293b; 
              background: #fff; 
              margin: 0; 
              padding: 40px; 
              -webkit-font-smoothing: antialiased;
            }
            .invoice-container { 
              max-width: 800px; 
              margin: 0 auto; 
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #f1f5f9;
              padding-bottom: 24px;
              margin-bottom: 32px;
            }
            .logo {
              height: 40px;
              object-fit: contain;
            }
            .receipt-title {
              font-size: 24px;
              font-weight: 600;
              color: #0f172a;
              text-align: right;
              margin: 0 0 4px 0;
            }
            .receipt-meta {
              font-size: 13px;
              color: #64748b;
              text-align: right;
            }
            .billing-section {
              display: flex;
              justify-content: space-between;
              margin-bottom: 40px;
              background: #f8fafc;
              padding: 24px;
              border-radius: 12px;
            }
            .billing-block h3 {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #94a3b8;
              margin: 0 0 8px 0;
            }
            .billing-block p {
              margin: 0 0 4px 0;
              font-size: 14px;
              font-weight: 500;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 32px;
            }
            th {
              text-align: left;
              padding: 12px 16px;
              background: #f8fafc;
              color: #64748b;
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            td {
              padding: 20px 16px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 14px;
              color: #0f172a;
            }
            .text-right { text-align: right; }
            .summary-box {
              float: right;
              width: 320px;
              background: #f8fafc;
              padding: 24px;
              border-radius: 12px;
            }
            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              font-size: 14px;
              color: #64748b;
            }
            .summary-row.total {
              border-top: 1px solid #cbd5e1;
              padding-top: 16px;
              margin-top: 8px;
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
            }
            .footer {
              clear: both;
              padding-top: 64px;
              text-align: center;
              font-size: 12px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              margin-top: 64px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div>
                <!-- We inject the absolute URL for the logo so it prints correctly -->
                <img src="${window.location.origin}/clipad-logo-green.svg" alt="CliPad Logo" class="logo" onerror="this.style.display='none'" />
                <div style="font-size: 12px; font-weight: 600; color: #64748b; margin-top: 8px;">Workspace Billing</div>
              </div>
              <div>
                <h2 class="receipt-title">RECEIPT</h2>
                <div class="receipt-meta">
                  #${receiptNumber}
                </div>
              </div>
            </div>

            <div class="billing-section">
              <div class="billing-block">
                <h3>Billed To</h3>
                <p><strong>${transactionDetails.companyName || 'Customer'}</strong></p>
                <p>${transactionDetails.email}</p>
              </div>
              <div class="billing-block" style="text-align: right;">
                <h3>Date Issued</h3>
                <p>${dateFormatted}</p>
                <p style="color: #64748b; font-size: 12px;">${timeFormatted}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th class="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>CliPad ${transactionDetails.plan.toUpperCase()} Plan</strong>
                    <div style="font-size: 13px; color: #64748b; margin-top: 4px;">Premium Workspace Subscription</div>
                    ${transactionDetails.reference && !isAdminAssigned ? `<div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">Ref: ${transactionDetails.reference}</div>` : ''}
                  </td>
                  <td class="text-right" style="font-weight: 600;">${formattedAmount}</td>
                </tr>
              </tbody>
            </table>

            <div class="summary-box">
              <div class="summary-row">
                <span>Subtotal</span>
                <span>${formattedAmount}</span>
              </div>
              <div class="summary-row">
                <span>Status</span>
                <span style="color: #10b981; font-weight: 600;">${isAdminAssigned ? 'Complimentary' : 'Paid in Full'}</span>
              </div>
              <div class="summary-row total">
                <span>Total Paid</span>
                <span>${formattedAmount}</span>
              </div>
            </div>

            <div class="footer">
              Thank you for choosing Optavel. If you have any questions, please contact support.
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
            window.onafterprint = function() {
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6 sm:px-12 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Modal Container - Horizontal Layout */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative w-full max-w-3xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[95vh] md:max-h-[80vh]"
          >
            {/* Left Panel - Brand & Summary */}
            <div className="md:w-2/5 bg-slate-50 border-r border-slate-100 p-6 md:p-8 flex flex-col justify-between shrink-0 relative overflow-hidden">
              {/* Subtle background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#006065]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
              
              <div className="relative z-10">
                <div className="mb-12">
                  <img src="/clipad-logo-green.png" alt="CliPad Logo" className="h-10 w-auto object-contain" onError={(e) => e.target.style.display='none'} />
                  <div className="flex items-center gap-2 text-slate-500 font-medium text-sm">
                    <FileText className="w-4 h-4" /> Receipt
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">Total Paid</h3>
                    <div className="text-3xl font-black text-slate-900 tracking-tight">{formattedAmount}</div>
                    <div className="flex items-center gap-1 mt-1.5 text-[#006065] bg-[#006065]/10 w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">
                      <CheckCircle className="w-3 h-3" />
                      {isAdminAssigned ? 'Complimentary' : 'Successful'}
                    </div>
                  </div>

                  <div className="pt-5 border-t border-slate-200">
                    <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Billed To</h3>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm leading-tight">{transactionDetails.companyName || 'Customer'}</div>
                        <div className="text-slate-500 text-xs">{transactionDetails.email}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-12 md:mt-0 flex items-center gap-2 text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" /> Securely Processed
              </div>
            </div>

            {/* Right Panel - Details */}
            <div className="md:w-3/5 p-6 md:p-8 flex flex-col h-full overflow-y-auto bg-white">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Transaction Details</h2>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" /> {dateFormatted} at {timeFormatted}
                  </p>
                </div>
                <button onClick={onClose} className="p-1.5 -mr-1.5 -mt-1.5 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 space-y-5">
                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Receipt Number</div>
                    <div className="font-mono text-xs font-semibold text-slate-900">{receiptNumber}</div>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference ID</div>
                    <div className="font-mono text-xs font-semibold text-slate-900 truncate pr-2">
                      {isAdminAssigned ? 'ADMIN-UPGRADE' : transactionDetails.reference || '—'}
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div className="pt-1">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Description</h3>
                  
                  <div className="flex justify-between items-center py-2">
                    <div className="flex gap-3 items-center">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                        <Star className="w-5 h-5 text-[#006065]" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">CliPad {transactionDetails.plan.toUpperCase()} Plan</div>
                        <div className="text-xs text-slate-500 mt-0.5">Workspace Subscription</div>
                      </div>
                    </div>
                    <div className="font-bold text-slate-900 text-sm whitespace-nowrap">{formattedAmount}</div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-6 mt-2 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                <button
                  onClick={onClose}
                  className="px-5 py-2 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold transition-all shadow-sm text-sm"
                >
                  Done
                </button>
                <button
                  onClick={handlePrint}
                  className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-primary/20 text-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Download PDF
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  // Use createPortal to mount the modal at the document body to bypass all z-index stacking contexts
  if (!mounted) return null;
  return createPortal(modalContent, document.body);
}
