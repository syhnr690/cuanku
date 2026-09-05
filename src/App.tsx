import { useState, useEffect } from 'react';
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle, History, LayoutDashboard, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Transaction, TransactionInput, Category } from './types';
import { cn, formatCurrency } from './lib/utils';
import Dashboard from './components/Dashboard';
import TransactionList from './components/TransactionList';
import TransactionForm from './components/TransactionForm';
import Settings from './components/Settings';

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenseLimit, setExpenseLimit] = useState(0);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
    fetchSettings();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      const data = await response.json();
      setTransactions(data);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.expense_limit) {
        setExpenseLimit(parseFloat(data.expense_limit));
      }
      
      const catLimits: Record<string, number> = {};
      Object.entries(data).forEach(([key, value]) => {
        if (key.startsWith('limit_category_')) {
          const catName = key.replace('limit_category_', '');
          catLimits[catName] = parseFloat(value as string) || 0;
        }
      });
      setCategoryLimits(catLimits);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const updateSettings = (newLimit: number, newCategoryLimits: Record<string, number>) => {
    setExpenseLimit(newLimit);
    setCategoryLimits(newCategoryLimits);
  };

  const addCategory = async (name: string, type: 'income' | 'expense') => {
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      });
      if (response.ok) {
        const newCat = await response.json();
        setCategories([...categories, newCat]);
      }
    } catch (error) {
      console.error('Failed to add category:', error);
    }
  };

  const deleteCategory = async (id: number) => {
    try {
      const catToDelete = categories.find(c => c.id === id);
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setCategories(categories.filter(cat => cat.id !== id));
        
        // Also remove limit from settings if it exists
        if (catToDelete) {
          await fetch('/api/settings/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [`limit_category_${catToDelete.name}`]: '0' }),
          });
          // Update local state
          const newCatLimits = { ...categoryLimits };
          delete newCatLimits[catToDelete.name];
          setCategoryLimits(newCatLimits);
        }
      }
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const addTransaction = async (input: TransactionInput) => {
    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (response.ok) {
        const newTx = await response.json();
        setTransactions([newTx, ...transactions]);
        setIsFormOpen(false);
      }
    } catch (error) {
      console.error('Failed to add transaction:', error);
    }
  };

  const deleteTransaction = async (id: number) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setTransactions(transactions.filter(tx => tx.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete transaction:', error);
    }
  };

  const totalIncome = transactions
    .filter(tx => tx.type === 'income')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const totalExpense = transactions
    .filter(tx => tx.type === 'expense')
    .reduce((acc, tx) => acc + tx.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-r border-slate-200 p-4 flex flex-col">
        <div className="flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Wallet size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">DuitKu</h1>
        </div>

        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              activeTab === 'dashboard' ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              activeTab === 'history' ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <History size={20} />
            Riwayat
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
              activeTab === 'settings' ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <SettingsIcon size={20} />
            Pengaturan
          </button>
        </nav>

        <div className="mt-auto pt-4 border-t border-slate-100 hidden md:block">
          <p className="text-[10px] text-slate-400 text-center uppercase tracking-widest font-bold">DuitKu v1.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {activeTab === 'dashboard' ? 'Ringkasan Keuangan' : 'Riwayat Transaksi'}
            </h2>
            <p className="text-slate-500">Selamat datang kembali, mari kelola keuanganmu.</p>
          </div>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-emerald-200 active:scale-95"
          >
            <Plus size={20} />
            Tambah Transaksi
          </button>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Saldo</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Wallet size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{formatCurrency(balance)}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pemasukan</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <ArrowUpCircle size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pengeluaran</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <ArrowDownCircle size={20} />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-600">{formatCurrency(totalExpense)}</div>
          </motion.div>
        </div>

        {/* Content Area */}
        <div className="space-y-8">
          {activeTab === 'dashboard' ? (
            <Dashboard 
              transactions={transactions} 
              expenseLimit={expenseLimit} 
              categoryLimits={categoryLimits}
            />
          ) : activeTab === 'history' ? (
            <TransactionList
              transactions={transactions}
              onDelete={deleteTransaction}
              loading={loading}
            />
          ) : (
            <Settings 
              expenseLimit={expenseLimit} 
              categoryLimits={categoryLimits}
              categories={categories}
              onUpdateSettings={updateSettings} 
              onAddCategory={addCategory}
              onDeleteCategory={deleteCategory}
            />
          )}
        </div>
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <TransactionForm
            categories={categories}
            onClose={() => setIsFormOpen(false)}
            onSubmit={addTransaction}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
