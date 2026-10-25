import { createContext, useState } from 'react';

export const PeriodContext = createContext();

export function PeriodProvider({ children }) {
  // Logika otomatis: Jika hari ini < tgl 25, masuk periode bulan lalu. Jika >= 25, masuk bulan ini.
  const getDefaultPeriod = () => {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth(); // 0 = Jan, 11 = Des

    if (today.getDate() < 25) {
      month -= 1;
      if (month < 0) { month = 11; year -= 1; }
    }
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };

  const [activePeriod, setActivePeriod] = useState(getDefaultPeriod());

  // Helper untuk mengubah "2026-10" menjadi range (25 Okt 2026 - 24 Nov 2026)
  const getPeriodRange = (periodStr) => {
    const [year, month] = periodStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 25, 0, 0, 0);
    const endDate = new Date(year, month, 24, 23, 59, 59);
    return { start: startDate.toISOString(), end: endDate.toISOString() };
  };

  // Generate daftar opsi dropdown (12 bulan ke belakang, 2 bulan ke depan)
  const getDropdownOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = -2; i <= 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth();
      const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      options.push({ value: `${y}-${String(m + 1).padStart(2, '0')}`, label: `${monthNames[m]} ${y}` });
    }
    return options;
  };

  return (
    <PeriodContext.Provider value={{ activePeriod, setActivePeriod, getPeriodRange, getDropdownOptions }}>
      {children}
    </PeriodContext.Provider>
  );
}