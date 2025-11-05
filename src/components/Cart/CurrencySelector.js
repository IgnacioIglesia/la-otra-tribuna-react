// src/components/Cart/CurrencySelector.js
import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import "./CurrencySelector.css";

export function CurrencySelector({ paymentCurrency, onCurrencyChange, cartItems }) {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRates() {
      try {
        const { data, error } = await supabase
          .from("configuracion")
          .select("tasa_dolar, tasa_cambio, usd_to_uyu")
          .single();

        if (error) throw error;

        const usdToUyu = data?.tasa_dolar || data?.tasa_cambio || data?.usd_to_uyu || 40;
        
        const exchangeRates = {
          USD_to_UYU: usdToUyu,
          UYU_to_USD: 1 / usdToUyu,
        };

        setRates(exchangeRates);

        if (!paymentCurrency) {
          autoSelectCurrency(exchangeRates);
        }
      } catch (err) {
        console.error("Error al obtener tasas:", err);
        
        const fallbackRates = {
          USD_to_UYU: 40,
          UYU_to_USD: 0.025,
        };
        
        setRates(fallbackRates);
        
        if (!paymentCurrency) {
          autoSelectCurrency(fallbackRates);
        }
      } finally {
        setLoading(false);
      }
    }

    fetchRates();
  }, []);

  const autoSelectCurrency = (exchangeRates) => {
    if (cartItems.length === 0) {
      onCurrencyChange("USD", exchangeRates);
      return;
    }

    const hasUSD = cartItems.some(item => item.moneda === "USD");
    const hasUYU = cartItems.some(item => item.moneda === "UYU");

    if (hasUSD && !hasUYU) {
      onCurrencyChange("USD", exchangeRates);
    } else if (hasUYU && !hasUSD) {
      onCurrencyChange("UYU", exchangeRates);
    } else {
      // Si hay productos mixtos, sugerir la moneda predominante
      const usdCount = cartItems.filter(item => item.moneda === "USD").reduce((sum, item) => sum + item.qty, 0);
      const uyuCount = cartItems.filter(item => item.moneda === "UYU").reduce((sum, item) => sum + item.qty, 0);
      onCurrencyChange(usdCount >= uyuCount ? "USD" : "UYU", exchangeRates);
    }
  };

  const handleCurrencyChange = (currency) => {
    if (rates) {
      onCurrencyChange(currency, rates);
    }
  };

  // Calcular productos que necesitan conversión
  const getConversionStats = () => {
    if (!paymentCurrency || cartItems.length === 0) {
      return { needsConversion: false, itemsToConvert: 0, totalItems: 0 };
    }
    
    const itemsToConvert = cartItems.filter(item => item.moneda !== paymentCurrency);
    const totalQty = itemsToConvert.reduce((sum, item) => sum + item.qty, 0);
    
    return {
      needsConversion: itemsToConvert.length > 0,
      itemsToConvert: itemsToConvert.length,
      totalQty: totalQty,
      totalItems: cartItems.length
    };
  };

  // Calcular qué opción es más conveniente
  const getBestOption = () => {
    if (cartItems.length === 0) return null;
    
    const usdItems = cartItems.filter(item => item.moneda === "USD");
    const uyuItems = cartItems.filter(item => item.moneda === "UYU");
    
    const usdQty = usdItems.reduce((sum, item) => sum + item.qty, 0);
    const uyuQty = uyuItems.reduce((sum, item) => sum + item.qty, 0);
    
    if (usdQty === 0) return "UYU";
    if (uyuQty === 0) return "USD";
    
    // Retornar la moneda con más productos
    return usdQty > uyuQty ? "USD" : "UYU";
  };

  const currencyCount = cartItems.reduce((acc, item) => {
    acc[item.moneda] = (acc[item.moneda] || 0) + item.qty;
    return acc;
  }, {});

  const usdCount = currencyCount.USD || 0;
  const uyuCount = currencyCount.UYU || 0;
  const conversionStats = getConversionStats();
  const bestOption = getBestOption();

  if (loading) {
    return (
      <div className="currency-selector">
        <div className="currency-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (!rates) return null;

  return (
    <div className="currency-selector">
      <div className="currency-header">
        <h3 className="currency-title">Moneda de pago</h3>
        <p className="currency-subtitle">Elegí cómo querés pagar tu pedido</p>
      </div>

      <div className="currency-buttons">
        <button
          className={`currency-btn ${paymentCurrency === "USD" ? "active" : ""}`}
          onClick={() => handleCurrencyChange("USD")}
          type="button"
        >
          <div className="currency-btn-content">
            <div className="currency-flag-wrapper">
              <span className="currency-flag">🇺🇸</span>
            </div>
            <div className="currency-text">
              <span className="currency-name">Dólares</span>
              <span className="currency-code">USD</span>
            </div>
            {paymentCurrency === "USD" && (
              <div className="currency-check-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            {bestOption === "USD" && paymentCurrency !== "USD" && (
              <div className="currency-badge">
                <span>💰</span>
              </div>
            )}
          </div>
        </button>

        <button
          className={`currency-btn ${paymentCurrency === "UYU" ? "active" : ""}`}
          onClick={() => handleCurrencyChange("UYU")}
          type="button"
        >
          <div className="currency-btn-content">
            <div className="currency-flag-wrapper">
              <span className="currency-flag">🇺🇾</span>
            </div>
            <div className="currency-text">
              <span className="currency-name">Pesos</span>
              <span className="currency-code">UYU</span>
            </div>
            {paymentCurrency === "UYU" && (
              <div className="currency-check-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2"/>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            )}
            {bestOption === "UYU" && paymentCurrency !== "UYU" && (
              <div className="currency-badge">
                <span>💰</span>
              </div>
            )}
          </div>
        </button>
      </div>

      {(usdCount > 0 && uyuCount > 0) && (
        <div className="currency-warning-mixed">
          <div className="currency-warning-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className="currency-warning-content">
            <p className="currency-warning-title">Productos en diferentes monedas</p>
            <p className="currency-warning-text">
              Al mezclar productos en <strong>USD</strong> y <strong>UYU</strong> en la misma compra, 
              se aplicará un cargo del <strong>3%</strong> sobre los productos que requieran conversión.
            </p>
            <p className="currency-warning-tip">
              💡 <strong>Tip:</strong> Es más económico hacer compras separadas por moneda
            </p>
          </div>
        </div>
      )}

      {conversionStats.needsConversion && !(usdCount > 0 && uyuCount > 0) && (
        <div className="currency-alert">
          <div className="currency-alert-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4M12 16h.01"/>
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </div>
          <div className="currency-alert-content">
            <p className="currency-alert-title">Cargo por conversión de moneda</p>
            <p className="currency-alert-text">
              Se aplicará <strong>3%</strong> adicional sobre {conversionStats.itemsToConvert === 1 ? 'el producto' : `los ${conversionStats.totalQty} productos`} que {conversionStats.itemsToConvert === 1 ? 'necesita' : 'necesitan'} conversión
              <span className="currency-alert-rate">• Tasa: ${rates.USD_to_UYU.toFixed(2)}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}