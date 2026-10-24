import { useState, useEffect } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Wallet, TrendingDown, Activity, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard({ activeProfile }) {
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Ambil semua data budget
        const qBudget = query(collection(db, "budgets"));
        const budgetSnap = await getDocs(qBudget);
        const budgetData = budgetSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBudgets(budgetData);

        // Ambil semua data pengeluaran
        const qExpense = query(collection(db, "expenses"));
        const expenseSnap = await getDocs(qExpense);
        const expenseData = expenseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Urutkan pengeluaran dari yang terbaru
        expenseData.sort((a, b) => new Date(b.date) - new Date(a.date));
        setExpenses(expenseData);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // Kalkulasi Utama
  const totalBudget = budgets.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = totalBudget - totalExpense;
  
  // Persentase pemakaian (maksimal 100% agar bar tidak jebol)
  const usagePercentage = totalBudget > 0 ? Math.min((totalExpense / totalBudget) * 100, 100) : 0;

  // Format ke Rupiah
  const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  const formatDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  // Ambil 3 transaksi terakhir saja untuk preview
  const recentExpenses = expenses.slice(0, 3);

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-slate-400">Memuat data...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Sapaan */}
      <div className="flex items-center gap-2 text-slate-700">
        <Sparkles size={20} className="text-amber-500" />
        <h2 className="font-bold text-lg">Halo, {activeProfile}!</h2>
      </div>

      {/* Main Balance Card */}
      <div className="bg-gradient-to-br from-teal-400 to-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-20"><Wallet size={120} /></div>
        <p className="text-teal-50 text-sm font-medium mb-1 relative z-10">Sisa Budget Keluarga</p>
        <h1 className="text-4xl font-extrabold relative z-10 mb-4 tracking-tight">
          {formatRp(remainingBudget)}
        </h1>
        
        {/* Progress Bar Visual */}
        <div className="relative z-10 mt-2">
          <div className="flex justify-between text-xs font-medium text-teal-50 mb-1.5">
            <span>Terpakai {usagePercentage.toFixed(0)}%</span>
            <span>{formatRp(totalBudget)}</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm">
            <div 
              className={`h-2.5 rounded-full transition-all duration-1000 ${usagePercentage > 85 ? 'bg-red-400' : 'bg-white'}`}
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="bg-indigo-50 p-2.5 rounded-full text-indigo-500 mb-2">
            <Activity size={20} />
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Total Budget</p>
          <p className="font-bold text-slate-800">{formatRp(totalBudget)}</p>
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="bg-rose-50 p-2.5 rounded-full text-rose-500 mb-2">
            <TrendingDown size={20} />
          </div>
          <p className="text-xs text-slate-500 font-medium mb-1">Pengeluaran</p>
          <p className="font-bold text-slate-800">{formatRp(totalExpense)}</p>
        </div>
      </div>

      {/* Recent Transactions Preview */}
      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="font-bold text-slate-700">Transaksi Terakhir</h3>
          <Link to="/expense" className="text-xs font-bold text-indigo-500 flex items-center gap-1 hover:text-indigo-600 transition-colors">
            Lihat Semua <ArrowRight size={14} />
          </Link>
        </div>
        
        {recentExpenses.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6 bg-white rounded-3xl border border-slate-100 shadow-sm">Belum ada transaksi.</p>
        ) : (
          <div className="space-y-3">
            {recentExpenses.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex items-center gap-4">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm">{item.category}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{item.note || 'Tanpa catatan'} • {formatDate(item.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-rose-500 text-sm mb-1">-{formatRp(item.amount)}</p>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                    {item.spentBy}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}