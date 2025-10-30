import React, { createContext, useContext, useMemo, useState } from "react";

const FiltersContext = createContext(undefined);

export function FiltersProvider({ children }) {
  // OJO al orden de useState: [estado, setter]
  const [homeFilters, setHomeFilters] = useState(null);
  const [offersFilters, setOffersFilters] = useState(null);

  const value = useMemo(
    () => ({
      homeFilters,
      setHomeFilters,
      offersFilters,
      setOffersFilters,
    }),
    [homeFilters, offersFilters]
  );

  return (
    <FiltersContext.Provider value={value}>
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(FiltersContext);
  if (!ctx) {
    throw new Error("useFilters debe usarse dentro de <FiltersProvider />");
  }
  return ctx;
}