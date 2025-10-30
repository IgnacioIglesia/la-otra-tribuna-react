// CurrencySelector.jsx
import React, { useState, useEffect } from 'react';
import './CurrencySelector.css';

export function CurrencySelector({ selectedCurrency, onCurrencyChange, cartItems }) {
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para obtener el tipo de cambio
  const fetchExchangeRate = async () => {
    try {
      setLoading(true);
      // Puedes usar una API gratuita como exchangerate-api.com
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      
      // Tipo de cambio USD a UYU con comisión del 3%
      const baseRate = data.rates.UYU;
      const rateWithCommission = baseRate * 1.03; // 3% de comisión
      
      setExchangeRate({
        USD_to_UYU: rateWithCommission,
        UYU_to_USD: 1 / rateWithCommission
      });
      setLoading(false);
    } catch (error) {
      console.error('Error al obtener tipo de cambio:', error);
      // Tipo de cambio fallback (actualiza según necesites)
      setExchangeRate({
        USD_to_UYU: 41.5, // Ejemplo con comisión
        UYU_to_USD: 1 / 41.5
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
    // Actualizar cada 5 minutos
    const interval = setInterval(fetchExchangeRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Calcular si hay productos en ambas monedas
  const hasUSD = cartItems.some(item => item.moneda === 'USD');
  const hasUYU = cartItems.some(item => item.moneda === 'UYU');
  const hasMixedCurrencies = hasUSD && hasUYU;

  if (!hasMixedCurrencies) return null;

  return (
    <div className="currency-selector">
      <div className="currency-selector-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v12M15 9H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H9"/>
        </svg>
        <div>
          <h3>Moneda de pago</h3>
          <p className="currency-info">
            {loading ? (
              'Cargando tipo de cambio...'
            ) : (
              <>
                Tipo de cambio: 1 USD = ${exchangeRate?.USD_to_UYU.toFixed(2)} UYU
                <span className="commission-note">(incluye 3% de comisión)</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="currency-options">
        <button
          className={`currency-option ${selectedCurrency === 'USD' ? 'active' : ''}`}
          onClick={() => onCurrencyChange('USD', exchangeRate)}
          disabled={loading}
        >
          <div className="currency-icon">U$D</div>
          <div className="currency-label">
            <span>Dólares</span>
            <small>Pagar en USD</small>
          </div>
          {selectedCurrency === 'USD' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>

        <button
          className={`currency-option ${selectedCurrency === 'UYU' ? 'active' : ''}`}
          onClick={() => onCurrencyChange('UYU', exchangeRate)}
          disabled={loading}
        >
          <div className="currency-icon">$</div>
          <div className="currency-label">
            <span>Pesos uruguayos</span>
            <small>Pagar en UYU</small>
          </div>
          {selectedCurrency === 'UYU' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>
      </div>

      <div className="conversion-notice">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>Los precios se convertirán automáticamente a {selectedCurrency} al momento del pago</span>
      </div>
    </div>
  );
}