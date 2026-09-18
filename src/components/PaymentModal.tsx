import { useState } from 'react';
import { type Bill } from '@/types';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  bill: Bill;
  formatCurrency: (n: number) => string;
  onPay: (bill: Bill, paidDate: string, note: string) => void;
  onClose: () => void;
}

export default function PaymentModal({ bill, formatCurrency, onPay, onClose }: PaymentModalProps) {
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Mark as Paid</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 bg-slate-900/30 rounded-xl border border-slate-700/30">
            <p className="text-sm text-slate-500">Bill</p>
            <p className="text-base font-semibold text-white">{bill.name}</p>
            <p className="text-lg font-bold text-emerald-400 mt-1">
              {formatCurrency(Number(bill.amount))}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Payment Date</label>
            <input
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid via bank transfer"
              className="w-full px-3.5 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
            />
          </div>

          {bill.frequency !== 'one-time' && (
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-400">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                The next payment date will be automatically advanced based on the {bill.frequency} schedule.
              </span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => onPay(bill, paidDate, note)}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-colors text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Confirm Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
