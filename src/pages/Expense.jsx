import { useState, useEffect, useContext } from 'react';
import { collection, addDoc, query, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { Receipt, PenLine, CreditCard, Edit3 } from 'lucide-react';
import { PeriodContext } from '../context/PeriodContext';

export default function Expense({ activeProfile }) {
  const [budgets, setBudgets] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('');
  const [amount, setAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [note, setNote] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const { activePeriod } = useContext(PeriodContext);

  const fetchData = async () => {
    try {
      const qBudget = query(collection(db, "budgets"));
      const budgetSnap = await getDocs(qBudget);
      const rawBudgets = budgetSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const currentBudgets = rawBudgets.filter(b => b.period === activePeriod || !b.period);
      setBudgets(currentBudgets);

      const qWallet = query(collection(db, "wallets"));
      const walletSnap = await getDocs(qWallet);
      const walletData = walletSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWallets(walletData);

      const qExpense = query(collection(db, "expenses"));
      const expenseSnap = await getDocs(qExpense);
      let expenseData = expenseSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      expenseData = expenseData.filter(e => e.period === activePeriod || !e.period);
      expenseData.sort((a, b) => new Date(b.date) - new Date(a.date));
      setExpenses(expenseData);
      
      if (currentBudgets.length > 0) setSelectedBudget(currentBudgets[0].id);
      if (walletData.length > 0 && !selectedWallet) setSelectedWallet(walletData[0].id);
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchData(); }, [activePeriod]);

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (!rawValue) { setAmount(''); setDisplayAmount(''); return; }
    setAmount(Number(rawValue));
    setDisplayAmount(new Intl.NumberFormat('id-ID').format(rawValue));
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!selectedBudget || !selectedWallet || !amount) return;
    setLoading(true);
    try {
      const budgetObj = budgets.find(b => b.id === selectedBudget);
      const walletObj = wallets.find(w => w.id === selectedWallet);

      await addDoc(collection(db, "expenses"), {
        budgetId: selectedBudget, category: budgetObj.category, walletName: walletObj.name,
        amount: Number(amount), note: note, spentBy: activeProfile, 
        period: activePeriod, // Tautkan ke periode
        date: new Date().toISOString()
      });

      await updateDoc(doc(db, "wallets", selectedWallet), { balance: increment(-Number(amount)) });
      setAmount(''); setDisplayAmount(''); setNote(''); fetchData();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleEditNote = async (id, currentNote) => {
    const newNote = window.prompt("Revisi catatan pengeluaran:", currentNote || "");
    if (newNote !== null && newNote !== currentNote) {
      try {
        await updateDoc(doc(db, "expenses", id), { note: newNote });
        fetchData();
      } catch (error) { alert("Gagal update catatan"); }
    }
  };

  const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  const formatDate = (iso) => new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-24 h-24 bg-rose-50 rounded-bl-full -z-0"></div>
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 relative z-10"><PenLine size={18} className="text-rose-500" /> Catat Pengeluaran</h3>
        
        <form onSubmit={handleAddExpense} className="space-y-4 relative z-10">
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-3 rounded-2xl focus-within:ring-2 focus-within:ring-rose-100 transition-all">
            <CreditCard size={18} className="text-slate-400 shrink-0" />
            <select value={selectedWallet} onChange={(e) => setSelectedWallet(e.target.value)} className="w-full bg-transparent border-none text-sm outline-none" required>
              <option value="" disabled>Pilih Sumber Dana...</option>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatRp(w.balance)})</option>)}
            </select>
          </div>
          
          <select value={selectedBudget} onChange={(e) => setSelectedBudget(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-rose-100 outline-none" required>
            {budgets.length === 0 && <option value="" disabled>Belum ada budget bulan ini</option>}
            {budgets.map(b => {
              const spent = expenses.filter(e => e.budgetId === b.id).reduce((sum, e) => sum + e.amount, 0);
              const remaining = b.amount - spent;
              return <option key={b.id} value={b.id}>{b.category} - Sisa: {formatRp(remaining)}</option>;
            })}
          </select>
            
          <input type="text" inputMode="numeric" value={displayAmount} onChange={handleAmountChange} className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-rose-100 outline-none placeholder:text-slate-400" placeholder="Nominal (Rp)" required />
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-rose-100 outline-none placeholder:text-slate-400" placeholder="Catatan (Opsional)" />
          <button type="submit" disabled={loading || budgets.length === 0} className="w-full bg-rose-500 text-white font-bold py-3 rounded-2xl mt-2 active:scale-95 disabled:opacity-50 shadow-md shadow-rose-200">
            {loading ? 'Mencatat...' : `Simpan sebagai ${activeProfile}`}
          </button>
        </form>
      </div>

      <div>
        <h3 className="font-bold text-slate-700 mb-3 px-1">Riwayat Transaksi</h3>
        {expenses.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6 bg-white rounded-3xl border border-slate-100 shadow-sm">Belum ada pengeluaran di periode ini.</p>
        ) : (
          <div className="space-y-3">
            {expenses.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex items-center gap-4">
                <div className="bg-rose-50 p-3 rounded-xl text-rose-500"><Receipt size={20} /></div>
                <div className="flex-1">
                  <h4 className="font-bold text-slate-800 text-sm">{item.category}</h4>
                  <p className="text-[10px] text-indigo-500 font-bold mb-0.5">Dari: {item.walletName || 'Dompet Umum'}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-xs text-slate-500">{item.note || 'Tanpa catatan'} • {formatDate(item.date)}</p>
                    <button onClick={() => handleEditNote(item.id, item.note)} className="text-slate-400 hover:text-rose-500 transition-colors p-1"><Edit3 size={12} /></button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-rose-500 text-sm mb-1">{formatRp(item.amount)}</p>
                  <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{item.spentBy}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}