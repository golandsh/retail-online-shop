import React from 'react';
import { useApp } from '../AppContext';
import './OrdersModal.scss';

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrdersModal: React.FC<OrdersModalProps> = ({ isOpen, onClose }) => {
  const { orders } = useApp();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card orders-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📋 ההזמנות שלי</h3>
          <button type="button" className="close-x" onClick={onClose}>×</button>
        </div>

        <div className="modal-body orders-modal-body">
          {orders.length === 0 ? (
            <div className="empty-orders-state">
              <span className="empty-orders-icon">📦</span>
              <p>עדיין לא ביצעת הזמנות בחנות.</p>
              <p className="sub-text">הזמן מוצרים טריים והם יופיעו כאן מייד!</p>
            </div>
          ) : (
            <div className="orders-scroller">
              {orders.map((ord) => (
                <div key={ord.orderId} className="history-order-item">
                  <div className="order-item-header">
                    <div>
                      <span className="order-id">הזמנה #{ord.orderId}</span>
                      <span className="order-date">{new Date(ord.createdAt).toLocaleDateString('he-IL')}</span>
                    </div>
                    <span className="order-status-badge">בוצעה</span>
                  </div>

                  <div className="order-item-body">
                    <p className="address-snapshot">
                      <strong>📍 משלוח אל:</strong> {ord.profileSnapshot.fullName}, {ord.profileSnapshot.street} {ord.profileSnapshot.streetNumber}, {ord.profileSnapshot.city}
                    </p>
                    <p className="card-snapshot">
                      <strong>💳 שולם באמצעות:</strong> כרטיס המסתיים ב-{ord.cardLastFour}
                    </p>
                    {ord.notes && (
                      <p className="notes-snapshot">
                        <strong>📝 הערות:</strong> {ord.notes}
                      </p>
                    )}

                    <div className="order-item-products">
                      <h5>🛒 פריטים בהזמנה:</h5>
                      <ul>
                        {ord.items.map((item) => (
                          <li key={item.product.productId}>
                            {item.product.productDesc} — {item.product.weightable
                              ? `${item.weight} ק״ג`
                              : `${item.quantity} יח׳`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="order-item-footer">
                    <span>סכום זמני מאושר:</span>
                    <span className="order-price">₪{ord.preAuthPrice.toFixed(2)}</span>
                  </div>
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
