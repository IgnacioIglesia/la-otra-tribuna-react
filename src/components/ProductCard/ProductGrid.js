// src/components/ProductGrid/ProductGrid.jsx
import React from "react";
import ProductCard from "../ProductCard/ProductCard";
import "./ProductGrid.css";                // ✅ CSS correcto de la grilla

export default function ProductGrid({ products = [] }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <p>No se encontraron productos</p>
      </div>
    );
  }

  return (
    <section className="products-grid">   {/* ✅ nombre de clase consistente */}
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </section>
  );
}
