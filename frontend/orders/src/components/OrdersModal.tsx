import React, { useState } from 'react';
import { useApp } from '../AppContext';
import './OrdersModal.scss';

interface OrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrdersModal: React.FC<OrdersModalProps> = ({ isOpen, onClose }) => {
  const { orders } = useApp();
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleOrder = (orderId: string) => {
    setExpandedOrderId(prev => prev === orderId ? null : orderId);
  };

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
              {orders.map((ord) => {
                const isExpanded = expandedOrderId === ord.orderId;
                
                return (
                  <div key={ord.orderId} className={`history-order-item ${isExpanded ? 'expanded' : ''}`}>
                    {/* Collapsible Header */}
                    <div 
                      className="order-item-header clickable-header" 
                      onClick={() => toggleOrder(ord.orderId)}
                      title={isExpanded ? 'לחץ לכיווץ' : 'לחץ להרחבה'}
                    >
                      <div className="header-right-side">
                        <span className={`collapse-arrow ${isExpanded ? 'up' : 'down'}`}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                        <span className="order-id">הזמנה #{ord.orderId.replace('order-', '')}</span>
                        <span className="order-date">
                          {ord.createdAt ? new Date(ord.createdAt).toLocaleDateString('he-IL') : ''}
                        </span>
                      </div>
                      
                      <div className="header-left-side">
                        <span className="header-order-price">
                          {ord.status === 'completed' && ord.finalPrice !== undefined 
                            ? `₪${ord.finalPrice.toFixed(2)}` 
                            : `₪${ord.preAuthPrice.toFixed(2)} (זמני)`
                          }
                        </span>
                        <span className={`order-status-badge status-${ord.status || 'open'}`}>
                          {ord.status === 'completed' ? 'הושלמה' : ord.status === 'cancelled' ? 'בוטלה' : 'בתהליך שקילה'}
                        </span>
                      </div>
                    </div>

                    {/* Collapsible Body */}
                    {isExpanded && (
                      <div className="order-item-collapsible-content">
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
                            <ul className="products-history-list">
                              {ord.items.map((item) => {
                                const isWeight = item.product.weightable;
                                const isCompleted = ord.status === 'completed';
                                
                                let qtyText = '';
                                let itemTotalStr = '';
                                
                                if (isWeight) {
                                  const finalWeight = item.actualWeight !== undefined ? item.actualWeight : item.weight;
                                  qtyText = `${finalWeight} ק"ג` + (isCompleted && item.actualWeight !== undefined ? ' (נשקל בפועל)' : ' (זמני)');
                                  itemTotalStr = `₪${(item.product.price * finalWeight).toFixed(2)}`;
                                } else {
                                  qtyText = `${item.quantity} יח'`;
                                  itemTotalStr = `₪${(item.product.price * item.quantity).toFixed(2)}`;
                                }

                                return (
                                  <li key={item.product.productId} className="product-history-row">
                                    <span className="prod-desc">{item.product.productDesc}</span>
                                    <span className="prod-details">
                                      <span className="prod-qty">{qtyText}</span>
                                      <span className="prod-price-unit"> ({item.product.price.toFixed(2)} ₪/{isWeight ? 'ק"ג' : 'יח\''})</span>
                                    </span>
                                    <span className="prod-total font-mono">{itemTotalStr}</span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </div>

                        <div className="order-item-footer">
                          {ord.status === 'completed' && ord.finalPrice !== undefined ? (
                            <div className="footer-price-summary">
                              <div className="final-charge-line">
                                <span>סכום סופי לחיוב:</span>
                                <span className="order-price final-price">₪{ord.finalPrice.toFixed(2)}</span>
                              </div>
                              <div className="preauth-ref-line">
                                <span>(סכום זמני שאושר מראש: ₪{ord.preAuthPrice.toFixed(2)})</span>
                              </div>
                            </div>
                          ) : (
                            <div className="footer-price-summary">
                              <div className="preauth-charge-line">
                                <span>סכום זמני מאושר (Pre-auth):</span>
                                <span className="order-price preauth-price">₪{ord.preAuthPrice.toFixed(2)}</span>
                              </div>
                              <div className="pending-explain">
                                * סכום החיוב הסופי ייקבע לאחר שקילת המוצרים בפועל.
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
