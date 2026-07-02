import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import type { UserProfile } from '../types';
import './UserModal.scss';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile, user } = useApp();
  const [formData, setFormData] = useState<UserProfile>({
    fullName: '',
    city: '',
    street: '',
    streetNumber: '',
    apartment: '',
    residencyType: 'בניין דירות',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync state with global context on open or change
  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate required fields
    if (!formData.fullName.trim()) {
      setError('אנא הזן שם מלא');
      return;
    }
    if (!formData.city.trim()) {
      setError('אנא הזן עיר');
      return;
    }
    if (!formData.street.trim()) {
      setError('אנא הזן רחוב');
      return;
    }
    if (!formData.streetNumber.trim()) {
      setError('אנא הזן מספר בית');
      return;
    }

    updateProfile(formData);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1000);
  };
  return (
    <div className="modal-overlay">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>עדכון פרטי משתמש וכתובת משלוח</h3>
          <button type="button" className="close-x" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">הפרטים עודכנו בהצלחה!</div>}

          <div className="form-info-row">
            <span>טלפון מחובר: <strong>{user?.phone}</strong></span>
          </div>

          {/* Full Name */}
          <div className="form-group">
            <label htmlFor="fullName">שם מלא</label>
            <input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="שם פרטי ומשפחה"
              required
            />
          </div>

          {/* Residency Type Image Buttons (At top of address fields) */}
          <div className="form-group residency-type-group">
            <label>סוג המגורים</label>
            <div className="residency-options">
              <button
                type="button"
                className={`residency-option-btn ${formData.residencyType === 'בניין דירות' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, residencyType: 'בניין דירות' })}
              >
                <span className="residency-icon">🏢</span>
                <span className="residency-label">דירה בבניין</span>
              </button>

              <button
                type="button"
                className={`residency-option-btn ${formData.residencyType === 'בית פרטי' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, residencyType: 'בית פרטי' })}
              >
                <span className="residency-icon">🏠</span>
                <span className="residency-label">בית פרטי</span>
              </button>

              <button
                type="button"
                className={`residency-option-btn ${formData.residencyType === 'משרד' ? 'active' : ''}`}
                onClick={() => setFormData({ ...formData, residencyType: 'משרד' })}
              >
                <span className="residency-icon">💼</span>
                <span className="residency-label">משרד / עסק</span>
              </button>
            </div>
          </div>

          {/* City & Street */}
          <div className="form-row">
            <div className="form-group flex-2">
              <label htmlFor="city">עיר</label>
              <input
                id="city"
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="לדוגמה: תל אביב"
                required
              />
            </div>
            <div className="form-group flex-3">
              <label htmlFor="street">רחוב</label>
              <input
                id="street"
                type="text"
                value={formData.street}
                onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                placeholder="לדוגמה: אבן גבירול"
                required
              />
            </div>
          </div>

          {/* House Number & Apartment */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="streetNumber">מספר בית</label>
              <input
                id="streetNumber"
                type="text"
                value={formData.streetNumber}
                onChange={(e) => setFormData({ ...formData, streetNumber: e.target.value })}
                placeholder="למשל: 14"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="apartment">דירה / כניסה</label>
              <input
                id="apartment"
                type="text"
                value={formData.apartment}
                onChange={(e) => setFormData({ ...formData, apartment: e.target.value })}
                placeholder="דירה / כניסה (אופציונלי)"
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              ביטול
            </button>
            <button type="submit" className="submit-btn">
              שמור שינויים
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
