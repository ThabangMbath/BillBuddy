import { useState, type FormEvent, useEffect } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import {
  type Bill,
  type BillInput,
  type Frequency,
  CATEGORIES,
  FREQUENCIES,
} from '@/types';
import { X, Repeat, Bell } from 'lucide-react';

interface BillFormProps {
  bill?: Bill | null;
  onSubmit: (data: BillInput) => Promise<void>;
  onClose: () => void;
}

export default function BillForm({ bill, onSubmit, onClose }: BillFormProps) {
  const { currency } = useCurrency();
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [paymentDate, setPaymentDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderDays, setReminderDays] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bill) {
      setName(bill.name);
      setAmount(String(bill.amount));
      setCategory(bill.category);
      setFrequency(bill.frequency);
      setPaymentDate(bill.payment_date);
      setAutoRenew(bill.auto_renew);
      setReminderEnabled(bill.reminder_enabled);
      setReminderDays(bill.reminder_days);
      setNotes(bill.notes ?? '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setPaymentDate(today);
    }
  }, [bill]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setLoading(true);
    await onSubmit({
      name,
      amount: amt,
      category,
      frequency,
      payment_date: paymentDate,
      auto_renew: autoRenew,
      reminder_enabled: reminderEnabled,
      reminder_days: reminderDays,
      notes: notes || null,
    });
    setLoading(false);
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm';
  const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
          <h2 className="text-lg font-semibold text-white">
            {bill ? 'Edit Bill' : 'Add New Bill'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Netflix, Electricity, Rent"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                  {currency}
                </span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className={`${inputClass} pl-14`}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className={inputClass}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                {frequency === 'one-time' ? 'Payment Date' : 'Next Payment Date'}
              </label>
              <input
                required
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-700 rounded-xl cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={autoRenew}
                onChange={(e) => setAutoRenew(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="flex items-center gap-2 text-sm text-slate-200">
                <Repeat className="w-4 h-4 text-slate-400" />
                Auto-renew
              </span>
            </label>
            <label className="flex items-center gap-3 p-3.5 bg-slate-900/50 border border-slate-700 rounded-xl cursor-pointer hover:border-slate-600 transition-colors">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="w-4 h-4 accent-emerald-500"
              />
              <span className="flex items-center gap-2 text-sm text-slate-200">
                <Bell className="w-4 h-4 text-slate-400" />
                Reminders
              </span>
            </label>
          </div>

          {reminderEnabled && (
            <div>
              <label className={labelClass}>Remind me (days before)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={reminderDays}
                onChange={(e) => setReminderDays(parseInt(e.target.value) || 3)}
                className={inputClass}
              />
            </div>
          )}

          <div>
            <label className={labelClass}>Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any extra details..."
              className={`${inputClass} resize-none`}
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-medium rounded-xl transition-colors text-sm"
            >
              {loading ? 'Saving...' : bill ? 'Update Bill' : 'Add Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
