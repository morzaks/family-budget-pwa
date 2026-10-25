import { useState, useEffect, useContext } from 'react';
import { collection, addDoc, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { WalletCards, Plus, Copy, Trash2 } from 'lucide-react';
import { PeriodContext } from '../context/PeriodContext';

export default function Budget() {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [budgets, setBudgets] = useState([]);
  const [allBudgets, setAllBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const { activePeriod } = useContext(PeriodContext);

  const fetchData = async () => {
    try {
      const qB = query(collection(db, "budgets"), orderBy("createdAt", "desc"));
      const snapB = await getDocs(qB);
      const rawBudgets = snapB.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllBudgets(rawBudgets);
      
      setBudgets(rawBudgets.filter(b => b.period === activePeriod || !b.period));

      const qE = query(collection(db, "expenses"));
      const snapE = await getDocs(qE);
      const rawExpenses = snapE.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(rawExpenses.filter(e => e.period === activePeriod || !e.period));
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchData(); }, [activePeriod]);

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (!rawValue) { setAmount(''); setDisplayAmount(''); return; }
    setAmount(Number(rawValue));
    setDisplayAmount(new Intl.NumberFormat('id-ID').format(rawValue));
  };

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!category || !amount) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "budgets"), {
        category, 
        amount: Number(amount), 
        period: activePeriod,
        createdAt: new Date().toISOString()
      });
      setCategory(''); setAmount(''); setDisplayAmount('');
      fetchData();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const getPrevPeriodStr = (p) => {
    let [y, m] = p.split('-').map(Number);
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
    return `${y}-${String(m).padStart(2, '0')}`;
  };

  const handleCopyPrevMonth = async () => {
    if(!window.confirm("Salin semua kategori budget dari bulan lalu?")) return;
    setLoading(true);
    try {
      const prevPeriod = getPrevPeriodStr(activePeriod);
      const prevBudgets = allBudgets.filter(b => b.period === prevPeriod);
      
      for (const pb of prevBudgets) {
        await addDoc(collection(db, "budgets"), {
          category: pb.category, amount: pb.amount, period: activePeriod, createdAt: new Date().toISOString()
        });
      }
      fetchData();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // Fitur Delete Budget
  const handleDeleteBudget = async (id, categoryName) => {
    if (!window.confirm(`Yakin ingin menghapus budget "${categoryName}"? Pastikan tidak ada pengeluaran yang masih tertaut dengan budget ini.`)) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "budgets", id));
      fetchData();
    } catch (error) { 
      console.error(error); 
      alert("Gagal menghapus budget.");
    }
    setLoading(false);
  };

  const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  const totalBudget = budgets.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-20"><WalletCards size={100} /></div>
        <div className="relative z-10 flex justify-between items-end">
          <div>
            <p className="text-indigo-100 text-sm font-medium mb-1">Total Budget Periode Ini</p>
            <h2 className="text-3xl font-extrabold">{formatRp(totalBudget)}</h2>
          </div>
        </div>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Plus size={18} className="text-indigo-500" /> Tambah Pos Budget</h3>
        <form onSubmit={handleAddBudget} className="space-y-4">
          <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-sm outline-none placeholder:text-slate-400" placeholder="Kategori (Makan, Listrik, dsb)" required />
          <input type="text" inputMode="numeric" value={displayAmount} onChange={handleAmountChange} className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-sm outline-none placeholder:text-slate-400" placeholder="Nominal Budget (Rp)" required />
          <button type="submit" disabled={loading} className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl mt-2 active:scale-95 disabled:opacity-50">Simpan Kategori</button>
        </form>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="font-bold text-slate-700">Penggunaan Budget</h3>
          {budgets.length === 0 && (
             <button onClick={handleCopyPrevMonth} className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1 active:scale-95">
               <Copy size={12}/> Salin Bulan Lalu
             </button>
          )}
        </div>
        
        {budgets.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6 bg-white rounded-3xl border border-slate-100">Belum ada budget disiapkan bulan ini.</p>
        ) : (
          <div className="space-y-3">
            {budgets.map((item) => {
              const spent = expenses.filter(e => e.budgetId === item.id).reduce((sum, e) => sum + e.amount, 0);
              const remaining = item.amount - spent;
              const progress = Math.min((spent / item.amount) * 100, 100);
              
              return (
                <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">{item.category}</span>
                      <button onClick={() => handleDeleteBudget(item.id, item.category)} className="text-slate-300 hover:text-rose-500 transition-colors p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="text-right">
                      <span className={`font-bold block ${remaining < 0 ? 'text-rose-500' : 'text-indigo-600'}`}>Sisa {formatRp(remaining)}</span>
                      <span className="text-[10px] text-slate-400">dari {formatRp(item.amount)}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                    <div className={`h-1.5 rounded-full ${progress > 85 ? 'bg-rose-500' : 'bg-indigo-400'}`} style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}