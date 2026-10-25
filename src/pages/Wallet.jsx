import { useState, useEffect } from 'react';
import { collection, addDoc, query, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { db } from '../firebase';
import { CreditCard, ArrowRightLeft, Plus, ArrowDownToLine, Settings2 } from 'lucide-react';

export default function WalletPage() {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [newWalletName, setNewWalletName] = useState('');
  const [topupWallet, setTopupWallet] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [displayTopup, setDisplayTopup] = useState('');

  const [fromWallet, setFromWallet] = useState('');
  const [toWallet, setToWallet] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [displayTransfer, setDisplayTransfer] = useState('');

  // State Koreksi Saldo
  const [adjWallet, setAdjWallet] = useState('');
  const [adjType, setAdjType] = useState('Kurang');
  const [adjAmount, setAdjAmount] = useState('');
  const [displayAdj, setDisplayAdj] = useState('');

  const fetchWallets = async () => {
    try {
      const q = query(collection(db, "wallets"));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => b.balance - a.balance);
      setWallets(data);
      
      if (data.length > 0 && !topupWallet) {
        setTopupWallet(data[0].id);
        setAdjWallet(data[0].id);
      }
      if (data.length > 1 && !fromWallet) {
        setFromWallet(data[0].id);
        setToWallet(data[1].id);
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchWallets(); }, []);

  const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  const handleNumChange = (e, setRaw, setDisp) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setRaw(val ? Number(val) : '');
    setDisp(val ? new Intl.NumberFormat('id-ID').format(val) : '');
  };

  const handleAddWallet = async (e) => {
    e.preventDefault();
    if (!newWalletName) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "wallets"), { name: newWalletName, balance: 0, createdAt: new Date().toISOString() });
      setNewWalletName(''); fetchWallets();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleTopup = async (e) => {
    e.preventDefault();
    if (!topupWallet || !topupAmount) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "wallets", topupWallet), { balance: increment(topupAmount) });
      setTopupAmount(''); setDisplayTopup(''); fetchWallets();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!fromWallet || !toWallet || !transferAmount || fromWallet === toWallet) return alert("Pilih dompet berbeda.");
    setLoading(true);
    try {
      await updateDoc(doc(db, "wallets", fromWallet), { balance: increment(-transferAmount) });
      await updateDoc(doc(db, "wallets", toWallet), { balance: increment(transferAmount) });
      setTransferAmount(''); setDisplayTransfer(''); fetchWallets();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  // Logika Koreksi Saldo
  const handleAdjustment = async (e) => {
    e.preventDefault();
    if (!adjWallet || !adjAmount) return;
    setLoading(true);
    try {
      const modifier = adjType === 'Kurang' ? -Number(adjAmount) : Number(adjAmount);
      await updateDoc(doc(db, "wallets", adjWallet), { balance: increment(modifier) });
      setAdjAmount(''); setDisplayAdj(''); fetchWallets();
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-200">
        <p className="text-blue-100 text-sm font-medium mb-1">Total Uang Tersedia</p>
        <h2 className="text-3xl font-extrabold mb-4">{formatRp(totalBalance)}</h2>
        <div className="space-y-2 mt-4">
          {wallets.length === 0 && <p className="text-xs text-blue-200">Belum ada dompet.</p>}
          {wallets.map(w => (
            <div key={w.id} className="flex justify-between items-center bg-white/10 p-2.5 rounded-xl border border-white/20">
              <span className="font-semibold text-sm">{w.name}</span>
              <span className="font-bold text-sm">{formatRp(w.balance)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Setor Uang */}
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <ArrowDownToLine size={18} className="text-emerald-500" /> Setor Uang (Income)
          </h3>
          <form onSubmit={handleTopup} className="space-y-3">
            <select value={topupWallet} onChange={(e) => setTopupWallet(e.target.value)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" required>
              {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <input type="text" inputMode="numeric" value={displayTopup} onChange={(e) => handleNumChange(e, setTopupAmount, setDisplayTopup)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" placeholder="Nominal (Rp)" required />
            <button type="submit" disabled={loading} className="w-full bg-emerald-500 text-white font-bold py-3 rounded-2xl active:scale-95 disabled:opacity-50">Setor Saldo</button>
          </form>
        </div>

        {/* Transfer */}
        {wallets.length >= 2 && (
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-amber-500" /> Mutasi / Transfer
            </h3>
            <form onSubmit={handleTransfer} className="space-y-3">
              <div className="flex items-center gap-2">
                <select value={fromWallet} onChange={(e) => setFromWallet(e.target.value)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" required>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
                <ArrowRightLeft size={24} className="text-slate-400 shrink-0" />
                <select value={toWallet} onChange={(e) => setToWallet(e.target.value)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" required>
                  {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <input type="text" inputMode="numeric" value={displayTransfer} onChange={(e) => handleNumChange(e, setTransferAmount, setDisplayTransfer)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" placeholder="Nominal Transfer (Rp)" required />
              <button type="submit" disabled={loading} className="w-full bg-amber-500 text-white font-bold py-3 rounded-2xl active:scale-95 disabled:opacity-50">Transfer</button>
            </form>
          </div>
        )}

        {/* Koreksi Saldo */}
        {wallets.length > 0 && (
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Settings2 size={18} className="text-slate-500" /> Koreksi Saldo
            </h3>
            <form onSubmit={handleAdjustment} className="space-y-3">
              <select value={adjWallet} onChange={(e) => setAdjWallet(e.target.value)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" required>
                {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <div className="flex gap-2">
                <select value={adjType} onChange={(e) => setAdjType(e.target.value)} className="bg-slate-50 px-4 py-3 rounded-2xl text-sm font-bold outline-none text-slate-700">
                  <option value="Kurang">Kurangi (-)</option>
                  <option value="Tambah">Tambahi (+)</option>
                </select>
                <input type="text" inputMode="numeric" value={displayAdj} onChange={(e) => handleNumChange(e, setAdjAmount, setDisplayAdj)} className="w-full bg-slate-50 px-4 py-3 rounded-2xl text-sm outline-none" placeholder="Nominal (Rp)" required />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl active:scale-95 disabled:opacity-50">Sesuaikan Saldo</button>
            </form>
          </div>
        )}

        <div className="bg-slate-100 p-5 rounded-3xl border border-slate-200">
          <h3 className="font-bold text-slate-700 mb-3 flex items-center gap-2 text-sm"><Plus size={16} /> Buka Dompet Baru</h3>
          <form onSubmit={handleAddWallet} className="flex gap-2">
            <input type="text" value={newWalletName} onChange={(e) => setNewWalletName(e.target.value)} className="flex-1 bg-white px-4 py-2.5 rounded-xl text-sm outline-none" placeholder="Nama Dompet..." required />
            <button type="submit" disabled={loading} className="bg-slate-800 text-white px-4 font-bold rounded-xl active:scale-95 text-sm">Buat</button>
          </form>
        </div>

      </div>
    </div>
  );
}