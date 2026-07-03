import React, { useState } from 'react';
import { useApp } from '../AppContext';
import './LoginModal.scss';

export const LoginModal: React.FC = () => {
  const { login } = useApp();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpCode, setOtpCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [error, setError] = useState('');
  const [mockSms, setMockSms] = useState<string | null>(null);

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic Israeli phone number validation or simple digit length check
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned.length < 9 || cleaned.length > 15) {
      setError('אנא הזן מספר טלפון תקין (9-15 ספרות)');
      return;
    }

    // Generate a random 4 digit code
    const mockOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setSentCode(mockOtp);
    setStep('otp');

    // Trigger mock SMS toast/notification
    setMockSms(`[הודעת SMS מדומה] קוד האימות שלך הוא: ${mockOtp}`);
    // Clear mock SMS after 15 seconds
    setTimeout(() => {
      setMockSms((prev) => (prev?.includes(mockOtp) ? null : prev));
    }, 15000);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otpCode === sentCode || otpCode === '1234') { // '1234' is a master developer bypass code
      login(phoneNumber);
      setMockSms(null);
    } else {
      setError('קוד אימות שגוי. אנא נסה שוב.');
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtpCode('');
    setError('');
  };

  return (
    <div className="login-overlay">
      {mockSms && (
        <div className="mock-sms-toast">
          <div className="toast-header">
            <span className="toast-icon">💬</span>
            <strong>הודעה חדשה (SMS)</strong>
          </div>
          <p className="toast-body">{mockSms}</p>
        </div>
      )}

      <div className="login-card">
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
              />
            </div>
            <button type="submit" className="login-btn">שליחת קוד אימות ב-SMS</button>
          </form>
        ) : (
          <form onSubmit={handleVerifyCode}>
            <div className="otp-info">
              קוד אימות נשלח למספר: <strong>{phoneNumber}</strong>
            </div>
            
            <div className="input-group">
              <label htmlFor="otpCode">קוד אימות בן 4 ספרות</label>
              <input
                id="otpCode"
                type="text"
                maxLength={4}
                placeholder="הזן 4 ספרות"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="login-actions">
              <button type="button" className="back-btn" onClick={handleBack}>
                חזור
              </button>
              <button type="submit" className="login-btn">התחברות</button>
            </div>
          </form>
        )}

        <div className="login-footer">
          על ידי התחברות אתה מסכים לתנאי השימוש ומדיניות הפרטיות שלנו.
        </div>
      </div>
    </div>
  );
};
