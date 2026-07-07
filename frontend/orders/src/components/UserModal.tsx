import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import type { Address } from '../types';

import './UserModal.scss';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile, user } = useApp();
  const [fullName, setFullName] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(-1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state with global context on open or change
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName || '');
      setAddresses(profile.addresses || []);
    }
  }, [profile, isOpen]);

  if (!isOpen) return null;

  const handleAddAddress = () => {
    if (addresses.length >= 1) return; // Prevent multiple addresses

    const newAddr: Address = {
      city: '',
      street: '',
      streetNumber: '',
      apartment: '',
      residencyType: 'בניין דירות',
      postalCode: '',
      notes: ''
    };
    const updated = [...addresses, newAddr];
    setAddresses(updated);
    setExpandedIndex(updated.length - 1); // Expand the new address
  };

  const handleDeleteAddress = (indexToDelete: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = addresses.filter((_, idx) => idx !== indexToDelete);
    setAddresses(updated);
    if (expandedIndex === indexToDelete) {
      setExpandedIndex(null);
    } else if (expandedIndex !== null && expandedIndex > indexToDelete) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const handleAddressChange = (index: number, fields: Partial<Address>) => {
    const updated = addresses.map((addr, idx) => {
      if (idx === index) {
        return { ...addr, ...fields };
      }
      return addr;
    });
    setAddresses(updated);
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate required fields
    if (!fullName.trim()) {
      setError('אנא הזן שם מלא');
      return;
    }

    // Validate all addresses
    for (let i = 0; i < addresses.length; i++) {
      const addr = addresses[i];
      if (!addr.city.trim()) {
        setError(`אנא הזן עיר בכתובת מס׳ ${i + 1}`);
        setExpandedIndex(i);
        return;
      }
      if (!addr.street.trim()) {
        setError(`אנא הזן רחוב בכתובת מס׳ ${i + 1}`);
        setExpandedIndex(i);
        return;
      }
      
      const streetNum = Number(addr.streetNumber);
      if (!addr.streetNumber.trim() || isNaN(streetNum) || streetNum <= 0) {
        setError(`אנא הזן מספר בית תקין (מספר חיובי) בכתובת מס׳ ${i + 1}`);
        setExpandedIndex(i);
        return;
      }

      if (addr.apartment) {
        const aptNum = Number(addr.apartment);
        if (isNaN(aptNum) || aptNum <= 0) {
          setError(`אנא הזן מספר דירה תקין (מספר חיובי) בכתובת מס׳ ${i + 1}`);
          setExpandedIndex(i);
          return;
        }
      }

      const pCode = Number(addr.postalCode);
      if (!addr.postalCode || !String(addr.postalCode).trim() || isNaN(pCode) || pCode <= 0) {
        setError(`אנא הזן מיקוד תקין (מספר חיובי) בכתובת מס׳ ${i + 1}`);
        setExpandedIndex(i);
        return;
      }
    }

    setSaving(true);
    try {
      await updateProfile({
        fullName: fullName.trim(),
        addresses
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'שגיאה בעדכון הפרטים. אנא נסה שוב.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card user-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>עדכון פרטי משתמש וכתובת משלוח</h3>
          <button type="button" className="close-x" onClick={onClose} disabled={saving}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">הפרטים עודכנו בהצלחה!</div>}

          <div className="form-info-row">
            <span>טלפון מחובר: <strong>{user?.phone}</strong></span>
          </div>

          {/* Full Name */}
          <div className="form-group name-group">
            <label htmlFor="fullName">שם מלא</label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="שם פרטי ומשפחה"
              required
              disabled={saving}
            />
          </div>

          {/* Addresses list label */}
          <div className="addresses-section-header">
            <h4>כתובת למשלוח</h4>
          </div>

          <div className="addresses-list-container">
            {addresses.map((addr, idx) => {
              const isExpanded = expandedIndex === idx;
              const hasFields = addr.street || addr.city;
              const summaryText = hasFields
                ? `${addr.street} ${addr.streetNumber}${addr.apartment ? `, דירה ${addr.apartment}` : ''}, ${addr.city}`
                : `כתובת חדשה (לחץ להזנת פרטים)`;

              return (
                <div key={idx} className={`address-accordion-item ${isExpanded ? 'expanded' : ''}`}>
                  {/* Summary/Header */}
                  <div className="accordion-summary-header" onClick={() => !saving && toggleExpand(idx)}>
                    <div className="summary-title-wrapper">
                      <span className="accordion-icon">📍</span>
                      <span className="accordion-title-text">{summaryText}</span>
                    </div>
                    <div className="summary-actions-wrapper">
                      <button
                        type="button"
                        className="delete-address-btn"
                        onClick={(e) => !saving && handleDeleteAddress(idx, e)}
                        title="מחק כתובת זו"
                        disabled={saving}
                      >
                        🗑️
                      </button>
                      <span className="expand-indicator">{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* Fields Panel (Expanded) */}
                  {isExpanded && (
                    <div className="accordion-details-panel">
                      {/* Residency Type Image Buttons */}
                      <div className="form-group residency-type-group">
                        <label>סוג המגורים</label>
                        <div className="residency-options">
                          <button
                            type="button"
                            className={`residency-option-btn ${addr.residencyType === 'בניין דירות' ? 'active' : ''}`}
                            onClick={() => handleAddressChange(idx, { residencyType: 'בניין דירות' })}
                            disabled={saving}
                          >
                            <span className="residency-icon">🏢</span>
                            <span className="residency-label">דירה בבניין</span>
                          </button>

                          <button
                            type="button"
                            className={`residency-option-btn ${addr.residencyType === 'בית פרטי' ? 'active' : ''}`}
                            onClick={() => handleAddressChange(idx, { residencyType: 'בית פרטי' })}
                            disabled={saving}
                          >
                            <span className="residency-icon">🏠</span>
                            <span className="residency-label">בית פרטי</span>
                          </button>

                          <button
                            type="button"
                            className={`residency-option-btn ${addr.residencyType === 'משרד' ? 'active' : ''}`}
                            onClick={() => handleAddressChange(idx, { residencyType: 'משרד' })}
                            disabled={saving}
                          >
                            <span className="residency-icon">💼</span>
                            <span className="residency-label">משרד / עסק</span>
                          </button>
                        </div>
                      </div>

                      {/* City & Street */}
                      <div className="form-row">
                        <div className="form-group flex-2">
                          <label>עיר</label>
                          <input
                            type="text"
                            value={addr.city}
                            onChange={(e) => handleAddressChange(idx, { city: e.target.value })}
                            placeholder="לדוגמה: תל אביב"
                            required
                            disabled={saving}
                          />
                        </div>
                        <div className="form-group flex-3">
                          <label>רחוב</label>
                          <input
                            type="text"
                            value={addr.street}
                            onChange={(e) => handleAddressChange(idx, { street: e.target.value })}
                            placeholder="לדוגמה: אבן גבירול"
                            required
                            disabled={saving}
                          />
                        </div>
                      </div>

                      {/* House Number, Apartment & Postal Code */}
                      <div className="form-row narrow-fields">
                        <div className="form-group flex-number">
                          <label>מספר בית</label>
                          <input
                            type="text"
                            value={addr.streetNumber}
                            onChange={(e) => handleAddressChange(idx, { streetNumber: e.target.value })}
                            placeholder="למשל: 14"
                            required
                            disabled={saving}
                          />
                        </div>
                        <div className="form-group flex-apartment">
                          <label>דירה / כניסה</label>
                          <input
                            type="text"
                            value={addr.apartment}
                            onChange={(e) => handleAddressChange(idx, { apartment: e.target.value })}
                            placeholder="אופציונלי"
                            disabled={saving}
                          />
                        </div>
                        <div className="form-group flex-postal">
                          <label>מיקוד</label>
                          <input
                            type="text"
                            value={addr.postalCode || ''}
                            onChange={(e) => handleAddressChange(idx, { postalCode: e.target.value })}
                            placeholder="חובה"
                            required
                            disabled={saving}
                          />
                        </div>
                      </div>

                      {/* Address Note */}
                      <div className="form-group notes-group">
                        <label>הערה לכתובת (אינטרקום, קוד כניסה וכדומה)</label>
                        <input
                          type="text"
                          value={addr.notes || ''}
                          onChange={(e) => handleAddressChange(idx, { notes: e.target.value })}
                          placeholder="לדוגמה: קוד כניסה #1234, להשאיר ליד הדלת"
                          disabled={saving}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {addresses.length === 0 && (
            <button
              type="button"
              className="add-address-btn"
              onClick={handleAddAddress}
              disabled={saving}
            >
              ➕ הוסף כתובת משלוח
            </button>
          )}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={saving}>
              ביטול
            </button>
            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? 'שומר...' : 'שמור שינויים'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
