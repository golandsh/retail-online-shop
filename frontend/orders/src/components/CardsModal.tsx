import React from 'react';
import { useApp } from '../AppContext';
import './CardsModal.scss';

interface CardsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CardsModal: React.FC<CardsModalProps> = ({ isOpen, onClose }) => {
  const { savedCards, deleteCreditCard } = useApp();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card cards-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>💳 אמצעי תשלום שמורים</h3>
          <button type="button" className="close-x" onClick={onClose}>×</button>
        </div>

        <div className="modal-body cards-modal-body">
          {savedCards.length === 0 ? (
            <div className="empty-cards-state">
              <span className="empty-cards-icon">💳</span>
              <p>אין לך כרטיסי אשראי שמורים במערכת.</p>
              <p className="sub-text">כרטיסים חדשים ניתנים לשמירה במהלך ביצוע ההזמנה בקופה.</p>
            </div>
          ) : (
            <div className="saved-cards-list">
              {savedCards.map((card) => (
                <div key={card.id} className="card-item-row">
                  <div className="card-item-info">
                    <span className="card-logo">💳</span>
                    <div className="card-text-details">
                      <span className="card-digits">כרטיס המסתיים ב-{card.lastFour}</span>
                      <span className="card-holder-name">מחזיק הכרטיס: {card.cardholderName} | תוקף: {card.expiry}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="delete-card-btn"
                    title="מחק כרטיס שמור"
                    onClick={() => {
                      if (confirm('האם אתה בטוח שברצונך למחוק כרטיס אשראי זה?')) {
                        deleteCreditCard(card.id);
                      }
                    }}
                  >
                    🗑️ מחק
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="close-btn" onClick={onClose}>סגור</button>
        </div>
      </div>
    </div>
  );
};
