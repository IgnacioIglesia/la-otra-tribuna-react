// CurrencySelector.jsx
import React, { useState, useEffect, useMemo } from 'react';
import './CurrencySelector.css';

export function CurrencySelector({ paymentCurrency, onCurrencyChange, cartItems }) {
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loading, setLoading] = useState(true);

  // ===== Tipo de cambio =====
  const fetchExchangeRate = async () => {
    try {
      setLoading(true);
      const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await res.json();

      const baseRate = data?.rates?.UYU;
      const rateWithCommission = baseRate * 1.03;

      setExchangeRate({
        USD_to_UYU: rateWithCommission,
        UYU_to_USD: 1 / rateWithCommission,
      });
    } catch (err) {
      console.error('Error al obtener tipo de cambio:', err);
      const fallback = 41.5;
      setExchangeRate({
        USD_to_UYU: fallback,
        UYU_to_USD: 1 / fallback,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
    const interval = setInterval(fetchExchangeRate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // ===== Derivados del carrito (memoizados) =====
  const { hasUSD, hasUYU, hasMixedCurrencies } = useMemo(() => {
    const _hasUSD = cartItems?.some((item) => item.moneda === 'USD');
    const _hasUYU = cartItems?.some((item) => item.moneda === 'UYU');
    return {
      hasUSD: !!_hasUSD,
      hasUYU: !!_hasUYU,
      hasMixedCurrencies: !!_hasUSD && !!_hasUYU,
    };
  }, [cartItems]);

  const { showBothOptions, defaultCurrency } = useMemo(() => {
    if (hasMixedCurrencies) {
      return { showBothOptions: true, defaultCurrency: null };
    }
    if (hasUSD) {
      return { showBothOptions: true, defaultCurrency: 'USD' };
    }
    if (hasUYU) {
      // ✅ Cambio: cuando solo hay UYU, no mostrar opciones (auto-seleccionar)
      return { showBothOptions: false, defaultCurrency: 'UYU' };
    }
    return { showBothOptions: false, defaultCurrency: null };
  }, [hasMixedCurrencies, hasUSD, hasUYU]);

  // ===== Setear moneda por defecto (hook SIEMPRE declarado) =====
  useEffect(() => {
    if (!paymentCurrency && defaultCurrency && exchangeRate) {
      onCurrencyChange(defaultCurrency, exchangeRate);
    }
  }, [paymentCurrency, defaultCurrency, exchangeRate, onCurrencyChange]);

  // ===== Early returns DESPUÉS de los hooks =====
  if (!hasUSD && !hasUYU) return null;

  // ✅ Si solo hay UYU, no mostrar nada (ya se auto-seleccionó arriba)
  if (!showBothOptions && defaultCurrency === 'UYU') {
    return null;
  }

  // ===== UI =====
  return (
    <div className="currency-selector">
      <div className="currency-selector-header">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 6v12M15 9H9.5a2.5 2.5 0 0 0 0 5h5a2.5 2.5 0 0 1 0 5H9"/>
        </svg>
        <div>
          <h3>¿Cómo querés pagar?</h3>
          <p className="currency-info">
            {loading ? (
              'Cargando tipo de cambio...'
            ) : (
              <>
                Tipo de cambio: 1 USD = ${exchangeRate?.USD_to_UYU?.toFixed(2)} UYU
                <span className="commission-note"> (incluye 3% de comisión)</span>
              </>
            )}
          </p>
        </div>
      </div>

      <div className="currency-options">
        <button
          className={`currency-option ${paymentCurrency === 'USD' ? 'active' : ''}`}
          onClick={() => onCurrencyChange('USD', exchangeRate)}
          disabled={loading}
        >
          <div className="currency-icon">U$D</div>
          <div className="currency-label">
            <span>Pagar en dólares</span>
            {hasUYU && <small className="conversion-tag">Productos en $ se convertirán a U$D</small>}
          </div>
          {paymentCurrency === 'USD' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>

        <button
          className={`currency-option ${paymentCurrency === 'UYU' ? 'active' : ''}`}
          onClick={() => onCurrencyChange('UYU', exchangeRate)}
          disabled={loading}
        >
          <div className="currency-icon">$</div>
          <div className="currency-label">
            <span>Pagar en pesos uruguayos</span>
            {hasUSD && <small className="conversion-tag">Productos en U$D se convertirán a $ (+3% comisión)</small>}
          </div>
          {paymentCurrency === 'UYU' && (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>
      </div>

      {paymentCurrency && (
        <div className="conversion-notice">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <span>
            {paymentCurrency === 'USD' ? 'Pagarás todo en dólares (U$D)' : 'Pagarás todo en pesos uruguayos ($)'}
          </span>
        </div>
      )}
    </div>
  );
}