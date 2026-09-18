import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { supabase } from '@/lib/supabase';
import { type Bill, type BillInput, type Payment, FREQUENCIES, CURRENCIES } from '@/types';
import BillForm from './BillForm';
import PaymentModal from './PaymentModal';
import {
  Wallet,
  Plus,
  Search,
  Calendar,
  LayoutDashboard,
  Settings,
  LogOut,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
  DollarSign,
  Filter,
  X,
  Repeat,
} from 'lucide-react';

type View = 'dashboard' | 'bills' | 'calendar' | 'settings';

interface DashboardProps {
  view: View;
  setView: (v: View) => void;
}

export default function Dashboard({ view, setView }: DashboardProps) {
  const { user, signOut } = useAuth();
  const { formatCurrency } = useCurrency();
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterFrequency, setFilterFrequency] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

  const fetchBills = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('bills')
      .select('*')
      .eq('user_id', user.id)
      .order('payment_date', { ascending: true });
    if (!error && data) setBills(data as Bill[]);
  }, [user]);

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('paid_date', { ascending: false });
    if (!error && data) setPayments(data as Payment[]);
  }, [user]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchBills(), fetchPayments()]);
      setLoading(false);
    })();
  }, [fetchBills, fetchPayments]);

  const handleSaveBill = async (data: BillInput) => {
    if (!user) return;
    if (editingBill) {
      const { error } = await supabase.from('bills').update(data).eq('id', editingBill.id);
      if (!error) {
        await fetchBills();
        setShowForm(false);
        setEditingBill(null);
      }
    } else {
      const { error } = await supabase.from('bills').insert({ ...data, user_id: user.id });
      if (!error) {
        await fetchBills();
        setShowForm(false);
      }
    }
  };

  const handleDeleteBill = async (id: string) => {
    if (!confirm('Delete this bill? This will also remove its payment history.')) return;
    const { error } = await supabase.from('bills').delete().eq('id', id);
    if (!error) await fetchBills();
  };

  const handleMarkPaid = async (bill: Bill, paidDate: string, note: string) => {
    if (!user) return;
    const { error } = await supabase.from('payments').insert({
      bill_id: bill.id,
      user_id: user.id,
      amount: bill.amount,
      paid_date: paidDate,
      note: note || null,
    });
    if (!error) {
      if (bill.frequency !== 'one-time') {
        const nextDate = advanceDate(bill.payment_date, bill.frequency);
        await supabase
          .from('bills')
          .update({ payment_date: nextDate })
          .eq('id', bill.id);
      }
      await Promise.all([fetchBills(), fetchPayments()]);
      setPayingBill(null);
    }
  };

  const filteredBills = bills.filter((b) => {
    const matchSearch =
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === 'all' || b.category === filterCategory;
    const matchFrequency = filterFrequency === 'all' || b.frequency === filterFrequency;
    return matchSearch && matchCategory && matchFrequency;
  });

  const categories = [...new Set(bills.map((b) => b.category))].sort();

  const monthlyTotal = bills
    .filter((b) => b.frequency === 'monthly')
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const weeklyTotal = bills
    .filter((b) => b.frequency === 'weekly')
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const quarterlyTotal = bills
    .filter((b) => b.frequency === 'quarterly')
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const yearlyTotal = bills
    .filter((b) => b.frequency === 'yearly')
    .reduce((sum, b) => sum + Number(b.amount), 0);
  const oneTimeTotal = bills
    .filter((b) => b.frequency === 'one-time')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  const monthlyEquivalent =
    monthlyTotal + weeklyTotal * 4.33 + quarterlyTotal / 3 + yearlyTotal / 12 + oneTimeTotal;
  const yearlyEquivalent = monthlyEquivalent * 12;

  const now = new Date();
  const upcomingBills = bills
    .filter((b) => new Date(b.payment_date) >= now)
    .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime())
    .slice(0, 5);

  const reminderBills = bills.filter((b) => {
    if (!b.reminder_enabled) return false;
    const daysUntil = daysUntilDate(b.payment_date);
    return daysUntil >= 0 && daysUntil <= b.reminder_days;
  });

  const paidThisMonth = payments.filter((p) => {
    const d = new Date(p.paid_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const paidThisMonthTotal = paidThisMonth.reduce((sum, p) => sum + Number(p.amount), 0);

  const navItems: { id: View; label: string; icon: typeof Wallet }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'bills', label: 'Bills', icon: Wallet },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 bg-slate-800/50 border-r border-slate-700/50 flex-col p-4 z-40">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <span className="text-xl font-bold text-white">BillBuddy</span>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                view === item.id
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.label}
            </button>
          ))}
        </nav>

        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sign Out
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-40">
        <div className="flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                view === item.id ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="md:ml-64 pb-20 md:pb-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-4 md:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="md:hidden w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Wallet className="w-4.5 h-4.5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold text-white capitalize">
                  {view === 'dashboard' ? 'Dashboard' : view}
                </h1>
                <p className="text-xs text-slate-500 hidden sm:block">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowReminders(true)}
                className="relative p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
              >
                <Bell className="w-4.5 h-4.5" />
                {reminderBills.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center">
                    {reminderBills.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setEditingBill(null);
                  setShowForm(true);
                }}
                className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Bill</span>
              </button>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : view === 'dashboard' ? (
            <DashboardView
              bills={bills}
              payments={payments}
              formatCurrency={formatCurrency}
              monthlyEquivalent={monthlyEquivalent}
              yearlyEquivalent={yearlyEquivalent}
              upcomingBills={upcomingBills}
              paidThisMonthTotal={paidThisMonthTotal}
              paidThisMonthCount={paidThisMonth.length}
              onMarkPaid={(bill) => setPayingBill(bill)}
              onEdit={(bill) => {
                setEditingBill(bill);
                setShowForm(true);
              }}
            />
          ) : view === 'bills' ? (
            <BillsView
              bills={filteredBills}
              allBills={bills}
              formatCurrency={formatCurrency}
              search={search}
              setSearch={setSearch}
              filterCategory={filterCategory}
              setFilterCategory={setFilterCategory}
              filterFrequency={filterFrequency}
              setFilterFrequency={setFilterFrequency}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              categories={categories}
              onEdit={(bill) => {
                setEditingBill(bill);
                setShowForm(true);
              }}
              onDelete={handleDeleteBill}
              onMarkPaid={(bill) => setPayingBill(bill)}
              onAdd={() => {
                setEditingBill(null);
                setShowForm(true);
              }}
            />
          ) : view === 'calendar' ? (
            <CalendarView bills={bills} formatCurrency={formatCurrency} onMarkPaid={(bill) => setPayingBill(bill)} />
          ) : (
            <SettingsView />
          )}
        </div>
      </main>

      {showForm && (
        <BillForm
          bill={editingBill}
          onSubmit={handleSaveBill}
          onClose={() => {
            setShowForm(false);
            setEditingBill(null);
          }}
        />
      )}

      {payingBill && (
        <PaymentModal
          bill={payingBill}
          formatCurrency={formatCurrency}
          onPay={handleMarkPaid}
          onClose={() => setPayingBill(null)}
        />
      )}

      {showReminders && (
        <RemindersModal
          bills={reminderBills}
          formatCurrency={formatCurrency}
          onClose={() => setShowReminders(false)}
        />
      )}
    </div>
  );
}

function DashboardView({
  bills,
  payments,
  formatCurrency,
  monthlyEquivalent,
  yearlyEquivalent,
  upcomingBills,
  paidThisMonthTotal,
  paidThisMonthCount,
  onMarkPaid,
  onEdit,
}: {
  bills: Bill[];
  payments: Payment[];
  formatCurrency: (n: number) => string;
  monthlyEquivalent: number;
  yearlyEquivalent: number;
  upcomingBills: Bill[];
  paidThisMonthTotal: number;
  paidThisMonthCount: number;
  onMarkPaid: (b: Bill) => void;
  onEdit: (b: Bill) => void;
}) {
  const stats = [
    {
      label: 'Monthly Equivalent',
      value: formatCurrency(monthlyEquivalent),
      icon: TrendingUp,
      color: 'emerald',
    },
    {
      label: 'Yearly Equivalent',
      value: formatCurrency(yearlyEquivalent),
      icon: DollarSign,
      color: 'blue',
    },
    {
      label: 'Paid This Month',
      value: formatCurrency(paidThisMonthTotal),
      sub: `${paidThisMonthCount} payments`,
      icon: CheckCircle2,
      color: 'violet',
    },
    {
      label: 'Active Bills',
      value: String(bills.length),
      sub: `${upcomingBills.length} upcoming`,
      icon: Wallet,
      color: 'amber',
    },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400',
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  };

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 md:p-5"
          >
            <div className={`inline-flex p-2 rounded-lg border ${colorMap[stat.color]} mb-3`}>
              <stat.icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-slate-500 mb-1">{stat.label}</p>
            <p className="text-lg md:text-2xl font-bold text-white">{stat.value}</p>
            {stat.sub && <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 md:gap-6">
        {/* Upcoming payments */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Upcoming Payments</h2>
            <Clock className="w-4 h-4 text-slate-500" />
          </div>
          {upcomingBills.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No upcoming payments</p>
          ) : (
            <div className="space-y-2">
              {upcomingBills.map((bill) => {
                const days = daysUntilDate(bill.payment_date);
                const isOverdue = days < 0;
                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-700/30 hover:border-slate-600 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isOverdue ? 'bg-red-400' : days <= 3 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{bill.name}</p>
                        <p className="text-xs text-slate-500">
                          {isOverdue
                            ? `${Math.abs(days)} days overdue`
                            : days === 0
                              ? 'Due today'
                              : `In ${days} days`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-white">
                        {formatCurrency(Number(bill.amount))}
                      </span>
                      <button
                        onClick={() => onMarkPaid(bill)}
                        className="opacity-0 group-hover:opacity-100 px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg transition-all"
                      >
                        Pay
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Recent Payments</h2>
            <CheckCircle2 className="w-4 h-4 text-slate-500" />
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No payments yet</p>
          ) : (
            <div className="space-y-2">
              {payments.slice(0, 6).map((payment) => {
                const bill = bills.find((b) => b.id === payment.bill_id);
                return (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-700/30"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {bill?.name ?? 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(payment.paid_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-white flex-shrink-0">
                      {formatCurrency(Number(payment.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category breakdown */}
      <CategoryBreakdown bills={bills} formatCurrency={formatCurrency} />
    </div>
  );
}

function CategoryBreakdown({
  bills,
  formatCurrency,
}: {
  bills: Bill[];
  formatCurrency: (n: number) => string;
}) {
  const byCategory = bills.reduce<Record<string, number>>((acc, b) => {
    const monthly = toMonthlyEquivalent(Number(b.amount), b.frequency);
    acc[b.category] = (acc[b.category] ?? 0) + monthly;
    return acc;
  }, {});

  const sorted = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const total = sorted.reduce((sum, [, val]) => sum + val, 0);

  if (sorted.length === 0) return null;

  const barColors = [
    'bg-emerald-500',
    'bg-blue-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-orange-500',
    'bg-teal-500',
  ];

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 md:p-6">
      <h2 className="text-base font-semibold text-white mb-4">Monthly Spending by Category</h2>
      <div className="space-y-3">
        {sorted.map(([cat, val], i) => {
          const pct = total > 0 ? (val / total) * 100 : 0;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-slate-300">{cat}</span>
                <span className="text-sm font-medium text-white">{formatCurrency(val)}</span>
              </div>
              <div className="h-2 bg-slate-900/50 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColors[i % barColors.length]} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BillsView({
  bills,
  allBills,
  formatCurrency,
  search,
  setSearch,
  filterCategory,
  setFilterCategory,
  filterFrequency,
  setFilterFrequency,
  showFilters,
  setShowFilters,
  categories,
  onEdit,
  onDelete,
  onMarkPaid,
  onAdd,
}: {
  bills: Bill[];
  allBills: Bill[];
  formatCurrency: (n: number) => string;
  search: string;
  setSearch: (s: string) => void;
  filterCategory: string;
  setFilterCategory: (s: string) => void;
  filterFrequency: string;
  setFilterFrequency: (s: string) => void;
  showFilters: boolean;
  setShowFilters: (b: boolean) => void;
  categories: string[];
  onEdit: (b: Bill) => void;
  onDelete: (id: string) => void;
  onMarkPaid: (b: Bill) => void;
  onAdd: () => void;
}) {
  const hasFilters = filterCategory !== 'all' || filterFrequency !== 'all';

  return (
    <div className="space-y-4">
      {/* Search & filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bills..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3.5 py-2.5 border rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${
            showFilters || hasFilters
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filter</span>
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filterFrequency}
            onChange={(e) => setFilterFrequency(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="all">All Frequencies</option>
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => {
                setFilterCategory('all');
                setFilterFrequency('all');
              }}
              className="px-3 py-2 text-sm text-slate-400 hover:text-white flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Bills list */}
      {bills.length === 0 ? (
        <div className="text-center py-16">
          <div className="inline-flex p-4 bg-slate-800 border border-slate-700 rounded-2xl mb-4">
            <Wallet className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            {allBills.length === 0 ? 'No bills yet' : 'No bills match your filters'}
          </h3>
          <p className="text-sm text-slate-500 mb-4">
            {allBills.length === 0
              ? 'Start tracking your bills and subscriptions'
              : 'Try adjusting your search or filters'}
          </p>
          {allBills.length === 0 && (
            <button
              onClick={onAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Your First Bill
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {bills.map((bill) => {
            const days = daysUntilDate(bill.payment_date);
            const isOverdue = days < 0;
            return (
              <div
                key={bill.id}
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 md:p-5 hover:border-slate-600 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{bill.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{bill.category}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      isOverdue
                        ? 'bg-red-500/15 text-red-400'
                        : days === 0
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-slate-700/50 text-slate-400'
                    }`}
                  >
                    {isOverdue
                      ? `${Math.abs(days)}d overdue`
                      : days === 0
                        ? 'Today'
                        : `${days}d left`}
                  </span>
                </div>

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xl font-bold text-white">{formatCurrency(Number(bill.amount))}</p>
                    <p className="text-xs text-slate-500 capitalize">{bill.frequency}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {bill.auto_renew && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-700/40 px-1.5 py-0.5 rounded">
                        <Repeat className="w-3 h-3" /> Auto
                      </span>
                    )}
                    {bill.reminder_enabled && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-700/40 px-1.5 py-0.5 rounded">
                        <Bell className="w-3 h-3" /> {bill.reminder_days}d
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 mb-3">
                  Due: {new Date(bill.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => onMarkPaid(bill)}
                    className="flex-1 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Pay
                  </button>
                  <button
                    onClick={() => onEdit(bill)}
                    className="px-2.5 py-2 bg-slate-700/50 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(bill.id)}
                    className="px-2.5 py-2 bg-slate-700/50 hover:bg-red-500/20 hover:text-red-400 text-slate-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarView({
  bills,
  formatCurrency,
  onMarkPaid,
}: {
  bills: Bill[];
  formatCurrency: (n: number) => string;
  onMarkPaid: (b: Bill) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const billsByDate = bills.reduce<Record<string, Bill[]>>((acc, bill) => {
    const d = bill.payment_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(bill);
    return acc;
  }, {});

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const today = new Date().toISOString().split('T')[0];
  const selectedBills = selectedDate ? billsByDate[selectedDate] ?? [] : [];

  return (
    <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
      <div className="lg:col-span-2 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">{monthName}</h2>
          <div className="flex gap-1">
            <button
              onClick={prevMonth}
              className="p-2 bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-2 bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-xs font-medium"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="p-2 bg-slate-700/50 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-slate-500 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayBills = billsByDate[dateStr] ?? [];
            const isToday = dateStr === today;
            const isSelected = dateStr === selectedDate;
            return (
              <button
                key={day}
                onClick={() => setSelectedDate(dateStr)}
                className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-start gap-0.5 transition-all border ${
                  isSelected
                    ? 'bg-emerald-500/20 border-emerald-500/40'
                    : isToday
                      ? 'bg-slate-700/50 border-slate-600'
                      : 'border-transparent hover:bg-slate-700/30'
                }`}
              >
                <span
                  className={`text-xs ${isToday ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}
                >
                  {day}
                </span>
                {dayBills.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 justify-center">
                    {dayBills.slice(0, 3).map((_, idx) => (
                      <div
                        key={idx}
                        className={`w-1 h-1 rounded-full ${
                          daysUntilDate(dateStr) < 0 ? 'bg-red-400' : 'bg-emerald-400'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day bills */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5">
        <h2 className="text-base font-semibold text-white mb-4">
          {selectedDate
            ? new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            : 'Select a date'}
        </h2>
        {selectedBills.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">
            {selectedDate ? 'No bills due on this date' : 'Click a date to see bills due'}
          </p>
        ) : (
          <div className="space-y-2">
            {selectedBills.map((bill) => (
              <div
                key={bill.id}
                className="p-3 bg-slate-900/30 rounded-xl border border-slate-700/30 group"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-white">{bill.name}</p>
                  <span className="text-sm font-semibold text-white">
                    {formatCurrency(Number(bill.amount))}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">
                  {bill.category} · {bill.frequency}
                </p>
                <button
                  onClick={() => onMarkPaid(bill)}
                  className="w-full py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Mark as Paid
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView() {
  const { currency, setCurrency, loading } = useCurrency();
  const { user, signOut } = useAuth();
  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 md:p-6">
        <h2 className="text-base font-semibold text-white mb-1">Currency</h2>
        <p className="text-sm text-slate-500 mb-4">
          Choose your preferred currency. It will be used throughout the app.
        </p>
        {loading ? (
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CURRENCIES.map((c: { code: string; symbol: string; label: string }) => (
              <button
                key={c.code}
                onClick={() => setCurrency(c.code)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  currency === c.code
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-white'
                    : 'bg-slate-900/30 border-slate-700/50 text-slate-300 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-bold">{c.symbol}</span>
                  {currency === c.code && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <p className="text-xs font-medium">{c.code}</p>
                <p className="text-[10px] text-slate-500 truncate">{c.label}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 md:p-6">
        <h2 className="text-base font-semibold text-white mb-1">Account</h2>
        <p className="text-sm text-slate-500 mb-4">Manage your account settings.</p>
        <div className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-700/30 mb-3">
          <div>
            <p className="text-sm font-medium text-white">{user?.email}</p>
            <p className="text-xs text-slate-500">Signed in</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <button
          onClick={signOut}
          className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

function RemindersModal({
  bills,
  formatCurrency,
  onClose,
}: {
  bills: Bill[];
  formatCurrency: (n: number) => string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-white">Reminders</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {bills.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">
              No upcoming reminders. You're all caught up!
            </p>
          ) : (
            <div className="space-y-2">
              {bills.map((bill) => {
                const days = daysUntilDate(bill.payment_date);
                return (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between p-3 bg-slate-900/30 rounded-xl border border-slate-700/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${days < 0 ? 'bg-red-400' : 'bg-amber-400'}`}
                      />
                      <div>
                        <p className="text-sm font-medium text-white">{bill.name}</p>
                        <p className="text-xs text-slate-500">
                          {days < 0
                            ? `${Math.abs(days)} days overdue`
                            : days === 0
                              ? 'Due today'
                              : `Due in ${days} days`}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {formatCurrency(Number(bill.amount))}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function daysUntilDate(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function advanceDate(dateStr: string, frequency: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'quarterly':
      d.setMonth(d.getMonth() + 3);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d.toISOString().split('T')[0];
}

function toMonthlyEquivalent(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly':
      return amount * 4.33;
    case 'monthly':
      return amount;
    case 'quarterly':
      return amount / 3;
    case 'yearly':
      return amount / 12;
    case 'one-time':
      return 0;
    default:
      return amount;
  }
}
