import React, { useState, useEffect } from 'react';
import { useApp } from './AppContext';
import { VerticalTabs } from './components/VerticalTabs';
import { ProductCard } from './components/ProductCard';
import { LoginModal } from './components/LoginModal';
import { UserModal } from './components/UserModal';
import { CartDrawer } from './components/CartDrawer';
import { PaymentModal } from './components/PaymentModal';
import { CardsModal } from './components/CardsModal';
import { OrdersModal } from './components/OrdersModal';
import { mockCategories, mockProducts } from './mockData';
import './App.scss';

const AppContent: React.FC = () => {
  const { user, profile, cart, logout, orders, addToCart } = useApp();
  
  // State variables for active tabs and modals
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('dairy');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isUserDropdownOpen) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.profile-badge-container')) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isUserDropdownOpen]);

  // If user is not logged in, render the login page
  if (!user) {
    return <LoginModal />;
  }

  // Calculate cart summary
  const cartItemsCount = cart.reduce((sum, item) => sum + (item.product.weightable ? (item.quantity || 1) : item.quantity), 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const factor = item.product.weightable ? item.weight : item.quantity;
    return sum + item.product.price * factor;
  }, 0);

  // Find active category hierarchy
  const activeCategory = mockCategories.find((c) => c.categoryId === selectedCategoryId);
  const subCategories = mockCategories.filter((c) => c.parentID === selectedCategoryId);
  
  // Combine active category and its subcategories for rendering
  const categoriesToRender = [
    ...(activeCategory ? [activeCategory] : []),
    ...subCategories
  ];

  // Helper check to verify if a profile address is complete
  const isAddressSet =
    profile &&
    profile.fullName.trim() !== '' &&
    profile.city.trim() !== '' &&
    profile.street.trim() !== '' &&
    profile.streetNumber.trim() !== '';

  return (
    <div className="orders-portal" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="portal-header">
        <div className="header-right">
          <span className="portal-logo">🛒</span>
          <div className="portal-title-block">
            <h1>סופר-פרש</h1>
            <p>פורטל הזמנות אונליין</p>
          </div>
        </div>

        <div className="header-left">
          {/* Home Button to return to main product view */}
          <button
            type="button"
            className="home-btn"
            onClick={() => {
              setSelectedCategoryId('dairy');
              setIsCartOpen(false);
              setIsUserDropdownOpen(false);
            }}
          >
            🏠 דף הבית
          </button>

          {/* Cart Widget */}
          <button
            type="button"
            className={`cart-widget-btn ${cart.length > 0 ? 'pulse' : ''}`}
            onClick={() => setIsCartOpen(true)}
          >
            <span className="cart-icon">🛒</span>
            <div className="cart-widget-info">
              <span className="cart-widget-count">{cartItemsCount} פריטים</span>
              <span className="cart-widget-price">₪{cartSubtotal.toFixed(2)}</span>
            </div>
          </button>

          {/* User Profile Dropdown badge */}
          <div className="profile-badge-container">
            <div 
              className={`user-profile-badge ${isUserDropdownOpen ? 'active' : ''}`} 
              onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
            >
              <div className="badge-avatar">👤</div>
              <div className="badge-text">
                <span className="badge-status">מחובר</span>
                <span className="badge-name">
                  {profile?.fullName || user.phone}
                </span>
              </div>
              {!isAddressSet && <span className="warning-dot" title="חסרים פרטי כתובת משלוח">!</span>}
            </div>

            {isUserDropdownOpen && (
              <div className="user-dropdown-menu">
                <button
                  type="button"
                  className="dropdown-link-btn user-link"
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    setIsUserModalOpen(true);
                  }}
                >
                  <span className="dropdown-link-icon">👤</span>
                  <span>פרטי משתמש וכתובת משלוח</span>
                </button>

                <button
                  type="button"
                  className="dropdown-link-btn payment-link"
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    setIsCardsModalOpen(true);
                  }}
                >
                  <span className="dropdown-link-icon">💳</span>
                  <span>אמצעי תשלום שמורים</span>
                </button>

                <button
                  type="button"
                  className="dropdown-link-btn orders-link"
                  onClick={() => {
                    setIsUserDropdownOpen(false);
                    setIsOrdersModalOpen(true);
                  }}
                >
                  <span className="dropdown-link-icon">📋</span>
                  <span>ההזמנות שלי ({orders.length})</span>
                </button>

                <div className="dropdown-footer-section">
                  <button 
                    type="button" 
                    className="dropdown-logout-btn" 
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      logout();
                    }}
                  >
                    🚪 התנתקות מהמערכת
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main App Workspace */}
      <div className="portal-workspace">
        {/* Sidebar vertical tabs */}
        <VerticalTabs
          categories={mockCategories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />

        {/* Products grid */}
        <main className="portal-main">
          <div className="main-header">
            <h2>{activeCategory?.categoryDesc}</h2>
            <p className="category-sub">מציג מוצרים בקטגוריית {activeCategory?.categoryDesc}</p>
          </div>

          <div className="products-container">
            {categoriesToRender.map((category) => {
              const products = mockProducts.filter((p) => p.categoryId === category.categoryId);
              if (products.length === 0) return null;

              return (
                <div key={category.categoryId} className="category-section">
                  {category.categoryId !== selectedCategoryId && (
                    <h3 className="subcategory-section-title">{category.categoryDesc}</h3>
                  )}
                  
                  <div className="products-grid">
                    {products.map((product) => {
                      const itemInCart = cart.find((c) => c.product.productId === product.productId);
                      return (
                        <ProductCard
                          key={product.productId}
                          product={product}
                          cartItem={itemInCart}
                          onUpdateCart={addToCart}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onOpenUserModal={() => {
          setIsCartOpen(false);
          setIsUserModalOpen(true);
        }}
        onOpenPaymentModal={() => {
          setIsCartOpen(false);
          setIsPaymentModalOpen(true);
        }}
      />

      {/* User Profile Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />

      {/* Credit Card Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      {/* Saved Cards Modal */}
      <CardsModal
        isOpen={isCardsModalOpen}
        onClose={() => setIsCardsModalOpen(false)}
      />

      {/* Orders History Modal */}
      <OrdersModal
        isOpen={isOrdersModalOpen}
        onClose={() => setIsOrdersModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <div className="app-root">
      <AppContent />
    </div>
  );
};
export default App;
