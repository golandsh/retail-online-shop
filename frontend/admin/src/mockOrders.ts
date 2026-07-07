export interface Product {
  productId: string;
  productDesc: string;
  categoryId: string;
  price: number;
  weightable: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  weight: number;
  actualWeight?: number;
}

export interface AdminOrder {
  orderId: string;
  phone: string;
  items: CartItem[];
  preAuthPrice: number;
  finalPrice?: number;
  status: 'open' | 'completed' | 'cancelled';
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

// Generate relative dates dynamically
const getRelativeDate = (daysAgo: number, hoursAgo = 0): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
};

export const mockOrders: AdminOrder[] = [
  {
    orderId: 'order-H7Y2B8N9',
    phone: '054-1234567',
    items: [
      {
        product: { productId: '1001', productDesc: 'חלב 3% קרטון 1 ליטר', categoryId: 'dairy', price: 7.50, weightable: false },
        quantity: 2,
        weight: 0
      },
      {
        product: { productId: '2001', productDesc: 'גבינת צהובה עמק 200 גרם', categoryId: 'cheese', price: 13.50, weightable: false },
        quantity: 1,
        weight: 0
      },
      {
        product: { productId: '1003', productDesc: 'בננות טריות', categoryId: 'produce', price: 4.90, weightable: true },
        quantity: 0,
        weight: 1.5
      }
    ],
    preAuthPrice: 36.64, // (7.5*2 + 13.5 + 4.9*1.5*1.1)
    status: 'open',
    notes: 'נא להשאיר ליד הדלת במידה ואין מענה',
    createdAt: getRelativeDate(0, 2), // Today, 2 hours ago
    profileSnapshot: {
      fullName: 'ישראל ישראלי',
      city: 'תל אביב',
      street: 'אבן גבירול',
      streetNumber: '42',
      apartment: '12',
      residencyType: 'בניין דירות',
      notes: 'קוד כניסה לבניין 4589'
    },
    cardLastFour: '9012'
  },
  {
    orderId: 'order-X9F4S2D1',
    phone: '052-9876543',
    items: [
      {
        product: { productId: '1005', productDesc: 'ביצים M 12 יחידות', categoryId: 'dairy', price: 14.90, weightable: false },
        quantity: 1,
        weight: 0
      },
      {
        product: { productId: '3001', productDesc: 'לחם מחמצת כוסמין מיוחד', categoryId: 'breads', price: 16.00, weightable: false },
        quantity: 2,
        weight: 0
      }
    ],
    preAuthPrice: 46.90,
    status: 'open',
    notes: 'נא לא לצלצל באינטרקום, יש תינוק ישן',
    createdAt: getRelativeDate(0, 5), // Today, 5 hours ago
    profileSnapshot: {
      fullName: 'רונית כהן',
      city: 'גבעתיים',
      street: 'כצנלסון',
      streetNumber: '15',
      apartment: '3',
      residencyType: 'בניין דירות'
    },
    cardLastFour: '4321'
  },
  {
    orderId: 'order-Z3P8Q5L2',
    phone: '050-1112223',
    items: [
      {
        product: { productId: '5001', productDesc: 'חזה עוף טרי נקי במשקל', categoryId: 'meat', price: 36.90, weightable: true },
        quantity: 0,
        weight: 2.0
      }
    ],
    preAuthPrice: 81.18, // 36.9 * 2 * 1.1
    finalPrice: 73.80, // 36.9 * 2.0 (exact weight reached)
    status: 'completed',
    notes: 'נא לחתוך דק במידת האפשר',
    createdAt: getRelativeDate(0, 1), // Today, 1 hour ago
    profileSnapshot: {
      fullName: 'משה לוי',
      city: 'רמת גן',
      street: 'הרא"ה',
      streetNumber: '102',
      apartment: '5',
      residencyType: 'בניין דירות'
    },
    cardLastFour: '8877'
  },
  {
    orderId: 'order-K2L8J4M3',
    phone: '053-4445556',
    items: [
      {
        product: { productId: '1002', productDesc: 'לחם אחיד פרוס', categoryId: 'bakery', price: 6.90, weightable: false },
        quantity: 1,
        weight: 0
      },
      {
        product: { productId: '1006', productDesc: 'חמאה הולנדית 200 גרם', categoryId: 'dairy', price: 8.20, weightable: false },
        quantity: 2,
        weight: 0
      }
    ],
    preAuthPrice: 23.30,
    status: 'open',
    notes: '',
    createdAt: getRelativeDate(2, 4), // 2 days ago
    profileSnapshot: {
      fullName: 'דוד אברהם',
      city: 'חולון',
      street: 'שנקר',
      streetNumber: '8',
      apartment: '1',
      residencyType: 'בניין דירות'
    },
    cardLastFour: '2468'
  },
  {
    orderId: 'order-Y9T1U2V3',
    phone: '054-9998887',
    items: [
      {
        product: { productId: '5002', productDesc: 'סטייק אנטריקוט במשקל', categoryId: 'meat', price: 139.00, weightable: true },
        quantity: 0,
        weight: 1.2
      },
      {
        product: { productId: '4002', productDesc: 'מלפפון בלאדי טרי', categoryId: 'produce', price: 5.80, weightable: true },
        quantity: 0,
        weight: 2.0
      }
    ],
    preAuthPrice: 201.52, // (139*1.2 + 5.8*2)*1.1
    status: 'open',
    notes: 'הבשר ליום הולדת, נא לבחור נתח יפה',
    createdAt: getRelativeDate(5, 1), // 5 days ago
    profileSnapshot: {
      fullName: 'אלון ברק',
      city: 'ראשון לציון',
      street: 'הרצל',
      streetNumber: '150',
      apartment: '2',
      residencyType: 'בית פרטי'
    },
    cardLastFour: '9988'
  },
  {
    orderId: 'order-M4B7V9C1',
    phone: '052-2223334',
    items: [
      {
        product: { productId: '2101', productDesc: 'יוגורט יווני 10%', categoryId: 'yogurts', price: 4.50, weightable: false },
        quantity: 6,
        weight: 0
      }
    ],
    preAuthPrice: 27.00,
    finalPrice: 27.00,
    status: 'completed',
    notes: '',
    createdAt: getRelativeDate(3, 8), // 3 days ago (completed past order)
    profileSnapshot: {
      fullName: 'שרה גולדברג',
      city: 'ירושלים',
      street: 'יפו',
      streetNumber: '21',
      apartment: '14',
      residencyType: 'בניין דירות'
    },
    cardLastFour: '1122'
  },
  {
    orderId: 'order-L5N6M7K8',
    phone: '050-7778889',
    items: [
      {
        product: { productId: '1004', productDesc: 'עגבניות שרי באשכולות', categoryId: 'produce', price: 8.90, weightable: true },
        quantity: 0,
        weight: 3.0
      }
    ],
    preAuthPrice: 29.37,
    status: 'cancelled',
    notes: 'בוטל עקב חוסר מלאי',
    createdAt: getRelativeDate(8, 2), // 8 days ago
    profileSnapshot: {
      fullName: 'יוסי כהן',
      city: 'פתח תקווה',
      street: 'ז׳בוטינסקי',
      streetNumber: '5',
      apartment: '20',
      residencyType: 'בניין דירות'
    },
    cardLastFour: '5566'
  },
  {
    orderId: 'order-A1B2C3D4',
    phone: '054-5556667',
    items: [
      {
        product: { productId: '1001', productDesc: 'חלב 3% קרטון 1 ליטר', categoryId: 'dairy', price: 7.50, weightable: false },
        quantity: 4,
        weight: 0
      },
      {
        product: { productId: '3002', productDesc: 'בגט צרפתי פריך', categoryId: 'breads', price: 5.50, weightable: false },
        quantity: 2,
        weight: 0
      }
    ],
    preAuthPrice: 41.00,
    finalPrice: 41.00,
    status: 'completed',
    notes: '',
    createdAt: getRelativeDate(14, 3), // 14 days ago
    profileSnapshot: {
      fullName: 'מיכל שרון',
      city: 'תל אביב',
      street: 'דיזנגוף',
      streetNumber: '101',
      apartment: '4',
      residencyType: 'בניין דירות'
    },
    cardLastFour: '7788'
  },
  {
    orderId: 'order-E5F6G7H8',
    phone: '053-8889990',
    items: [
      {
        product: { productId: '5003', productDesc: 'פילה סלמון טרי במשקל', categoryId: 'meat', price: 95.00, weightable: true },
        quantity: 0,
        weight: 1.5
      }
    ],
    preAuthPrice: 156.75,
    finalPrice: 142.50,
    status: 'completed',
    notes: 'נא להביא חתיכה אחת שלמה ללא עור',
    createdAt: getRelativeDate(25, 6), // 25 days ago
    profileSnapshot: {
      fullName: 'רונן לוין',
      city: 'הרצליה',
      street: 'סוקולוב',
      streetNumber: '67',
      apartment: '2',
      residencyType: 'בניין דירות'
    },
    cardLastFour: '1357'
  },
  {
    orderId: 'order-I9J0K1L2',
    phone: '052-1111111',
    items: [
      {
        product: { productId: '2002', productDesc: 'גבינת גאודה במשקל', categoryId: 'cheese', price: 68.00, weightable: true },
        quantity: 0,
        weight: 0.5
      }
    ],
    preAuthPrice: 37.40,
    status: 'cancelled',
    notes: 'הלקוח התחרט',
    createdAt: getRelativeDate(28, 1), // 28 days ago
    profileSnapshot: {
      fullName: 'ליאת רגב',
      city: 'נתניה',
      street: 'הרצל',
      streetNumber: '24',
      apartment: '9',
      residencyType: 'בניין דירות'
    },
    cardLastFour: '2468'
  },
  {
    orderId: 'order-Q1W2E3R4',
    phone: '058-2345678',
    items: [
      {
        product: { productId: '1005', productDesc: 'ביצים M 12 יחידות', categoryId: 'dairy', price: 14.90, weightable: false },
        quantity: 3,
        weight: 0
      }
    ],
    preAuthPrice: 44.70,
    status: 'open',
    notes: 'נא לתאם מראש בטלפון לפני הגעה',
    createdAt: getRelativeDate(10, 4), // 10 days ago
    profileSnapshot: {
      fullName: 'איתי קליין',
      city: 'כפר סבא',
      street: 'ויצמן',
      streetNumber: '75',
      apartment: '18',
      residencyType: 'בניין דירות'
    },
    cardLastFour: '6543'
  }
];
