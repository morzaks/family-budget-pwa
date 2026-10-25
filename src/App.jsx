import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Wallet, ReceiptText, Landmark, UserCircle, CreditCard } from 'lucide-react';
import { PeriodProvider } from './context/PeriodContext'; // IMPORT BARU

import Dashboard from './pages/Dashboard';
import Budget from './pages/Budget';
import Expense from './pages/Expense';
import Debt from './pages/Debt';
import WalletPage from './pages/Wallet';

function BottomNav() {
  // ... (KODE BOTTOM NAV TIDAK BERUBAH) ...
  const location = useLocation();
  const navItems = [
    { path: '/', label: 'Home', icon: <Home size={22} /> },
    { path: '/wallet', label: 'Dompet', icon: <CreditCard size={22} /> },
    { path: '/budget', label: 'Budget', icon: <Wallet size={22} /> },
    { path: '/expense', label: 'Catat', icon: <ReceiptText size={22} /> },
    { path: '/debt', label: 'Cicilan', icon: <Landmark size={22} /> },
  ];

  return (
    <div className="fixed bottom-4 left-4 right-4 max-w-md mx-auto bg-white/90 backdrop-blur-md shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-3xl flex justify-around p-2 z-50 border border-gray-100">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link key={item.path} to={item.path} className={`flex flex-col items-center p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>
            {item.icon}
            <span className={`text-[9px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState(() => localStorage.getItem('activeProfile') || 'Suami');
  useEffect(() => { localStorage.setItem('activeProfile', profile); }, [profile]);

  return (
    // BUNGKUS DENGAN PeriodProvider
    <PeriodProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex justify-center font-sans">
          <div className="w-full max-w-md bg-slate-50 min-h-screen relative pb-28">
            
            <header className="bg-slate-50 pt-6 pb-4 px-6 sticky top-0 z-10 flex justify-between items-center">
              <div>
                <h1 className="font-extrabold text-2xl text-slate-800 tracking-tight">FamFund.</h1>
                <p className="text-xs text-slate-500 font-medium">Satu dompet, untuk berdua.</p>
              </div>
              <div className="relative">
                <select value={profile} onChange={(e) => setProfile(e.target.value)} className="appearance-none bg-white border border-slate-200 shadow-sm text-indigo-700 pl-9 pr-4 py-2 rounded-full font-bold text-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-100 transition-all">
                  <option value="Suami">Suami</option>
                  <option value="Istri">Istri</option>
                </select>
                <UserCircle className="absolute left-2.5 top-2 text-indigo-500" size={18} />
              </div>
            </header>

            <main className="px-6">
              <Routes>
                <Route path="/" element={<Dashboard activeProfile={profile} />} />
                <Route path="/wallet" element={<WalletPage />} />
                <Route path="/budget" element={<Budget />} />
                <Route path="/expense" element={<Expense activeProfile={profile} />} />
                <Route path="/debt" element={<Debt activeProfile={profile} />} />
              </Routes>
            </main>

            <BottomNav />
          </div>
        </div>
      </Router>
    </PeriodProvider>
  );
}