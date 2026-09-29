import { createContext, useContext, useState, useEffect } from 'react';

const CityContext = createContext(null);

export function CityProvider({ children }) {
  const [selectedCity, setSelectedCity] = useState(() => {
    // Restore from sessionStorage on initial render
    const saved = sessionStorage.getItem('selectedCity');
    if (saved) {
      try { return JSON.parse(saved); } catch { return null; }
    }
    return null;
  });

  const selectCity = (city) => {
    setSelectedCity(city);
    if (city) {
      sessionStorage.setItem('selectedCity', JSON.stringify(city));
    }
  };

  const clearCity = () => {
    setSelectedCity(null);
    sessionStorage.removeItem('selectedCity');
  };

  return (
    <CityContext.Provider value={{ selectedCity, selectCity, clearCity }}>
      {children}
    </CityContext.Provider>
  );
}

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) throw new Error('useCity must be used within CityProvider');
  return context;
};
