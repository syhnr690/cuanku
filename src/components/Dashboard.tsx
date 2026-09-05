import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { id } from 'date-fns/locale';
import { Transaction } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion } from 'motion/react';

interface DashboardProps {
  transactions: Transaction[];
  expenseLimit: number;
  categoryLimits: Record<string, number>;
}

export default function Dashboard({ transactions, expenseLimit, categoryLimits }: DashboardProps) {
  // Last 6 months data for bar chart
  const last6Months = Array.from({ length: 6 }).map((_, i) => {
    const date = subMonths(new Date(), i);
    const monthStart = startOfMonth(date);
    const monthEnd = endOfMonth(date);
    const monthName = format(date, 'MMM', { locale: id });

    const monthTxs = transactions.filter(tx => 
      isWithinInterval(new Date(tx.date), { start: monthStart, end: monthEnd })
    );

    const income = monthTxs.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expense = monthTxs.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);

    return { name: monthName, income, expense, date };
  }).reverse();

  // Category breakdown for pie chart (current month)
  const currentMonthStart = startOfMonth(new Date());
  const currentMonthEnd = endOfMonth(new Date());
  const currentMonthExpenses = transactions.filter(tx => 
    tx.type === 'expense' && 
    isWithinInterval(new Date(tx.date), { start: currentMonthStart, end: currentMonthEnd })
  );

  const categoryDataMap = currentMonthExpenses.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    return acc;
  }, {} as Record<string, number>);

  const categoryData = Object.entries(categoryDataMap).map(([name, value]) => ({ name, value }));
  
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

  const currentMonthExpenseTotal = transactions
    .filter(tx => tx.type === 'expense' && isWithinInterval(new Date(tx.date), { start: currentMonthStart, end: currentMonthEnd }))
    .reduce((sum, tx) => sum + tx.amount, 0);

  const expenseLimitPercentage = expenseLimit > 0 ? Math.min((currentMonthExpenseTotal / expenseLimit) * 100, 100) : 0;
  const isOverLimit = expenseLimit > 0 && currentMonthExpenseTotal > expenseLimit;

  return (
    <div className="space-y-8">
      {/* Expense Limit Progress */}
      {expenseLimit > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Limit Pengeluaran Bulan Ini</h3>
              <p className="text-sm text-slate-500">
                {formatCurrency(currentMonthExpenseTotal)} dari {formatCurrency(expenseLimit)}
              </p>
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              isOverLimit ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
            )}>
              {isOverLimit ? 'Melebihi Limit' : `${Math.round(expenseLimitPercentage)}% Terpakai`}
            </span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${expenseLimitPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isOverLimit ? "bg-rose-500" : expenseLimitPercentage > 80 ? "bg-amber-500" : "bg-emerald-500"
              )}
            />
          </div>
          {isOverLimit && (
            <p className="mt-3 text-sm text-rose-600 font-medium flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
              Peringatan: Pengeluaran Anda telah melebihi batas yang ditentukan!
            </p>
          )}
        </motion.div>
      )}

      {/* Category Limits Progress */}
      {Object.values(categoryLimits).some(limit => limit > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(categoryLimits).filter(([_, limit]) => limit > 0).map(([cat, limit], idx) => {
            const catExpense = transactions
              .filter(tx => tx.type === 'expense' && tx.category === cat && isWithinInterval(new Date(tx.date), { start: currentMonthStart, end: currentMonthEnd }))
              .reduce((sum, tx) => sum + tx.amount, 0);
            const percentage = Math.min((catExpense / limit) * 100, 100);
            const isCatOver = catExpense > limit;

            return (
              <motion.div
                key={cat}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="glass-card p-4"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-slate-700">{cat}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full",
                    isCatOver ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {isCatOver ? 'OVER' : `${Math.round(percentage)}%`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={cn(
                      "h-full transition-all duration-500",
                      isCatOver ? "bg-rose-500" : percentage > 80 ? "bg-amber-500" : "bg-blue-500"
                    )}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-400">
                  <span>{formatCurrency(catExpense)}</span>
                  <span>Limit: {formatCurrency(limit)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Bar Chart */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-6 min-h-[400px] flex flex-col"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-6">Arus Kas (6 Bulan Terakhir)</h3>
        <div className="flex-1 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={last6Months}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(val) => `Rp${val/1000}k`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} name="Pemasukan" />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} name="Pengeluaran" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Pie Chart */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-6 min-h-[400px] flex flex-col"
      >
        <h3 className="text-lg font-bold text-slate-900 mb-6">Pengeluaran Bulan Ini</h3>
        {categoryData.length > 0 ? (
          <div className="flex-1 flex flex-col md:flex-row items-center">
            <div className="w-full h-[250px] md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-2 mt-4 md:mt-0 md:pl-8">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-600">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{formatCurrency(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 italic">
            Belum ada data pengeluaran bulan ini.
          </div>
        )}
      </motion.div>

      {/* Recent Transactions Widget */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card p-6 lg:col-span-2"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Transaksi Terakhir</h3>
          <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700">Lihat Semua</button>
        </div>
        <div className="space-y-4">
          {transactions.slice(0, 5).map((tx) => (
            <div key={tx.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  tx.type === 'income' ? "bg-emerald-500" : "bg-rose-500"
                )} />
                <div>
                  <p className="text-sm font-semibold text-slate-900">{tx.category}</p>
                  <p className="text-xs text-slate-500">{format(new Date(tx.date), 'dd MMM yyyy', { locale: id })}</p>
                </div>
              </div>
              <span className={cn(
                "text-sm font-bold",
                tx.type === 'income' ? "text-emerald-600" : "text-rose-600"
              )}>
                {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
              </span>
            </div>
          ))}
          {transactions.length === 0 && (
            <p className="text-center text-slate-400 py-4 italic">Belum ada transaksi.</p>
          )}
        </div>
      </motion.div>
    </div>
  </div>
  );
}
