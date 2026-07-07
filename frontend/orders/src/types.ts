export interface Category {
  categoryId: string;
  categoryDesc: string;
  parentID?: string | null;
}

export interface Product {
  productId: string;
  productDesc: string;
  categoryId: string;
  price: number;
  weightable: boolean;
  image?: string; // Optional image URL for rich visuals
}

export interface CartItem {
  product: Product;
  quantity: number; // for count-based products
  weight: number;    // for weightable products (in kg)
  actualWeight?: number;
}

export interface Address {
  id?: number;
  city: string;
  street: string;
  streetNumber: string;
  apartment: string;
  residencyType: string; // e.g., "בניין דירות", "בית פרטי", "משרד"
  postalCode?: string;
  notes?: string;
}

export interface UserProfile {
  fullName: string;
  addresses: Address[];
}


export interface CreditCard {
  id: string;
  cardholderName: string;
  cardNumber: string; // Full mock number
  lastFour: string;
  expiry: string;
  cvv: string;
}

export interface Order {
  orderId: string;
  phone?: string;
  status?: 'open' | 'completed' | 'cancelled';
  finalPrice?: number;
  items: CartItem[];
  preAuthPrice: number;
  notes: string;
  createdAt: string;
  profileSnapshot: {
    fullName: string;
    city: string;
    street: string;
    streetNumber: string;
    apartment: string;
    residencyType: string;
    notes?: string;
  };
  cardLastFour: string;
}

