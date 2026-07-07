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
import './App.scss';

const AppContent: React.FC = () => {
  const { user, profile, cart, logout, orders, addToCart, categories, products, loadingCatalog } = useApp();
  
  const categoriesToUse = categories;
  const productsToUse = products;

  // State variables for active tabs and modals
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isCardsModalOpen, setIsCardsModalOpen] = useState(false);
  const [isOrdersModalOpen, setIsOrdersModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Automatically update selectedCategoryId when categories load
  useEffect(() => {
    if (categories.length > 0) {
      const exists = categories.some((c) => c.categoryId === selectedCategoryId);
      if (!exists) {
        const firstMain = categories.find((c) => !c.parentID);
        if (firstMain) {
          setSelectedCategoryId(firstMain.categoryId);
        }
      }
    }
  }, [categories, selectedCategoryId]);

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



  // If loading the catalog and we don't have categories yet, show loading spinner
  if (loadingCatalog && categoriesToUse.length === 0) {
    return (
      <div className="orders-portal-loading" dir="rtl">
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>טוען את מגוון המוצרים...</p>
        </div>
      </div>
    );
  }

  // Calculate cart summary
  const cartItemsCount = cart.reduce((sum, item) => sum + (item.product.weightable ? (item.quantity || 1) : item.quantity), 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const factor = item.product.weightable ? item.weight : item.quantity;
    return sum + item.product.price * factor;
  }, 0);

  // Find active category hierarchy
  const activeCategory = categoriesToUse.find((c) => c.categoryId === selectedCategoryId);
  const subCategories = categoriesToUse.filter((c) => c.parentID === selectedCategoryId);
  
  // Combine active category and its subcategories for rendering
  const categoriesToRender = [
    ...(activeCategory ? [activeCategory] : []),
    ...subCategories
  ];

  // Helper check to verify if a profile address is complete
  const isAddressSet =
    profile &&
    profile.fullName.trim() !== '' &&
    profile.addresses &&
    profile.addresses.length > 0 &&
    profile.addresses.some(
      (addr) =>
        addr.city.trim() !== '' &&
        addr.street.trim() !== '' &&
        addr.streetNumber.trim() !== ''
    );

  return (
    <div className="orders-portal" dir="rtl">
      {/* Top Navigation Bar */}
      <header className="portal-header">
        <div 
          className="header-right"
          onClick={() => {
            setSelectedCategoryId('dairy');
            setIsCartOpen(false);
            setIsUserDropdownOpen(false);
          }}
        >
          <span className="portal-logo">🛒</span>
          <div className="portal-title-block">
            <h1>סופר-פרש</h1>
            <p>פורטל הזמנות אונליין</p>
          </div>
        </div>

        <div className="header-left">

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
            {user ? (
              <>
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
              </>
            ) : (
              <div 
                className="user-profile-badge guest-mode" 
                onClick={() => setIsLoginModalOpen(true)}
                style={{ cursor: 'pointer' }}
              >
                <div className="badge-avatar">👤</div>
                <div className="badge-text">
                  <span className="badge-status">אורח</span>
                  <span className="badge-name">לחץ להתחברות</span>
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
          categories={categoriesToUse}
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
              const products = productsToUse.filter((p) => p.categoryId === category.categoryId);
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
        onOpenLoginModal={() => {
          setIsCartOpen(false);
          setIsLoginModalOpen(true);
        }}
      />

      {/* User Profile Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />

      {/* Credit Card Payment Modal */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onOpenUserModal={() => {
          setIsPaymentModalOpen(false);
          setIsUserModalOpen(true);
        }}
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
