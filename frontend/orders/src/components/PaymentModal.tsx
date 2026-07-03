import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import type { CreditCard, Order } from '../types';
import './PaymentModal.scss';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const { cart, savedCards, createNewOrder, saveCreditCard, profile } = useApp();
  
  // Checkout fields
  const [notes, setNotes] = useState('');
  const [selectedCardId, setSelectedCardId] = useState<string>(
    savedCards.length > 0 ? savedCards[0].id : 'new'
  );
  
  // New Card Form fields
  const [newCardData, setNewCardData] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [shouldSaveCard, setShouldSaveCard] = useState(true);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [formError, setFormError] = useState('');

  // Reset success and form states when modal is opened
  useEffect(() => {
    if (isOpen) {
      setCompletedOrder(null);
      setIsProcessing(false);
      setFormError('');
      setNotes('');
      setNewCardData({
        cardholderName: '',
        cardNumber: '',
        expiry: '',
        cvv: '',
      });
      setSelectedCardId(savedCards.length > 0 ? savedCards[0].id : 'new');
    }
  }, [isOpen, savedCards]);

  if (!isOpen) return null;

  // Calculate prices
  const subtotal = cart.reduce((sum, item) => {
    const amount = item.product.weightable ? item.weight : item.quantity;
    return sum + item.product.price * amount;
  }, 0);

  const weightableTotal = cart
    .filter((item) => item.product.weightable)
    .reduce((sum, item) => sum + item.product.price * item.weight, 0);

  const safetyMargin = weightableTotal * 0.10;
  const preAuthPrice = Number((subtotal + safetyMargin).toFixed(2));

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsProcessing(true);

    setTimeout(() => {
      try {
        let cardToUse: CreditCard | null = null;

        if (selectedCardId === 'new') {
          // Basic validations for new card
          const { cardholderName, cardNumber, expiry, cvv } = newCardData;
          if (!cardholderName.trim()) {
            throw new Error('אנא הזן את שם בעל הכרטיס');
          }
          if (cardNumber.replace(/\D/g, '').length < 16) {
            throw new Error('מספר כרטיס האשראי חייב להכיל 16 ספרות');
          }
          if (!/^\d{2}\/\d{2}$/.test(expiry)) {
            throw new Error('תוקף הכרטיס חייב להיות בפורמט MM/YY');
          }
          if (cvv.replace(/\D/g, '').length < 3) {
            throw new Error('קוד CVV חייב להכיל לפחות 3 ספרות');
          }

          const cardInput = {
            cardholderName,
            cardNumber: cardNumber.replace(/\s/g, ''),
            expiry,
            cvv
          };

          if (shouldSaveCard) {
            cardToUse = saveCreditCard(cardInput);
          } else {
            cardToUse = {
              id: 'temp-card',
              cardholderName: cardInput.cardholderName,
              cardNumber: cardInput.cardNumber,
              lastFour: cardInput.cardNumber.slice(-4),
              expiry: cardInput.expiry,
              cvv: cardInput.cvv
            };
          }
        } else {
          const found = savedCards.find((c) => c.id === selectedCardId);
          if (!found) throw new Error('הכרטיס השמור לא נמצא');
          cardToUse = found;
        }

        const newOrder = createNewOrder(notes, cardToUse);
        setCompletedOrder(newOrder);
      } catch (err: any) {
        setFormError(err.message || 'שגיאה במהלך ביצוע התשלום. אנא נסה שוב.');
      } finally {
        setIsProcessing(false);
      }
    }, 1500); // Mock processing delay
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format card number with spaces every 4 digits
    const value = e.target.value.replace(/\D/g, '');
    const formatted = value.match(/.{1,4}/g)?.join(' ') || '';
    setNewCardData({ ...newCardData, cardNumber: formatted.substring(0, 19) });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format MM/YY
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = `${value.substring(0, 2)}/${value.substring(2, 4)}`;
    }
    setNewCardData({ ...newCardData, expiry: value.substring(0, 5) });
  };

  // Render Order Success Screen
  if (completedOrder) {
    return (
      <div className="modal-overlay">
        <div className="modal-card success-card">
          <div className="success-icon">✓</div>
          <h2>ההזמנה בוצעה בהצלחה!</h2>
          <p className="success-subtitle">תודה שקנית אצלנו. פרטי ההזמנה מופיעים להלן:</p>

          <div className="order-details-box">
            <div className="detail-item">
              <span>מספר הזמנה:</span>
              <strong>{completedOrder.orderId}</strong>
            </div>
            <div className="detail-item">
              <span>סכום זמני לאישור:</span>
              <strong>₪{completedOrder.preAuthPrice.toFixed(2)}</strong>
            </div>
            <div className="detail-item">
              <span>כתובת למשלוח:</span>
              <span>
                {completedOrder.profileSnapshot.street} {completedOrder.profileSnapshot.streetNumber}
                {completedOrder.profileSnapshot.apartment ? `, דירה ${completedOrder.profileSnapshot.apartment}` : ''}
                , {completedOrder.profileSnapshot.city}
              </span>
            </div>
            {completedOrder.notes && (
              <div className="detail-item notes-item">
                <span>הערות להזמנה:</span>
                <p>{completedOrder.notes}</p>
              </div>
            )}
            <div className="detail-item">
              <span>אמצעי תשלום:</span>
              <span>כרטיס אשראי שמסתיים ב-{completedOrder.cardLastFour}</span>
            </div>
          </div>

          <button type="button" className="close-success-btn" onClick={onClose}>
            סגור וחזור לחנות
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card payment-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>קופה ותשלום מאובטח</h3>
          <button type="button" className="close-x" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handlePay} className="payment-form">
          {formError && <div className="form-error">{formError}</div>}

          {/* Delivery Details Snapshot */}
          <div className="checkout-section border-bottom">
            <h4>כתובת משלוח</h4>
            {profile && (
              <div className="delivery-address-summary">
                <p><strong>שם מקבל המשלוח:</strong> {profile.fullName}</p>
                <p>
                  <strong>כתובת:</strong> {profile.street} {profile.streetNumber}
                  {profile.apartment ? `, דירה ${profile.apartment}` : ''}
                  , {profile.city} ({profile.residencyType})
                </p>
              </div>
            )}
          </div>

          {/* Notes and Price */}
          <div className="checkout-section border-bottom">
            <div className="form-group">
              <label htmlFor="orderNotes">הערות לשליח או להזמנה</label>
              <textarea
                id="orderNotes"
                placeholder="לדוגמה: נא להשאיר ליד הדלת במידה ולא עונים..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="preauth-summary">
              <div className="price-line">
                <span>סך הכל מוצרים בסל:</span>
                <span>₪{subtotal.toFixed(2)}</span>
              </div>
              {safetyMargin > 0 && (
                <div className="price-line buffer-line">
                  <span>תוספת ביטחון למוצרים שקילים (10%):</span>
                  <span>₪{safetyMargin.toFixed(2)}</span>
                </div>
              )}
              <div className="price-line total-line">
                <span>סכום זמני לאישור (Pre-auth):</span>
                <span>₪{preAuthPrice.toFixed(2)}</span>
              </div>
              <p className="preauth-explain">
                סכום זה מאושר זמנית במסגרת האשראי. החיוב בפועל יבוצע רק לאחר שקילת המוצרים הסופיים ואריזתם.
              </p>
            </div>
          </div>

          {/* Credit Card Selection */}
          <div className="checkout-section">
            <h4>אמצעי תשלום</h4>
            
            <div className="card-options-list">
              {savedCards.map((card) => (
                <label key={card.id} className="card-option-label">
                  <input
                    type="radio"
                    name="paymentCard"
                    value={card.id}
                    checked={selectedCardId === card.id}
                    onChange={() => setSelectedCardId(card.id)}
                  />
                  <div className="card-option-info">
                    <span className="card-brand-icon">💳</span>
                    <span className="card-digits">כרטיס שמור המסתיים ב-{card.lastFour}</span>
                    <span className="card-owner">({card.cardholderName})</span>
                  </div>
                </label>
              ))}

              <label className="card-option-label">
                <input
                  type="radio"
                  name="paymentCard"
                  value="new"
                  checked={selectedCardId === 'new'}
                  onChange={() => setSelectedCardId('new')}
                />
                <div className="card-option-info">
                  <span className="card-brand-icon">➕</span>
                  <span>כרטיס אשראי חדש</span>
                </div>
              </label>
            </div>

            {selectedCardId === 'new' && (
              <div className="new-card-fields">
                <div className="form-group">
                  <label htmlFor="ccName">שם בעל הכרטיס</label>
                  <input
                    id="ccName"
                    type="text"
                    placeholder="כפי שמופיע על גבי הכרטיס"
                    value={newCardData.cardholderName}
                    onChange={(e) => setNewCardData({ ...newCardData, cardholderName: e.target.value })}
                    required={selectedCardId === 'new'}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ccNumber">מספר כרטיס</label>
                  <input
                    id="ccNumber"
                    type="text"
                    placeholder="XXXX XXXX XXXX XXXX"
                    value={newCardData.cardNumber}
                    onChange={handleCardNumberChange}
                    required={selectedCardId === 'new'}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ccExpiry">תוקף (MM/YY)</label>
                    <input
                      id="ccExpiry"
                      type="text"
                      placeholder="MM/YY"
                      value={newCardData.expiry}
                      onChange={handleExpiryChange}
                      required={selectedCardId === 'new'}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="ccCvv">CVV (3 ספרות בגב)</label>
                    <input
                      id="ccCvv"
                      type="password"
                      maxLength={3}
                      placeholder="123"
                      value={newCardData.cvv}
                      onChange={(e) => setNewCardData({ ...newCardData, cvv: e.target.value.replace(/\D/g, '') })}
                      required={selectedCardId === 'new'}
                    />
                  </div>
                </div>

                <label className="save-card-checkbox">
                  <input
                    type="checkbox"
                    checked={shouldSaveCard}
                    onChange={(e) => setShouldSaveCard(e.target.checked)}
                  />
                  <span>שמור כרטיס אשראי זה להזמנות הבאות שלי</span>
                </label>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={isProcessing}>
              ביטול
            </button>
            <button type="submit" className="submit-btn pay-btn" disabled={isProcessing}>
              {isProcessing ? 'מעבד תשלום מאובטח...' : `אשר תשלום של ₪${preAuthPrice.toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
