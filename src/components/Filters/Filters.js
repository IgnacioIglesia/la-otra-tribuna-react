import React, { useState, useEffect } from 'react';

function Filters({ products, onFilter }) {
  const [filters, setFilters] = useState({
    category: '',
    club: '',
    country: '',
    maxPrice: 4000
  });

  useEffect(() => {
    const filtered = products.filter(product => {
      return (
        (!filters.category || product.categoria === filters.category) &&
        (!filters.club || product.club === filters.club) &&
        product.precio <= filters.maxPrice
      );
    });
    onFilter(filtered);
  }, [filters, products, onFilter]);

  const categories = [...new Set(products.map(p => p.categoria).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const clubs = [...new Set(products.map(p => p.club).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  const formatPrice = (price) => {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU',
      maximumFractionDigits: 0
    }).format(price);
  };

  return (
    <div className="filters">
      <div className="filter-group">
        <label>Categoría</label>
        <select 
          value={filters.category} 
          onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
        >
          <option value="">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Club</label>
        <select 
          value={filters.club} 
          onChange={(e) => setFilters(prev => ({ ...prev, club: e.target.value }))}
        >
          <option value="">Todos los clubes</option>
          {clubs.map(club => (
            <option key={club} value={club}>{club}</option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>País</label>
        <select>
          <option value="">Todos los países</option>
        </select>
      </div>

      <div className="filter-group filter-price">
        <label>Precio máx.: {formatPrice(filters.maxPrice)}</label>
        <input 
          type="range" 
          min="1500" 
          max="4000" 
          step="1" 
          value={filters.maxPrice}
          onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
          className="range"
        />
      </div>
    </div>
  );
}

export default Filters;
