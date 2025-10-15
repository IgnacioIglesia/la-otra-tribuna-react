import React from 'react';
import ProductCard from '../ProductCard/ProductCard';
import './ProductCard.css';

function ProductGrid({ products }) {
  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <p>No se encontraron productos</p>
      </div>
    );
  }

  return (
    <div className="grid" id="grid">
      {products.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

export default ProductGrid;