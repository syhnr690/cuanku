import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency, cn } from '../lib/utils';
import { Category } from '../types';

interface SettingsProps {
  expenseLimit: number;
  categoryLimits: Record<string, number>;
  categories: Category[];
  onUpdateSettings: (newLimit: number, newCategoryLimits: Record<string, number>) => void;
  onAddCategory: (name: string, type: 'income' | 'expense') => void;
  onDeleteCategory: (id: number) => void;
}

export default function Settings({ 
  expenseLimit, 
  categoryLimits, 
  categories,
  onUpdateSettings, 
  onAddCategory,
  onDeleteCategory
}: SettingsProps) {
  const [globalLimit, setGlobalLimit] = useState(expenseLimit.toString());
  const [catLimits, setCatLimits] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showCategoryLimits, setShowCategoryLimits] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  // New category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<'income' | 'expense'>('expense');

  const expenseCategories = categories.filter(c => c.type === 'expense');
  const incomeCategories = categories.filter(c => c.type === 'income');

  useEffect(() => {
    const initialCatLimits: Record<string, string> = {};
    expenseCategories.forEach(cat => {
      initialCatLimits[cat.name] = (categoryLimits[cat.name] || 0).toString();
    });
    setCatLimits(initialCatLimits);
  }, [categoryLimits, categories]);

  // Calculate global limit whenever catLimits changes
  useEffect(() => {
    const sum = Object.values(catLimits).reduce((acc: number, val: string) => acc + (parseFloat(val) || 0), 0);
    setGlobalLimit(sum.toString());
  }, [catLimits]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    
    const settingsToSave: Record<string, string> = {
      'expense_limit': globalLimit
    };

    Object.entries(catLimits).forEach(([cat, val]) => {
      settingsToSave[`limit_category_${cat}`] = String(val);
    });

    try {
      const response = await fetch('/api/settings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });
      
      if (response.ok) {
        const newCategoryLimits: Record<string, number> = {};
        Object.entries(catLimits).forEach(([cat, val]) => {
          newCategoryLimits[cat] = parseFloat(String(val)) || 0;
        });
        onUpdateSettings(parseFloat(globalLimit) || 0, newCategoryLimits);
        setMessage({ type: 'success', text: 'Semua pengaturan berhasil diperbarui!' });
      } else {
        throw new Error();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal memperbarui pengaturan.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCatLimitChange = (cat: string, val: string) => {
    setCatLimits(prev => ({ ...prev, [cat]: val }));
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatType);
    setNewCatName('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto pb-12"
    >
      <div className="glass-card p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Pengaturan Keuangan</h3>
        
        <div className="space-y-8">
          {/* Global Limit */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              <h4>Limit Global</h4>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Limit Pengeluaran Bulanan Total (IDR)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(parseFloat(globalLimit) || 0)}
                  className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-600 font-bold outline-none cursor-not-allowed"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Otomatis</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Batas pengeluaran total dihitung secara otomatis dari akumulasi limit per kategori di bawah.
              </p>
            </div>
          </div>

          {/* Category Limits Toggle */}
          <div className="space-y-4">
            <button 
              onClick={() => setShowCategoryLimits(!showCategoryLimits)}
              className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                <h4>Limit Per Kategori</h4>
              </div>
              {showCategoryLimits ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <AnimatePresence>
              {showCategoryLimits && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    {expenseCategories.map(cat => (
                      <div key={cat.id}>
                        <label className="block text-xs font-medium text-slate-500 mb-1 ml-1">{cat.name}</label>
                        <input
                          type="number"
                          value={catLimits[cat.name] || ''}
                          onChange={(e) => handleCatLimitChange(cat.name, e.target.value)}
                          placeholder="0"
                          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-slate-400 italic">
                    * Kosongkan atau isi 0 jika tidak ingin membatasi kategori tertentu.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Category Management Toggle */}
          <div className="space-y-4">
            <button 
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="flex items-center justify-between w-full p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full" />
                <h4>Kelola Kategori</h4>
              </div>
              {showCategoryManager ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            <AnimatePresence>
              {showCategoryManager && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-6"
                >
                  {/* Add New Category */}
                  <form onSubmit={handleAddCategory} className="pt-2 space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="Nama kategori baru..."
                        className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all text-sm"
                      />
                      <select
                        value={newCatType}
                        onChange={(e) => setNewCatType(e.target.value as 'income' | 'expense')}
                        className="px-3 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      >
                        <option value="expense">Pengeluaran</option>
                        <option value="income">Pemasukan</option>
                      </select>
                      <button
                        type="submit"
                        className="p-2 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors"
                      >
                        <Plus size={20} />
                      </button>
                    </div>
                  </form>

                  {/* Category List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pengeluaran</h5>
                      <div className="space-y-2">
                        {expenseCategories.map(cat => (
                          <div key={cat.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg group">
                            <span className="text-sm text-slate-700">{cat.name}</span>
                            <button 
                              onClick={() => onDeleteCategory(cat.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Pemasukan</h5>
                      <div className="space-y-2">
                        {incomeCategories.map(cat => (
                          <div key={cat.id} className="flex items-center justify-between p-2 bg-white border border-slate-100 rounded-lg group">
                            <span className="text-sm text-slate-700">{cat.name}</span>
                            <button 
                              onClick={() => onDeleteCategory(cat.id)}
                              className="p-1 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-sm font-medium ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
            }`}>
              {message.text}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-200 transition-all active:scale-[0.98]"
          >
            <Save size={20} />
            {isSaving ? 'Menyimpan...' : 'Simpan Semua Pengaturan'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
