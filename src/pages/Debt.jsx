import { useState, useEffect } from 'react';
import { collection, addDoc, query, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { CreditCard, History, CalendarDays, CheckCircle2, WalletCards } from 'lucide-react';

export default function Debt({ activeProfile }) {
  const [installments, setInstallments] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [selectedPayWallet, setSelectedPayWallet] = useState('');
  
  // State Input Baru
  const [itemName, setItemName] = useState('');
  const [platform, setPlatform] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [displayAmount, setDisplayAmount] = useState('');
  const [tenor, setTenor] = useState('');
  const [paidMonths, setPaidMonths] = useState('');
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      // Ambil Wallets
      const qWallet = query(collection(db, "wallets"));
      const walletSnap = await getDocs(qWallet);
      const walletData = walletSnap.docs.map(w => ({ id: w.id, ...w.data() }));
      setWallets(walletData);
      if (walletData.length > 0 && !selectedPayWallet) setSelectedPayWallet(walletData[0].id);

      // Ambil Installments
      const q = query(collection(db, "installments"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      data.sort((a, b) => {
        const aLunas = a.paidMonths >= a.tenor;
        const bLunas = b.paidMonths >= b.tenor;
        if (aLunas === bLunas) return new Date(b.createdAt) - new Date(a.createdAt);
        return aLunas ? 1 : -1;
      });
      setInstallments(data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAmountChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    if (!rawValue) {
      setInstallmentAmount(''); setDisplayAmount(''); return;
    }
    setInstallmentAmount(Number(rawValue));
    setDisplayAmount(new Intl.NumberFormat('id-ID').format(rawValue));
  };

  const handleAddInstallment = async (e) => {
    e.preventDefault();
    if (!itemName || !installmentAmount || !tenor || !startDate) return;
    setLoading(true);
    
    const validPaidMonths = paidMonths ? Math.min(Number(paidMonths), Number(tenor)) : 0;
    try {
      await addDoc(collection(db, "installments"), {
        itemName, platform, installmentAmount: Number(installmentAmount),
        tenor: Number(tenor), paidMonths: validPaidMonths, startDate,
        recordedBy: activeProfile, createdAt: new Date().toISOString()
      });
      setItemName(''); setPlatform(''); setInstallmentAmount(''); setDisplayAmount('');
      setTenor(''); setPaidMonths(''); setStartDate('');
      fetchData();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handlePayInstallment = async (item) => {
    if (item.paidMonths >= item.tenor) return;
    if (!selectedPayWallet) return alert("Pilih 'Sumber Dana Pembayaran' terlebih dahulu di atas daftar tagihan.");
    
    const walletObj = wallets.find(w => w.id === selectedPayWallet);
    if(!window.confirm(`Bayar cicilan ke-${item.paidMonths + 1} (${item.itemName}) menggunakan saldo ${walletObj.name}?`)) return;

    try {
      // 1. Update status cicilan (+1 bulan)
      const debtRef = doc(db, "installments", item.id);
      await updateDoc(debtRef, { paidMonths: item.paidMonths + 1 });

      // 2. Lempar ke expenses
      await addDoc(collection(db, "expenses"), {
        budgetId: 'cicilan-otomatis',
        category: `Cicilan: ${item.itemName} (${item.platform})`,
        walletName: walletObj.name,
        amount: item.installmentAmount,
        note: `Pembayaran bulan ke-${item.paidMonths + 1} dari ${item.tenor}`,
        spentBy: activeProfile,
        date: new Date().toISOString()
      });

      // 3. Potong saldo dompet
      const walletRef = doc(db, "wallets", selectedPayWallet);
      await updateDoc(walletRef, { balance: increment(-item.installmentAmount) });

      fetchData();
    } catch (error) { console.error(error); }
  };

  const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  const activeInstallments = installments.filter(i => i.paidMonths < i.tenor);
  const totalBulanan = activeInstallments.reduce((sum, item) => sum + item.installmentAmount, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-gradient-to-br from-rose-500 to-pink-600 rounded-3xl p-6 text-white shadow-lg shadow-rose-200 relative overflow-hidden">
        <div className="absolute -right-2 -bottom-2 opacity-20"><CreditCard size={100} /></div>
        <p className="text-rose-100 text-sm font-medium mb-1 relative z-10">Beban Cicilan Berjalan / Bulan</p>
        <h2 className="text-3xl font-extrabold relative z-10 mb-2">{formatRp(totalBulanan)}</h2>
        <p className="text-xs text-rose-50 relative z-10">{activeInstallments.length} tagihan aktif</p>
      </div>

      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <CalendarDays size={18} className="text-indigo-500" /> Tambah Cicilan Baru
        </h3>
        <form onSubmit={handleAddInstallment} className="space-y-3">
          <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" placeholder="Nama Barang (Misal: TV TCL)" required />
          <input type="text" value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" placeholder="Platform (Misal: SPayLater)" required />
          <input type="text" inputMode="numeric" value={displayAmount} onChange={handleAmountChange} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" placeholder="Nominal Cicilan per Bulan (Rp)" required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 ml-1">Total Tenor</label>
              <input type="number" value={tenor} onChange={(e) => setTenor(e.target.value)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" placeholder="Bulan" required />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 ml-1">Backdate</label>
              <input type="number" value={paidMonths} onChange={(e) => setPaidMonths(e.target.value)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" placeholder="Sdh jalan?" />
            </div>
          </div>
          <div>
             <label className="text-[10px] font-bold text-slate-500 ml-1">Mulai Cicilan</label>
             <input type="month" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl mt-2 active:scale-95 disabled:opacity-50">Simpan Skema Cicilan</button>
        </form>
      </div>

      <div>
        <div className="flex justify-between items-center mb-3 px-1">
          <h3 className="font-bold text-slate-700">Tagihan Berjalan</h3>
        </div>

        {/* Global Wallet Selector for Payments */}
        {activeInstallments.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl mb-4 flex items-center gap-3">
            <WalletCards size={20} className="text-indigo-500 shrink-0" />
            <select 
              value={selectedPayWallet}
              onChange={(e) => setSelectedPayWallet(e.target.value)}
              className="w-full bg-transparent border-none text-sm font-bold text-indigo-800 outline-none"
            >
              <option value="" disabled>Pilih Sumber Dana Pembayaran...</option>
              {wallets.map(w => <option key={w.id} value={w.id}>Bayar pakai: {w.name} ({formatRp(w.balance)})</option>)}
            </select>
          </div>
        )}

        {installments.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6 bg-white rounded-3xl">Belum ada cicilan.</p>
        ) : (
          <div className="space-y-4">
            {installments.map((item) => {
              const isLunas = item.paidMonths >= item.tenor;
              const progress = (item.paidMonths / item.tenor) * 100;
              return (
                <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-50 ${isLunas ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-slate-800">{item.itemName}</h4>
                      <p className="text-xs text-indigo-500 font-bold">{item.platform}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-rose-500">{formatRp(item.installmentAmount)}<span className="text-[10px] text-slate-400">/bln</span></p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1">
                      <span>Progres: {item.paidMonths} dari {item.tenor} Bulan</span>
                      {isLunas && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={12}/> Lunas</span>}
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all duration-1000 ${isLunas ? 'bg-emerald-400' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>

                  {!isLunas && (
                    <button 
                      onClick={() => handlePayInstallment(item)}
                      className="w-full mt-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold py-2.5 rounded-xl text-sm transition-colors flex justify-center items-center gap-2"
                    >
                      <History size={16} /> Bayar Cicilan ke-{item.paidMonths + 1}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}