import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { auth, useEmulator } from '../firebase';
import './LoginModal.scss';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login } = useApp();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState('');
  const [mockSms, setMockSms] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when modal is opened
  useEffect(() => {
    if (isOpen) {
      setPhoneNumber('');
      setStep('phone');
      setOtpCode('');
      setConfirmationResult(null);
      setError('');
      setMockSms(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Clean up recaptcha verifier on close or unmount
  useEffect(() => {
    const cleanup = () => {
      if ((window as any).recaptchaVerifier) {
        try {
          (window as any).recaptchaVerifier.clear();
        } catch (e) {
          // ignore
        }
        (window as any).recaptchaVerifier = null;
      }
    };

    if (!isOpen) {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 9 || cleaned.length > 15) {
      setError('אנא הזן מספר טלפון תקין (9-15 ספרות)');
      setLoading(false);
      return;
    }

    // Format phone to E.164 (e.g. +972...)
    let formattedPhone = phoneNumber.trim();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '+972' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    try {
      let verifier = (window as any).recaptchaVerifier;
      if (!verifier) {
        verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
        (window as any).recaptchaVerifier = verifier;
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, verifier);
      setConfirmationResult(confirmation);
      setStep('otp');

      // If emulator, try to fetch the code and show the toast
      if (useEmulator) {
        setTimeout(async () => {
          try {
            const res = await fetch(`http://localhost:9099/emulator/v1/projects/online-shop-bf396/verificationCodes`);
            const data = await res.json();
            const codes = data.verificationCodes || [];
            const matched = codes.filter((c: any) => c.phoneNumber === formattedPhone).pop();
            if (matched) {
              setMockSms(`[הודעת SMS מדומה מהאמולטור] קוד האימות שלך הוא: ${matched.code}`);
            } else {
              setMockSms(`[אמולטור] בדוק את ממשק האמולטור בכתובת http://localhost:4000/auth כדי למצוא את קוד ה-SMS`);
            }
          } catch (err) {
            console.error("Failed to fetch verification code from emulator", err);
          }
        }, 1500);
      }
    } catch (err: any) {
      console.error("Error signing in with phone number", err);
      setError(err.message || 'שגיאה בשליחת קוד האימות. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!confirmationResult) {
      setError('חלה שגיאה בתהליך האימות. אנא חזור ושלח את הקוד שנית.');
      setLoading(false);
      return;
    }

    try {
      const result = await confirmationResult.confirm(otpCode);
      const userDoc = result.user;
      if (userDoc && userDoc.phoneNumber) {
        login(userDoc.phoneNumber);
        setMockSms(null);
        onClose();
      } else {
        throw new Error('שגיאה בקבלת פרטי המשתמש.');
      }
    } catch (err: any) {
      console.error("Error verifying code", err);
      setError(err.message || 'קוד אימות שגוי. אנא נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtpCode('');
    setError('');
    setConfirmationResult(null);
    setMockSms(null);
  };

  return (
    <div className="login-overlay" onClick={onClose}>
      {mockSms && (
        <div className="mock-sms-toast" onClick={(e) => e.stopPropagation()}>
          <div className="toast-header">
            <span className="toast-icon">💬</span>
            <strong>הודעה חדשה (SMS)</strong>
          </div>
          <p className="toast-body">{mockSms}</p>
        </div>
      )}

      <div className="login-card" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="close-x"
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '16px',
            left: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#aaa',
            lineHeight: '1'
          }}
        >
          ×
        </button>
        <div className="login-logo">🛒</div>
        <h2>שלום! ברוכים הבאים</h2>
        <p className="login-subtitle">התחברו כדי להתחיל להזמין משלוחים טריים ישירות לביתכם</p>

        {error && <div className="login-error">{error}</div>}

        {step === 'phone' ? (
          <form onSubmit={handleSendCode}>
            <div className="input-group">
              <label htmlFor="phoneNumber">מספר טלפון נייד</label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="לדוגמה: 0501234567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoFocus
                required
                disabled={loading}
              />
            </div>
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'אנא המתן...' : 'שליחת קוד אימות ב-SMS'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div className="otp-info">
              קוד אימות נשלח למספר: <strong>{phoneNumber}</strong>
            </div>

            <div className="input-group">
              <label htmlFor="otpCode">קוד אימות בן 6 ספרות</label>
              <input
                id="otpCode"
                type="text"
                maxLength={6}
                placeholder="הזן 6 ספרות"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                autoFocus
                required
                disabled={loading}
              />
            </div>

            <div className="login-actions">
              <button type="button" className="back-btn" onClick={handleBack} disabled={loading}>
                חזור
              </button>
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? 'מתחבר...' : 'התחברות'}
              </button>
            </div>
          </form>
        )}

        <div className="login-footer">
          על ידי התחברות אתה מסכים לתנאי השימוש ומדיניות הפרטיות שלנו.
        </div>
        <div id="recaptcha-container"></div>

        {window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? (
          <div className="emulator-toggle-container" style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', fontSize: '13px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#666', userSelect: 'none' }}>
              <input
                type="checkbox"
                checked={useEmulator}
                onChange={(e) => {
                  localStorage.setItem('orders_use_emulator', e.target.checked ? "true" : "false");
                  window.location.reload();
                }}
                style={{ cursor: 'pointer' }}
              />
              <span>חיבור לסביבת פיתוח מקומית (Emulator)</span>
            </label>
          </div>
        ) : null}
      </div>
    </div>
  );
};
