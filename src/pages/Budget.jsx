import { useState, useEffect } from 'react';
import { collection, addDoc, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { WalletCards, Plus } from 'lucide-react';

export default function Budget() {
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Ambil SEMUA budget keluarga, tanpa filter profil
  const fetchBudgets = async () => {
    try {
      const q = query(collection(db, "budgets"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBudgets(data);
    } catch (error) {
      console.error("Error fetching budgets: ", error);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  const handleAddBudget = async (e) => {
    e.preventDefault();
    if (!category || !amount) return;

    setLoading(true);
    try {
      await addDoc(collection(db, "budgets"), {
        category: category,
        amount: Number(amount),
        createdAt: new Date().toISOString()
      });
      setCategory('');
      setAmount('');
      fetchBudgets();
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const formatRp = (angka) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(angka);
  
  const totalBudget = budgets.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Total Budget Card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden">
        <div className="absolute -right-4 -top-4 opacity-20"><WalletCards size={100} /></div>
        <p className="text-indigo-100 text-sm font-medium mb-1 relative z-10">Total Budget Keluarga</p>
        <h2 className="text-3xl font-extrabold relative z-10">{formatRp(totalBudget)}</h2>
      </div>

      {/* Modern Form */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Plus size={18} className="text-indigo-500" /> Tambah Pos Budget
        </h3>
        <form onSubmit={handleAddBudget} className="space-y-4">
          <div>
            <input 
              type="text" 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
              placeholder="Kategori (Makan, Listrik, dsb)"
              required
            />
          </div>
          <div>
            <input 
              type="number" 
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-400"
              placeholder="Nominal Budget (Rp)"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-800 text-white font-bold py-3 rounded-2xl mt-2 active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Menyimpan...' : 'Simpan Kategori'}
          </button>
        </form>
      </div>

      {/* List */}
      <div>
        <h3 className="font-bold text-slate-700 mb-3 px-1">Daftar Anggaran</h3>
        <div className="space-y-3">
          {budgets.map((item) => (
            <div key={item.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50 flex justify-between items-center">
              <span className="font-semibold text-slate-700">{item.category}</span>
              <span className="text-indigo-600 font-bold">{formatRp(item.amount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}