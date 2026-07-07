import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { AdminOrder } from '../mockOrders';
import { t } from '../strings';
import './OrdersGrid.scss';

export const OrdersGrid: React.FC = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'completed' | 'cancelled'>('all');
  const [showPastOrders, setShowPastOrders] = useState(false);

  // Selected Order for Details Modal
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);



  // Dynamic weights input state inside the details modal
  const [modalWeights, setModalWeights] = useState<Record<string, string>>({});

  // Toast message state
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null);

  const isInitialLoad = useRef(true);

  const showToast = (text: string, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 3000);
  };

  // Play a dynamic synth sound chime using AudioContext
  const playNotificationSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(start);
        osc.stop(start + duration);
      };
      
      const now = ctx.currentTime;
      playTone(523.25, now, 0.35); // C5
      playTone(659.25, now + 0.12, 0.45); // E5
    } catch (e) {
      console.error("Audio context playback failed:", e);
    }
  };

  // Trigger web notification
  const triggerWebNotification = (orderId: string, name: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("הזמנה חדשה התקבלה!", {
        body: `הזמנה ${orderId.replace('order-', '')} מ-${name} נכנסה למערכת`,
        icon: "/favicon.ico"
      });
    }
  };

  // Request browser Notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Connect to Firestore real-time snapshots
  useEffect(() => {
    isInitialLoad.current = true;
    const q = query(collection(db, 'orders'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: AdminOrder[] = [];
      let newOrderDetected = false;
      let newOrderName = '';
      let newOrderId = '';

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const docData = change.doc.data() as any;
          if (!isInitialLoad.current) {
            newOrderDetected = true;
            newOrderId = change.doc.id;
            newOrderName = docData.profileSnapshot?.fullName || docData.phone || '';
          }
        }
      });

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetched.push({
          ...data,
          orderId: docSnap.id
        } as AdminOrder);
      });

      setOrders(fetched);
      isInitialLoad.current = false;

      if (newOrderDetected) {
        playNotificationSound();
        triggerWebNotification(newOrderId, newOrderName);
        showToast(`הזמנה חדשה התקבלה מ-${newOrderName}!`);
      }
    }, (error) => {
      console.error("Firestore onSnapshot error:", error);
    });

    return () => unsubscribe();
  }, []);

  // Populate modalWeights when a details modal is opened
  useEffect(() => {
    if (selectedOrder) {
      const initial: Record<string, string> = {};
      selectedOrder.items.forEach(item => {
        if (item.product.weightable) {
          // If actual weight is already final, load it, otherwise prefill with requested weight
          const weightVal = item.actualWeight !== undefined ? item.actualWeight : item.weight;
          initial[item.product.productId] = weightVal > 0 ? weightVal.toString() : '';
        }
      });
      setModalWeights(initial);
    } else {
      setModalWeights({});
    }
  }, [selectedOrder]);

  // Check if a date is today
  const isToday = (dateStr: string) => {
    if (!dateStr) return false;
    const date = new Date(dateStr);
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const handleStatusChange = async (orderId: string, newStatus: 'open' | 'completed' | 'cancelled') => {
    try {
      const order = orders.find(o => o.orderId === orderId);
      if (!order) return;

      const orderRef = doc(db, 'orders', orderId);
      const updates: any = {
        status: newStatus
      };
      // If completing from the grid and finalPrice is not set, set it to preAuthPrice
      if (newStatus === 'completed' && order.finalPrice === undefined) {
        updates.finalPrice = order.preAuthPrice;
      }

      await updateDoc(orderRef, updates);
      showToast(t('saveSuccess'));
    } catch (e) {
      console.error("Error updating order status:", e);
      showToast("שגיאה בעדכון ההזמנה", true);
    }
  };

  // Handle detailed modal weights change
  const handleWeightChange = (productId: string, value: string) => {
    setModalWeights(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  // Calculate live dynamic price in details modal based on updated weights
  const calculateModalFinalPrice = () => {
    if (!selectedOrder) return 0;
    return selectedOrder.items.reduce((sum, item) => {
      if (item.product.weightable) {
        const enteredWeight = parseFloat(modalWeights[item.product.productId] || '0');
        return sum + item.product.price * (isNaN(enteredWeight) ? 0 : enteredWeight);
      } else {
        return sum + item.product.price * item.quantity;
      }
    }, 0);
  };

  // Finalize weighting and complete order in Firestore
  const handleCompleteWeighting = async () => {
    if (!selectedOrder) return;

    try {
      const updatedItems = selectedOrder.items.map(item => {
        if (item.product.weightable) {
          const entered = parseFloat(modalWeights[item.product.productId] || '0');
          return {
            ...item,
            actualWeight: isNaN(entered) ? 0 : entered
          };
        }
        return item;
      });

      const finalPriceValue = calculateModalFinalPrice();
      const orderRef = doc(db, 'orders', selectedOrder.orderId);

      await updateDoc(orderRef, {
        status: 'completed',
        finalPrice: Number(finalPriceValue.toFixed(2)),
        items: updatedItems
      });

      setSelectedOrder(null);
      showToast(t('saveSuccess'));
    } catch (e) {
      console.error("Error completing weighting:", e);
      showToast("שגיאה במהלך שמירת השקילה", true);
    }
  };

  // Helper to normalize phone numbers for international or local searching (+972 vs 0)
  const normalizePhoneForMatch = (phoneStr: string) => {
    if (!phoneStr) return '';
    let digits = phoneStr.replace(/\D/g, '');
    if (digits.startsWith('972')) {
      digits = '0' + digits.substring(3);
    }
    return digits;
  };

  // Filter & Sort Logic
  const filteredOrders = orders.filter(order => {
    // 1. Phone search with normalization
    const cleanSearch = normalizePhoneForMatch(searchTerm);
    const cleanPhone = normalizePhoneForMatch(order.phone || '');
    if (cleanSearch && !cleanPhone.includes(cleanSearch)) {
      return false;
    }

    // 2. Status filter select dropdown
    if (statusFilter !== 'all' && order.status !== statusFilter) {
      return false;
    }

    // 3. Past orders logic
    // Default mode: Open orders (any date) + Completed orders from TODAY
    if (!showPastOrders) {
      const isOpen = order.status === 'open';
      const isCompletedToday = order.status === 'completed' && isToday(order.createdAt);
      if (!isOpen && !isCompletedToday) {
        return false;
      }
    }

    return true;
  });

  // Sort: Open orders first, then newer orders first
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1;
    if (a.status !== 'open' && b.status === 'open') return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getStatusBadgeClass = (status: 'open' | 'completed' | 'cancelled') => {
    switch (status) {
      case 'open': return 'badge-open';
      case 'completed': return 'badge-completed';
      case 'cancelled': return 'badge-cancelled';
      default: return '';
    }
  };

  return (
    <div className="orders-grid-container" dir="rtl">
      {/* Toast Alert */}
      {toast && (
        <div className={`grid-toast ${toast.isError ? 'error' : 'success'}`}>
          {toast.text}
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="grid-controls">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="status-select">{t('statusFilterLabel')}</label>
          <select
            id="status-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">{t('statusAll')}</option>
            <option value="open">{t('statusOpen')}</option>
            <option value="completed">{t('statusCompleted')}</option>
            <option value="cancelled">{t('statusCancelled')}</option>
          </select>
        </div>

        <label className="past-orders-toggle">
          <input
            type="checkbox"
            checked={showPastOrders}
            onChange={(e) => setShowPastOrders(e.target.checked)}
          />
          <span className="toggle-text">{t('showPastOrders')}</span>
        </label>
      </div>

      {/* Grid Table */}
      <div className="table-responsive">
        <table className="orders-table">
          <thead>
            <tr>
              <th>{t('thOrderId')}</th>
              <th>{t('thCustomer')}</th>
              <th>{t('thDate')}</th>
              <th>{t('thPreAuth')}</th>
              <th>{t('thFinalPrice')}</th>
              <th>{t('thStatus')}</th>
              <th>{t('thActions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.length > 0 ? (
              sortedOrders.map((order) => {
                return (
                  <tr key={order.orderId} className={`order-row ${order.status === 'open' ? 'status-row-open' : ''}`}>
                    <td className="col-id">
                      <span className="order-id-label">{order.orderId.replace('order-', '')}</span>
                    </td>
                    <td className="col-customer">
                      <div className="customer-info">
                        <span className="customer-name">{order.profileSnapshot.fullName}</span>
                        <span className="customer-phone">{order.phone}</span>
                      </div>
                    </td>
                    <td className="col-date">
                      <div className="date-info">
                        <span className="date-date">{order.createdAt ? new Date(order.createdAt).toLocaleDateString('he-IL') : '-'}</span>
                        <span className="date-time">
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    </td>
                    <td className="col-preauth">
                      <span className="price-tag">₪{order.preAuthPrice.toFixed(2)}</span>
                    </td>
                    <td className="col-final">
                      <span className="price-tag final-price-display font-mono">
                        {order.finalPrice !== undefined && order.finalPrice !== null
                          ? `₪${order.finalPrice.toFixed(2)}`
                          : '--'
                        }
                      </span>
                    </td>
                    <td className="col-status">
                      <select
                        className={`status-select ${getStatusBadgeClass(order.status)}`}
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.orderId, e.target.value as any)}
                      >
                        <option value="open">{t('statusOpen')}</option>
                        <option value="completed">{t('statusCompleted')}</option>
                        <option value="cancelled">{t('statusCancelled')}</option>
                      </select>
                    </td>
                    <td className="col-actions">
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn-grid-details"
                          onClick={() => setSelectedOrder(order)}
                        >
                          {t('btnDetails')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="no-data-cell">
                  <div className="no-data-content">
                    <span className="no-data-icon">📦</span>
                    <p>{t('noOrdersFound')}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details Dialog Modal */}
      {selectedOrder && (
        <div className="details-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="details-card" onClick={(e) => e.stopPropagation()}>
            <div className="details-header">
              <h3>
                {t('detailsTitle', { id: selectedOrder.orderId.replace('order-', '') })}
              </h3>
              <button 
                type="button" 
                className="close-details-btn"
                onClick={() => setSelectedOrder(null)}
              >
                &times;
              </button>
            </div>

            <div className="details-body">
              {/* Customer and Delivery Details */}
              <div className="details-section shadow-box">
                <h4>👤 {t('detailsAddress')}</h4>
                <p className="shipping-text">
                  {t('shippingTo', {
                    name: selectedOrder.profileSnapshot.fullName,
                    city: selectedOrder.profileSnapshot.city,
                    street: selectedOrder.profileSnapshot.street,
                    number: selectedOrder.profileSnapshot.streetNumber,
                    apartment: selectedOrder.profileSnapshot.apartment || '-',
                    type: selectedOrder.profileSnapshot.residencyType
                  })}
                </p>
                {selectedOrder.profileSnapshot.notes && (
                  <p className="shipping-notes">
                    <strong>הנחיות הגעה:</strong> {selectedOrder.profileSnapshot.notes}
                  </p>
                )}
                {selectedOrder.notes && (
                  <p className="order-notes-box">
                    <strong>{t('detailsNotes')}:</strong> {selectedOrder.notes}
                  </p>
                )}
              </div>

              {/* Items List */}
              <div className="details-section">
                <h4>🛒 {t('detailsItems')}</h4>
                <div className="items-table-wrapper">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>{t('itemDesc')}</th>
                        <th className="align-center">{t('itemQty')}</th>
                        <th className="align-left">{t('itemUnitPrice')}</th>
                        <th className="align-left">{t('itemTotal')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, idx) => {
                        const isWeight = item.product.weightable;
                        const isOrderOpen = selectedOrder.status === 'open';

                        if (isWeight && isOrderOpen) {
                          return (
                            <tr key={idx}>
                              <td>{item.product.productDesc}</td>
                              <td className="align-center quantity-cell">
                                <div className="weight-adjust-input-wrapper">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="weight-adjust-input"
                                    value={modalWeights[item.product.productId] ?? ''}
                                    onChange={(e) => handleWeightChange(item.product.productId, e.target.value)}
                                  />
                                  <span className="weight-unit">ק"ג</span>
                                </div>
                                <div className="original-weight-hint">
                                  (הוזמן: {item.weight} ק"ג)
                                </div>
                              </td>
                              <td className="align-left font-mono">₪{item.product.price.toFixed(2)} לק"ג</td>
                              <td className="align-left font-mono">
                                ₪{(item.product.price * (parseFloat(modalWeights[item.product.productId] || '0') || 0)).toFixed(2)}
                              </td>
                            </tr>
                          );
                        }

                        // Static display for non-weightable items or completed orders
                        const quantityText = isWeight 
                          ? `${item.actualWeight !== undefined ? item.actualWeight : item.weight} ק"ג` 
                          : `${item.quantity} יח'`;
                        const factor = isWeight 
                          ? (item.actualWeight !== undefined ? item.actualWeight : item.weight) 
                          : item.quantity;
                        const total = item.product.price * factor;

                        return (
                          <tr key={idx}>
                            <td>{item.product.productDesc}</td>
                            <td className="align-center quantity-cell">{quantityText}</td>
                            <td className="align-left font-mono">
                              ₪{item.product.price.toFixed(2)} {isWeight ? 'לק"ג' : 'ליח\''}
                            </td>
                            <td className="align-left font-mono">₪{total.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial comparison */}
              <div className="details-financials shadow-box">
                <div className="financial-row">
                  <span>{t('thPreAuth')} (כולל מרווח ביטחון):</span>
                  <strong className="font-mono">₪{selectedOrder.preAuthPrice.toFixed(2)}</strong>
                </div>

                <div className="financial-row final-row-line">
                  <span>{t('thFinalPrice')} {selectedOrder.status === 'open' ? 'מחושב סופית:' : 'סופי שנרשם:'}</span>
                  <strong className="font-mono" style={{ fontSize: '1.25rem', color: 'var(--success)' }}>
                    ₪{selectedOrder.status === 'open' 
                        ? calculateModalFinalPrice().toFixed(2) 
                        : (selectedOrder.finalPrice !== undefined ? selectedOrder.finalPrice : 0).toFixed(2)
                    }
                  </strong>
                </div>

                {selectedOrder.status === 'open' && (
                  <div className="weighting-actions" style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn-complete-weighting"
                      onClick={handleCompleteWeighting}
                    >
                      ⚖️ סיום שקילה והשלמת הזמנה
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
