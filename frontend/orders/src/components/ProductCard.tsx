import React from 'react';
import type { Product, CartItem } from '../types';
import './ProductCard.scss';

interface ProductCardProps {
  product: Product;
  cartItem: CartItem | undefined;
  onUpdateCart: (product: Product, amount: number) => void;
}

// Map descriptions to appropriate emojis for visuals
const getProductEmoji = (desc: string): string => {
  const d = desc.toLowerCase();
  if (d.includes('בננה')) return '🍌';
  if (d.includes('חלב')) return '🥛';
  if (d.includes('לחם')) return '🍞';
  if (d.includes('ביצים')) return '🥚';
  if (d.includes('חמאה')) return '🧈';
  if (d.includes('גבינ')) return '🧀';
  if (d.includes('יוגורט')) return '🥤';
  if (d.includes('משקה')) return '🥤';
  if (d.includes('קרואסון')) return '🥐';
  if (d.includes('מאפה')) return '🧁';
  if (d.includes('עגבני')) return '🍅';
  if (d.includes('תפוח')) return '🍎';
  if (d.includes('מלפפון')) return '🥒';
  if (d.includes('עוף')) return '🍗';
  if (d.includes('סטייק')) return '🥩';
  if (d.includes('סלמון')) return '🐟';
  if (d.includes('בגט')) return '🥖';
  return '📦';
};

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  cartItem,
  onUpdateCart,
}) => {
  const handleAddToCart = () => {
    if (product.weightable) {
      onUpdateCart(product, 1.0); // Default to 1.0 kg
    } else {
      onUpdateCart(product, 1); // Default to 1 unit
    }
  };

  const handleIncrement = () => {
    if (product.weightable) {
      const currentWeight = cartItem ? cartItem.weight : 0;
      onUpdateCart(product, Number((currentWeight + 0.5).toFixed(2)));
    } else {
      const currentQty = cartItem ? cartItem.quantity : 0;
      onUpdateCart(product, currentQty + 1);
    }
  };

  const handleDecrement = () => {
    if (product.weightable) {
      const currentWeight = cartItem ? cartItem.weight : 0;
      if (currentWeight > 0.5) {
        onUpdateCart(product, Number((currentWeight - 0.5).toFixed(2)));
      } else {
        onUpdateCart(product, 0); // Remove from cart
      }
    } else {
      const currentQty = cartItem ? cartItem.quantity : 0;
      if (currentQty > 1) {
        onUpdateCart(product, currentQty - 1);
      } else {
        onUpdateCart(product, 0); // Remove from cart
      }
    }
  };

  const isInCartActive = !!cartItem;

  return (
    <div className={`product-card ${isInCartActive ? 'in-cart' : ''}`}>
      {/* Product Image/Emoji Zone */}
      <div className="product-image-container">
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.productDesc} 
            className="product-image" 
            loading="lazy" 
          />
        ) : (
          <span className="product-emoji">{getProductEmoji(product.productDesc)}</span>
        )}
      </div>

      {/* Product Details */}
      <div className="product-info">
        <h4 className="product-name">{product.productDesc}</h4>
        
        <div className="product-price">
          <span className="price-num">₪{product.price.toFixed(2)}</span>
          <span className="price-unit">
            {product.weightable ? ' / ק״ג' : ' / יח׳'}
          </span>
        </div>
      </div>

      {/* Interactive Controls (Visible on hover or when in cart) */}
      <div className="product-controls">
        {isInCartActive && cartItem ? (
          // In Cart: display counter stepper
          <div className="stepper-controls">
            <button type="button" className="stepper-btn" onClick={handleDecrement}>
              -
            </button>
            <span className="stepper-value">
              {product.weightable ? `${cartItem.weight} ק״ג` : `${cartItem.quantity} יח׳`}
            </span>
            <button type="button" className="stepper-btn" onClick={handleIncrement}>
              +
            </button>
          </div>
        ) : (
          // Not in Cart: display big green add button
          <button type="button" className="add-to-cart-btn" onClick={handleAddToCart}>
            <span className="plus-sign">+</span>
            <span>הוספה לסל</span>
          </button>
        )}
      </div>
    </div>
  );
};
