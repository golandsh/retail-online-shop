import React, { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { isEmailWhitelisted } from './utils/authWhitelist';
import {
  verifyAdminInFirestore,
  getAdminByEmail,
  type AdminRecord,
} from './utils/adminsService';
import { UploadModal } from './components/UploadModal';
import { OrdersGrid } from './components/OrdersGrid';
import { t } from './strings';
import './App.scss';

function App() {
  const [adminProfile, setAdminProfile] = useState<AdminRecord | null>(() => {
    try {
      const saved = localStorage.getItem('activeAdminProfile');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'upload'>('orders');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        if (!isEmailWhitelisted(currentUser.email)) {
          console.warn(`Unauthorized login attempt by ${currentUser.email}`);
          setAuthError(t('unauthorizedEmail', { email: currentUser.email }));
          await signOut(auth);
          setAdminProfile(null);
          localStorage.removeItem('activeAdminProfile');
          setLoading(false);
          return;
        }

        const adminDoc = await getAdminByEmail(db, currentUser.email);
        if (adminDoc) {
          setAdminProfile(adminDoc);
          localStorage.setItem('activeAdminProfile', JSON.stringify(adminDoc));
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setLoginLoading(true);

    const trimmedEmail = emailInput.trim().toLowerCase();

    try {
      // 1. Verify email and password against Firestore `admins` collection
      const verification = await verifyAdminInFirestore(db, trimmedEmail, passwordInput);
      if (!verification.success || !verification.admin) {
        console.warn(`Firestore admins check failed for ${trimmedEmail}`);
        setAuthError(t('invalidCredentials'));
        setLoginLoading(false);
        return;
      }

      setAdminProfile(verification.admin);
      localStorage.setItem('activeAdminProfile', JSON.stringify(verification.admin));

      // 2. Connect Firebase Auth session for request.auth rules
      try {
        await signInWithEmailAndPassword(auth, trimmedEmail, passwordInput);
      } catch (authErr: any) {
        try {
          await createUserWithEmailAndPassword(auth, trimmedEmail, passwordInput);
        } catch {
          await signInAnonymously(auth);
        }
      }
    } catch (error) {
      console.error("Login process error:", error);
      setAuthError(t('invalidCredentials'));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setAdminProfile(null);
      localStorage.removeItem('activeAdminProfile');
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" dir="rtl">
        <div className="spinner" />
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="login-container" dir="rtl">
        <div className="login-card">
          <header className="login-header">
            <h1 className="app-title">{t('appTitle')}</h1>
            <p className="app-subtitle">{t('loginSubtitle')}</p>
          </header>

          {authError && <div className="error-alert">{authError}</div>}

          <form onSubmit={handleLoginSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="admin-email">{t('emailLabel')}</label>
              <input
                id="admin-email"
                type="email"
                required
                className="form-control"
                placeholder={t('emailPlaceholder')}
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="admin-password">{t('passwordLabel')}</label>
              <input
                id="admin-password"
                type="password"
                required
                className="form-control"
                placeholder={t('passwordPlaceholder')}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-submit"
              disabled={loginLoading}
            >
              {loginLoading ? 'מתחבר...' : t('loginButton')}
            </button>
          </form>

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
          <span className="user-name">
            {t('welcome', { name: adminProfile.name || '' })}
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
