import { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { UploadModal } from './components/UploadModal';
import { OrdersGrid } from './components/OrdersGrid';
import { t } from './strings';
import './App.scss';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'upload'>('orders');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      setAuthError(t('authError'));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" dir="rtl">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="login-container" dir="rtl">
        <div className="login-card">
          <header className="login-header">
            <h1 className="app-title">{t('appTitle')}</h1>
            <p className="app-subtitle">{t('loginSubtitle')}</p>
          </header>

          {authError && <div className="error-alert">{authError}</div>}

          <button
            type="button"
            className="btn btn-google"
            onClick={handleLogin}
          >
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{t('loginButton')}</span>
          </button>

          <footer className="login-footer">
            <p>{t('footerText')}</p>
          </footer>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard" dir="rtl">
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
          <span className="brand-logo">🛡️</span>
          <h2>{t('appTitle')}</h2>
        </div>

        <div className="navbar-tabs">
          <button
            type="button"
            className={`navbar-tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            📋 {t('tabOrders')}
          </button>
          <button
            type="button"
            className={`navbar-tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            📦 {t('tabUpload')}
          </button>
        </div>

        <div className="navbar-user-section">
          {user.photoURL && (
            <img
              className="user-avatar"
              src={user.photoURL}
              alt={user.displayName || "User"}
            />
          )}
          <span className="user-name">
            {t('welcome', { name: user.displayName || user.email || '' })}
          </span>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleLogout}
          >
            {t('logoutButton')}
          </button>
        </div>
      </nav>

      <main className={`dashboard-content ${activeTab === 'orders' ? 'tab-orders-layout' : ''}`}>
        {activeTab === 'orders' ? (
          <OrdersGrid />
        ) : (
          <div className="dashboard-card">
            <div className="card-illustration">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="hero-svg">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
                <line x1="15" y1="3" x2="15" y2="21" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="3" y1="15" x2="21" y2="15" />
              </svg>
            </div>
            <h3>{t('uploadButtonText')}</h3>
            <p className="card-description">
              ניתן להעלות קובצי נתונים בפורמט CSV או JSON לעדכון מלאי המוצרים, לקוחות, או הגדרות מערכת ב-Firebase Storage.
            </p>
            <button
              type="button"
              className="btn btn-large"
              onClick={() => setIsModalOpen(true)}
            >
              {t('uploadButtonText')}
            </button>
          </div>
        )}
      </main>

      <UploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default App;
