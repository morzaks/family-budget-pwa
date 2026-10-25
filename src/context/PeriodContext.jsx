import { createContext, useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export const PeriodContext = createContext();

export function PeriodProvider({ children }) {
  const getDefaultPeriod = () => {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();

    if (today.getDate() < 25) {
      month -= 1;
      if (month < 0) { month = 11; year -= 1; }
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };

  const [activePeriod, setActivePeriod] = useState(getDefaultPeriod());
  const [dynamicOptions, setDynamicOptions] = useState([]);

  useEffect(() => {
    const fetchAvailablePeriods = async () => {
      try {
        const uniquePeriods = new Set();
        
        // 1. Selalu masukkan periode default (Bulan ini)
        const current = getDefaultPeriod();
        uniquePeriods.add(current);
        
        // 2. Selalu masukkan 1 bulan ke depan (untuk planning budget baru)
        let [y, m] = current.split('-').map(Number);
        m += 1;
        if (m > 12) { m = 1; y += 1; }
        uniquePeriods.add(`${y}-${String(m).padStart(2, '0')}`);

        // 3. Scan Firebase: Ambil periode lama yang ada datanya
        const snapB = await getDocs(collection(db, "budgets"));
        snapB.docs.forEach(doc => {
          if (doc.data().period) uniquePeriods.add(doc.data().period);
        });

        const snapE = await getDocs(collection(db, "expenses"));
        snapE.docs.forEach(doc => {
          if (doc.data().period) uniquePeriods.add(doc.data().period);
        });

        // 4. Format menjadi array dropdown dan urutkan dari terbaru ke terlama
        const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        
        const options = Array.from(uniquePeriods)
          .sort()
          .reverse() 
          .map(periodStr => {
            const [year, month] = periodStr.split('-').map(Number);
            return { value: periodStr, label: `${monthNames[month - 1]} ${year}` };
          });
        
        setDynamicOptions(options);
      } catch (error) { console.error("Gagal mengambil periode", error); }
    };
    
    fetchAvailablePeriods();
  }, []);

  const getPeriodRange = (periodStr) => {
    const [year, month] = periodStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 25, 0, 0, 0);
    const endDate = new Date(year, month, 24, 23, 59, 59);
    return { start: startDate.toISOString(), end: endDate.toISOString() };
  };

  const getDropdownOptions = () => {
    // Fallback sesaat saat data Firebase sedang di-loading
    if (dynamicOptions.length === 0) {
      const p = getDefaultPeriod();
      const [y, m] = p.split('-').map(Number);
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      return [{ value: p, label: `${monthNames[m - 1]} ${y}` }];
    }
    return dynamicOptions;
  };

  return (
    <PeriodContext.Provider value={{ activePeriod, setActivePeriod, getPeriodRange, getDropdownOptions }}>
      {children}
    </PeriodContext.Provider>
  );
}