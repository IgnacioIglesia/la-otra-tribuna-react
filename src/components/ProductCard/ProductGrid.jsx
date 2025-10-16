import React from "react";
import ProductCard from "./ProductCard";
import "./ProductGrid.css";

/** products: array de objetos que ya usás en tu lista */
export default function ProductGrid({ products = [] }) {
  return (
    <section className="catalog">
      {/* Si tenés filtros/orden, van encima */}
      <div className="catalog-grid">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
