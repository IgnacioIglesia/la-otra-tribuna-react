import React from "react";
import ProductCard from "../ProductCard/ProductCard";
import "./ProductGrid.css";

export default function ProductGrid({ products = [] }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <p>No se encontraron productos</p>
      </div>
    );
  }

  return (
    <section className="products-grid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </section>
  );
}
