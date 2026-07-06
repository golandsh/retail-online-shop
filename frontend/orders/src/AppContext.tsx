import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Product, CartItem, UserProfile, CreditCard, Order } from './types';
import { auth } from './firebase';

interface AppContextType {
  user: { phone: string } | null;
  profile: UserProfile | null;
  cart: CartItem[];
  savedCards: CreditCard[];
  orders: Order[];
  login: (phone: string) => void;
  logout: () => void;
  updateProfile: (profile: UserProfile) => void;
  addToCart: (product: Product, quantityOrWeight: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  saveCreditCard: (card: Omit<CreditCard, 'id' | 'lastFour'> & { cardNumber: string }) => CreditCard;
  deleteCreditCard: (cardId: string) => void;
  createNewOrder: (notes: string, card: CreditCard) => Order;
}

const getCookie = (name: string): string | null => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
  }
  return null;
};

const setCookie = (name: string, value: string, days: number) => {
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax; Secure`;
};

const deleteCookie = (name: string) => {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ phone: string } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [savedCards, setSavedCards] = useState<CreditCard[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const logout = () => {
    setUser(null);
    setProfile(null);
    setCart([]);
    localStorage.removeItem('orders_user');
    localStorage.removeItem('orders_profile');
    deleteCookie('orders_session');
    auth.signOut().catch((err) => console.error("Firebase signOut error", err));
  };

  const login = (phone: string) => {
    const sessionUser = { phone };
    setUser(sessionUser);
    localStorage.setItem('orders_user', JSON.stringify(sessionUser));
    setCookie('orders_session', JSON.stringify(sessionUser), 30);

    // Try loading existing profile for this phone number if exists
    const localProfile = localStorage.getItem(`profile_${phone}`);
    if (localProfile) {
      const parsed = JSON.parse(localProfile);
      setProfile(parsed);
      localStorage.setItem('orders_profile', JSON.stringify(parsed));
    } else {
      // Initialize a blank/partially blank profile
      const newProfile: UserProfile = {
        fullName: '',
        city: '',
        street: '',
        streetNumber: '',
        apartment: '',
        residencyType: 'בניין דירות'
      };
      setProfile(newProfile);
      localStorage.setItem('orders_profile', JSON.stringify(newProfile));
    }
  };

  // Load saved credentials/cards/profile from LocalStorage on mount
  useEffect(() => {
    const sessionCookie = getCookie('orders_session');
    if (!sessionCookie) {
      logout();
      return;
    }

    const savedUserStr = localStorage.getItem('orders_user');
    const savedProfileStr = localStorage.getItem('orders_profile');
    const savedCardsStr = localStorage.getItem('orders_cards');
    const savedOrdersStr = localStorage.getItem('orders_history');

    if (savedUserStr) {
      setUser(JSON.parse(savedUserStr));
    } else {
      try {
        const parsed = JSON.parse(sessionCookie);
        setUser(parsed);
        localStorage.setItem('orders_user', sessionCookie);
      } catch (e) {
        logout();
        return;
      }
    }

    if (savedProfileStr) setProfile(JSON.parse(savedProfileStr));
    if (savedCardsStr) {
      setSavedCards(JSON.parse(savedCardsStr));
    } else {
      // Add a default mock saved card to make the experience nice from the start
      const defaultCard: CreditCard = {
        id: 'card-1',
        cardholderName: 'ישראל ישראלי',
        cardNumber: '4580123456789012',
        lastFour: '9012',
        expiry: '12/28',
        cvv: '123'
      };
      setSavedCards([defaultCard]);
      localStorage.setItem('orders_cards', JSON.stringify([defaultCard]));
    }
    if (savedOrdersStr) setOrders(JSON.parse(savedOrdersStr));
  }, []);

  const updateProfile = (updated: UserProfile) => {
    setProfile(updated);
    localStorage.setItem('orders_profile', JSON.stringify(updated));
    if (user?.phone) {
      localStorage.setItem(`profile_${user.phone}`, JSON.stringify(updated));
    }
  };

  const addToCart = (product: Product, quantityOrWeight: number) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.productId === product.productId);

      if (quantityOrWeight <= 0) {
        return prev.filter((item) => item.product.productId !== product.productId);
      }

      const updated = [...prev];
      if (existingIdx > -1) {
        if (product.weightable) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            weight: Number(quantityOrWeight.toFixed(3))
          };
        } else {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: Math.round(quantityOrWeight)
          };
        }
      } else {
        updated.push({
          product,
          quantity: product.weightable ? 0 : Math.round(quantityOrWeight),
          weight: product.weightable ? Number(quantityOrWeight.toFixed(3)) : 0
        });
      }
      return updated;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const saveCreditCard = (cardData: Omit<CreditCard, 'id' | 'lastFour'> & { cardNumber: string }): CreditCard => {
    const lastFour = cardData.cardNumber.slice(-4) || '1111';
    const newCard: CreditCard = {
      ...cardData,
      id: `card-${Date.now()}`,
      lastFour
    };

    const updated = [...savedCards, newCard];
    setSavedCards(updated);
    localStorage.setItem('orders_cards', JSON.stringify(updated));
    return newCard;
  };

  const deleteCreditCard = (cardId: string) => {
    const updated = savedCards.filter((card) => card.id !== cardId);
    setSavedCards(updated);
    localStorage.setItem('orders_cards', JSON.stringify(updated));
  };

  const createNewOrder = (notes: string, card: CreditCard): Order => {
    if (!profile) throw new Error("No customer profile found");

    // Calculate subtotal
    const subtotal = cart.reduce((sum, item) => {
      const factor = item.product.weightable ? item.weight : item.quantity;
      return sum + item.product.price * factor;
    }, 0);

    // preAuthPrice is calculated as subtotal + 10% safety margin for weightable items to pre-authorize
    const weightableTotal = cart
      .filter((item) => item.product.weightable)
      .reduce((sum, item) => sum + item.product.price * item.weight, 0);

    const regularTotal = subtotal - weightableTotal;
    const safetyMargin = weightableTotal * 0.10;
    const preAuthPrice = Number((regularTotal + weightableTotal + safetyMargin).toFixed(2));

    const newOrder: Order = {
      orderId: `order-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      items: [...cart],
      preAuthPrice,
      notes,
      createdAt: new Date().toISOString(),
      profileSnapshot: { ...profile },
      cardLastFour: card.lastFour
    };

    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem('orders_history', JSON.stringify(updatedOrders));

    clearCart();
    return newOrder;
  };

  return (
    <AppContext.Provider value={{
      user,
      profile,
      cart,
      savedCards,
      orders,
      login,
      logout,
      updateProfile,
      addToCart,
      removeFromCart,
      clearCart,
      saveCreditCard,
      deleteCreditCard,
      createNewOrder
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside an AppProvider");
  return context;
};
