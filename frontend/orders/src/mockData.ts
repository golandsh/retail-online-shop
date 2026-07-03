import type { Category, Product } from './types';

export const mockCategories: Category[] = [
  // Parent categories
  { categoryId: 'dairy', categoryDesc: 'מוצרי חלב' },
  { categoryId: 'bakery', categoryDesc: 'מאפייה ולחמים' },
  { categoryId: 'produce', categoryDesc: 'פירות וירקות' },
  { categoryId: 'meat', categoryDesc: 'בשר, עוף ודגים' },
  
  // Sub categories
  { categoryId: 'cheese', categoryDesc: 'גבינות ומעדנים', parentID: 'dairy' },
  { categoryId: 'yogurts', categoryDesc: 'יוגורטים ומשקאות חלב', parentID: 'dairy' },
  { categoryId: 'breads', categoryDesc: 'לחמים מיוחדים', parentID: 'bakery' },
  { categoryId: 'pastries', categoryDesc: 'מאפים וקרואסונים', parentID: 'bakery' }
];

export const mockProducts: Product[] = [
  // Dairy General
  {
    productId: '1001',
    productDesc: 'חלב 3% קרטון 1 ליטר',
    categoryId: 'dairy',
    price: 7.50,
    weightable: false,
  },
  {
    productId: '1005',
    productDesc: 'ביצים M 12 יחידות',
    categoryId: 'dairy',
    price: 14.90,
    weightable: false,
  },
  {
    productId: '1006',
    productDesc: 'חמאה הולנדית 200 גרם',
    categoryId: 'dairy',
    price: 8.20,
    weightable: false,
  },
  
  // Cheese (Sub Dairy)
  {
    productId: '2001',
    productDesc: 'גבינת צהובה עמק 200 גרם',
    categoryId: 'cheese',
    price: 13.50,
    weightable: false,
  },
  {
    productId: '2002',
    productDesc: 'גבינת גאודה במשקל',
    categoryId: 'cheese',
    price: 68.00, // Price per kg
    weightable: true,
  },
  {
    productId: '2003',
    productDesc: 'פרמזן איטלקי מגורר 100 גרם',
    categoryId: 'cheese',
    price: 11.90,
    weightable: false,
  },
  
  // Yogurts (Sub Dairy)
  {
    productId: '2101',
    productDesc: 'יוגורט יווני 10% שומן',
    categoryId: 'yogurts',
    price: 4.50,
    weightable: false,
  },
  {
    productId: '2102',
    productDesc: 'משקה יוגורט תות 250 מ"ל',
    categoryId: 'yogurts',
    price: 5.20,
    weightable: false,
  },

  // Bakery General
  {
    productId: '1002',
    productDesc: 'לחם אחיד פרוס',
    categoryId: 'bakery',
    price: 6.90,
    weightable: false,
  },
  
  // Breads (Sub Bakery)
  {
    productId: '3001',
    productDesc: 'לחם מחמצת כוסמין מיוחד',
    categoryId: 'breads',
    price: 16.00,
    weightable: false,
  },
  {
    productId: '3002',
    productDesc: 'בגט צרפתי פריך',
    categoryId: 'breads',
    price: 5.50,
    weightable: false,
  },

  // Pastries (Sub Bakery)
  {
    productId: '3101',
    productDesc: 'קרואסון חמאה פריזאי',
    categoryId: 'pastries',
    price: 6.00,
    weightable: false,
  },
  {
    productId: '3102',
    productDesc: 'מאפה שוקולד חם',
    categoryId: 'pastries',
    price: 6.50,
    weightable: false,
  },

  // Produce (Fruits and Vegetables)
  {
    productId: '1003',
    productDesc: 'בננות טריות',
    categoryId: 'produce',
    price: 4.90, // Per kg
    weightable: true,
  },
  {
    productId: '1004',
    productDesc: 'עגבניות שרי באשכולות',
    categoryId: 'produce',
    price: 8.90, // Per kg
    weightable: true,
  },
  {
    productId: '4001',
    productDesc: 'תפוח עץ חרמון אדום',
    categoryId: 'produce',
    price: 9.90, // Per kg
    weightable: true,
  },
  {
    productId: '4002',
    productDesc: 'מלפפון בלאדי טרי',
    categoryId: 'produce',
    price: 5.80, // Per kg
    weightable: true,
  },

  // Meat, Poultry & Fish
  {
    productId: '5001',
    productDesc: 'חזה עוף טרי נקי במשקל',
    categoryId: 'meat',
    price: 36.90, // Per kg
    weightable: true,
  },
  {
    productId: '5002',
    productDesc: 'סטייק אנטריקוט עגל משובח במשקל',
    categoryId: 'meat',
    price: 139.00, // Per kg
    weightable: true,
  },
  {
    productId: '5003',
    productDesc: 'פילה סלמון טרי במשקל',
    categoryId: 'meat',
    price: 95.00, // Per kg
    weightable: true,
  }
];
