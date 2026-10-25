import { useState, useEffect, useContext } from 'react';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Wallet, TrendingDown, Activity, ArrowRight, Sparkles, CalendarDays, Download } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PeriodContext } from '../context/PeriodContext';
import * as XLSX from 'xlsx';

export default function Dashboard({ activeProfile }) {
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { activePeriod, setActivePeriod, getDropdownOptions, getPeriodRange } = useContext(PeriodContext);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { start, end } = getPeriodRange(activePeriod);

        const qBudget = query(collection(db, "budgets"));
        const budgetSnap = await getDocs(qBudget);
        let budgetData = budgetSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        budgetData = budgetData.filter(b => b.period === activePeriod || !b.period);
        setBudgets(budgetData);

        const qExpense = query(collection(db, "expenses"));
        const expenseSnap = await getDocs(qExpense);
        let expenseData = expenseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        expenseData = expenseData.filter(e => e.period === activePeriod || (!e.period && e.date >= start && e.date <= end));
        expenseData.sort((a, b) => new Date(b.date) - new Date(a.date));
        setExpenses(expenseData);
        
      } catch (error) { console.error(error); }
      setLoading(false);
    };
    fetchData();
  }, [activePeriod]);

  // Fitur Export ke Excel
  const handleExportExcel = () => {
    if (expenses.length === 0) {
      alert("Tidak ada data transaksi untuk diexport pada periode ini.");
      return;
    }

    // 1. Siapkan struktur baris data untuk Excel
    const excelData = expenses.map((item, index) => ({
      "No": index + 1,
      "Tanggal": new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      "Kategori Budget": item.category,
      "Sumber Dana": item.walletName || 'Dompet Umum',
      "Catatan": item.note || '-',
      "Pencatat": item.spentBy,
      "Nominal (Rp)": item.amount // Biarkan berupa angka agar bisa di-SUM di Excel
    }));

    // 2. Buat Worksheet dan Workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Pengeluaran");

    // 3. Atur lebar kolom agar rapi
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 15 }, // Tanggal
      { wch: 20 }, // Kategori Budget
      { wch: 15 }, // Sumber Dana
      { wch: 30 }, // Catatan
      { wch: 10 }, // Pencatat
      { wch: 15 }  // Nominal
    ];

    // 4. Unduh File
    XLSX.writeFile(workbook, `FamFund_Laporan_${activePeriod}.xlsx`);
  };

  const totalBudget = budgets.reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const remainingBudget = totalBudget - totalExpense;
  const usagePercentage = totalBudget > 0 ? Math.min((totalExpense / totalBudget) * 100, 100) : 0;
  
  const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  const formatDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const recentExpenses = expenses.slice(0, 3);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-700">
          <Sparkles size={20} className="text-amber-500" />
          <h2 className="font-bold text-lg">Halo, {activeProfile}!</h2>
        </div>
        
        <div className="relative">
          <select value={activePeriod} onChange={(e) => setActivePeriod(e.target.value)} className="appearance-none bg-indigo-50 border-none text-indigo-700 pl-8 pr-4 py-2 rounded-xl font-bold text-xs outline-none cursor-pointer">
            {getDropdownOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <CalendarDays className="absolute left-2.5 top-1.5 text-indigo-500" size={14} />
        </div>
      </div>

      <div className="bg-gradient-to-br from-teal-400 to-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-emerald-200 relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-20"><Wallet size={120} /></div>
        <p className="text-teal-50 text-sm font-medium mb-1 relative z-10">Sisa Budget Bulan Ini</p>
        <h1 className="text-4xl font-extrabold relative z-10 mb-4 tracking-tight">{formatRp(remainingBudget)}</h1>
        <div className="relative z-10 mt-2">
          <div className="flex justify-between text-xs font-medium text-teal-50 mb-1.5">
            <span>Terpakai {usagePercentage.toFixed(0)}%</span>
            <span>{formatRp(totalBudget)}</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2.5 backdrop-blur-sm">
            <div className={`h-2.5 rounded-full transition-all duration-1000 ${usagePercentage > 85 ? 'bg-red-400' : 'bg-white'}`} style={{ width: `${usagePercentage}%` }}></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="bg-indigo-50 p-2.5 rounded-full text-indigo-500 mb-2"><Activity size={20} /></div>
          <p className="text-xs text-slate-500 font-medium mb-1">Total Budget</p>
          <p className="font-bold text-slate-800">{formatRp(totalBudget)}</p>
        </div>
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="bg-rose-50 p-2.5 rounded-full text-rose-500 mb-2"><TrendingDown size={20} /></div>
          <p className="text-xs text-slate-500 font-medium mb-1">Pengeluaran</p>
          <p className="font-bold text-slate-800">{formatRp(totalExpense)}</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="font-bold text-slate-700">Transaksi Terakhir</h3>
          <Link to="/expense" className="text-xs font-bold text-indigo-500 flex items-center gap-1">Lihat Semua <ArrowRight size={14} /></Link>
        </div>
        {loading ? <p className="text-center text-slate-400 py-4 text-sm">Memuat...</p> : 
         recentExpenses.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6 bg-white rounded-3xl border border-slate-100 shadow-sm">Belum ada transaksi di periode ini.</p>
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
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{item.spentBy}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tombol Export Excel */}
        {expenses.length > 0 && (
          <button onClick={handleExportExcel} className="w-full mt-4 bg-emerald-50 text-emerald-600 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all border border-emerald-100 shadow-sm">
            <Download size={18} /> Export Laporan (.xlsx)
          </button>
        )}
      </div>
    </div>
  );
}