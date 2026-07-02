import React from 'react';
import { useApp } from '../AppContext';
import './CartDrawer.scss';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUserModal: () => void;
  onOpenPaymentModal: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onOpenUserModal,
  onOpenPaymentModal,
}) => {
  const { cart, removeFromCart, addToCart, profile } = useApp();

  if (!isOpen) return null;

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const amount = item.product.weightable ? item.weight : item.quantity;
      return sum + item.product.price * amount;
    }, 0);
  };

  const handleCheckoutClick = () => {
    // Check if profile address is complete
    const isAddressComplete =
      profile &&
      profile.fullName.trim() !== '' &&
      profile.city.trim() !== '' &&
      profile.street.trim() !== '' &&
      profile.streetNumber.trim() !== '';

    if (!isAddressComplete) {
      alert('על מנת לבצע הזמנה, אנא מלא את פרטי הכתובת והמשלוח שלך תחילה.');
      onOpenUserModal();
    } else {
      onOpenPaymentModal();
    }
  };

  const subtotal = calculateSubtotal();

  return (
    <div className="cart-drawer-overlay" onClick={onClose}>
      <div className="cart-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>סל הקניות שלי ({cart.length})</h3>
          <button type="button" className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="drawer-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <span className="empty-icon">🛒</span>
              <p>סל הקניות שלך ריק</p>
              <button type="button" className="shop-btn" onClick={onClose}>המשך לקנות</button>
            </div>
          ) : (
            cart.map((item) => {
              const amount = item.product.weightable ? item.weight : item.quantity;
              const itemTotal = item.product.price * amount;

              const handleMiniIncrement = () => {
                if (item.product.weightable) {
                  addToCart(item.product, Number((item.weight + 0.5).toFixed(2)));
                } else {
                  addToCart(item.product, item.quantity + 1);
                }
              };

              const handleMiniDecrement = () => {
                if (item.product.weightable) {
                  if (item.weight > 0.5) {
                    addToCart(item.product, Number((item.weight - 0.5).toFixed(2)));
                  } else {
                    removeFromCart(item.product.productId);
                  }
                } else {
                  if (item.quantity > 1) {
                    addToCart(item.product, item.quantity - 1);
                  } else {
                    removeFromCart(item.product.productId);
                  }
                }
              };

              return (
                <div key={item.product.productId} className="cart-item-row">
                  <div className="item-details">
                    <span className="item-name">{item.product.productDesc}</span>
                    <span className="item-unit-price">
                      ₪{item.product.price.toFixed(2)} {item.product.weightable ? 'לק״ג' : 'ליחידה'}
                    </span>
                  </div>

                  <div className="item-qty-control">
                    <div className="stepper-mini">
                      <button type="button" onClick={handleMiniDecrement}>-</button>
                      <span className="stepper-value">
                        {item.product.weightable
                          ? `${item.weight} ק״ג`
                          : `${item.quantity} יח׳`}
                      </span>
                      <button type="button" onClick={handleMiniIncrement}>+</button>
                    </div>
                  </div>

                  <div className="item-total-price">
                    ₪{itemTotal.toFixed(2)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cart.length > 0 && (
          <div className="drawer-footer">
            <div className="summary-row">
              <span>סיכום ביניים:</span>
              <span className="subtotal-amount">₪{subtotal.toFixed(2)}</span>
            </div>
            
            <p className="weight-disclaimer">
              * מוצרים שקילים עשויים להשתנות מעט במשקלם הסופי, ולכן חיוב סופי יתבצע לאחר השקילה בחנות.
            </p>

            <button type="button" className="checkout-btn" onClick={handleCheckoutClick}>
              המשך לקופה ולתשלום
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
