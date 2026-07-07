import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Product, Category, CartItem, UserProfile, CreditCard, Order, Address } from './types';
import { auth, useEmulator } from './firebase';

interface AppContextType {
  user: { phone: string } | null;
  profile: UserProfile | null;
  cart: CartItem[];
  savedCards: CreditCard[];
  orders: Order[];
  categories: Category[];
  products: Product[];
  loadingCatalog: boolean;
  login: (phone: string) => void;
  logout: () => void;
  updateProfile: (profile: UserProfile) => Promise<void>;
  addToCart: (product: Product, quantityOrWeight: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  saveCreditCard: (card: Omit<CreditCard, 'id' | 'lastFour'> & { cardNumber: string }) => CreditCard;
  deleteCreditCard: (cardId: string) => void;
  createNewOrder: (notes: string, card: CreditCard, selectedAddress: Address) => Order;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const logout = () => {
    setUser(null);
    setProfile(null);
    setCart([]);
    deleteCookie('orders_session');
    auth.signOut().catch((err) => console.error("Firebase signOut error", err));
  };

  const fetchAndSetCatalog = async (phone?: string) => {
    setLoadingCatalog(true);
    try {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "online-shop-bf396";

      const baseUrl = (isLocalhost && !useEmulator)
        ? `https://us-east1-${projectId}.cloudfunctions.net`
        : "/api";

      let url = `${baseUrl}/getCatalog`;
      let apiPhone = '';
      if (phone) {
        apiPhone = phone.trim();
        if (apiPhone.startsWith('+972')) {
          apiPhone = '0' + apiPhone.substring(4);
        }
        url += `?phone=${encodeURIComponent(apiPhone)}`;
      }

      let res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch catalog: ${res.statusText}`);
      }

      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
      }
      if (data.categories) {
        setCategories(data.categories);
      }

      if (phone) {
        if (data.user) {
          const backendAddresses: Address[] = [];
          if (data.user.address) {
            backendAddresses.push({
              id: data.user.address.id || 1,
              city: data.user.address.city || '',
              street: data.user.address.street || '',
              streetNumber: data.user.address.streetNumber ? String(data.user.address.streetNumber) : '',
              apartment: data.user.address.apartment ? String(data.user.address.apartment) : '',
              residencyType: data.user.pt || 'בניין דירות',
              postalCode: data.user.address.postalCode ? String(data.user.address.postalCode) : '',
              notes: data.user.address.notes || '',
            });
          }

          const fetchedProfile: UserProfile = {
            fullName: data.user.fullName || '',
            addresses: backendAddresses,
          };
          setProfile(fetchedProfile);
        } else {
          setProfile({
            fullName: '',
            addresses: [],
          });
        }
      }
    } catch (error) {
      console.error("Error loading catalog:", error);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const login = (phone: string) => {
    const sessionUser = { phone };
    setUser(sessionUser);
    setCookie('orders_session', JSON.stringify(sessionUser), 30);
    fetchAndSetCatalog(phone);
  };

  // Load saved credentials/cards/profile from LocalStorage/Cookies on mount
  useEffect(() => {
    const sessionCookie = getCookie('orders_session');
    if (!sessionCookie) {
      logout();
      fetchAndSetCatalog();
      return;
    }

    const savedCardsStr = localStorage.getItem('orders_cards');
    const savedOrdersStr = localStorage.getItem('orders_history');

    let restoredPhone = '';
    try {
      const parsed = JSON.parse(sessionCookie);
      setUser(parsed);
      restoredPhone = parsed.phone;
    } catch (e) {
      logout();
      fetchAndSetCatalog();
      return;
    }

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

    if (restoredPhone) {
      fetchAndSetCatalog(restoredPhone);
    } else {
      fetchAndSetCatalog();
    }
  }, []);

  const updateProfile = async (updated: UserProfile) => {
    if (!user?.phone) return;

    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "online-shop-bf396";

    const baseUrl = (isLocalhost && !useEmulator)
      ? `https://us-east1-${projectId}.cloudfunctions.net`
      : "/api";

    let apiPhone = user.phone.trim();
    if (apiPhone.startsWith('+972')) {
      apiPhone = '0' + apiPhone.substring(4);
    }

    const residencyType = updated.addresses[0]?.residencyType || 'בניין דירות';

    // 1. Upsert User
    const userRes = await fetch(`${baseUrl}/upsertUser`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: apiPhone,
        fullName: updated.fullName,
        pt: residencyType,
      }),
    });

    if (!userRes.ok) {
      throw new Error(`Failed to update user profile: ${userRes.statusText}`);
    }

    // 2. Upsert Address or Delete Address
    if (updated.addresses.length > 0) {
      const addr = updated.addresses[0];
      const addressRes = await fetch(`${baseUrl}/upsertAddress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: apiPhone,
          city: addr.city.trim(),
          street: addr.street.trim(),
          streetNumber: Number(addr.streetNumber),
          apartment: addr.apartment ? Number(addr.apartment) : null,
          postalCode: Number(addr.postalCode),
          notes: addr.notes ? addr.notes.trim() : null,
        }),
      });

      if (!addressRes.ok) {
        throw new Error(`Failed to update address: ${addressRes.statusText}`);
      }
    } else {
      // Address was deleted
      const deleteRes = await fetch(`${baseUrl}/deleteAddress`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: apiPhone }),
      });

      if (!deleteRes.ok && deleteRes.status !== 404) {
        throw new Error(`Failed to delete address: ${deleteRes.statusText}`);
      }
    }

    // 3. Update react state
    setProfile(updated);
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

  const createNewOrder = (notes: string, card: CreditCard, selectedAddress: Address): Order => {
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
      profileSnapshot: {
        fullName: profile.fullName,
        city: selectedAddress.city,
        street: selectedAddress.street,
        streetNumber: selectedAddress.streetNumber,
        apartment: selectedAddress.apartment,
        residencyType: selectedAddress.residencyType,
        notes: selectedAddress.notes || '',
      },
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
      categories,
      products,
      loadingCatalog,
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
