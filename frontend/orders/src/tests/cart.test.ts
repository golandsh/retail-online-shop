import { describe, it, expect } from 'vitest';
import type { Category, Product, CartItem } from '../types';
import { calculatePrices } from '../utils/prices';

// Business logic function to verify categories hierarchy
function getCategoriesWithChildren(categories: Category[]) {
  const parents = categories.filter(c => !c.parentID);
  return parents.map(parent => {
    const children = categories.filter(c => c.parentID === parent.categoryId);
    return {
      ...parent,
      children
    };
  });
}

describe('Category Hierarchy System', () => {
  it('correctly maps sub-categories to their parent category via parentID', () => {
    const categories: Category[] = [
      { categoryId: 'dairy', categoryDesc: 'Dairy' },
      { categoryId: 'cheese', categoryDesc: 'Cheese', parentID: 'dairy' },
      { categoryId: 'yogurts', categoryDesc: 'Yogurts', parentID: 'dairy' },
      { categoryId: 'bakery', categoryDesc: 'Bakery' },
      { categoryId: 'breads', categoryDesc: 'Breads', parentID: 'bakery' },
    ];

    const mapped = getCategoriesWithChildren(categories);

    // Verify parent dairy
    const dairyMapped = mapped.find(c => c.categoryId === 'dairy');
    expect(dairyMapped).toBeDefined();
    expect(dairyMapped?.children.length).toBe(2);
    expect(dairyMapped?.children.map(c => c.categoryId)).toContain('cheese');
    expect(dairyMapped?.children.map(c => c.categoryId)).toContain('yogurts');

    // Verify parent bakery
    const bakeryMapped = mapped.find(c => c.categoryId === 'bakery');
    expect(bakeryMapped).toBeDefined();
    expect(bakeryMapped?.children.length).toBe(1);
    expect(bakeryMapped?.children[0].categoryId).toBe('breads');
  });
});

describe('Checkout price calculation business logic', () => {
  const milk: Product = {
    productId: '1001',
    productDesc: 'Milk 3%',
    categoryId: 'dairy',
    price: 7.50,
    weightable: false,
  };

  const bananas: Product = {
    productId: '1003',
    productDesc: 'Bananas',
    categoryId: 'produce',
    price: 4.20,
    weightable: true,
  };

  it('calculates price correctly with count-only items (no safety buffer)', () => {
    const cart: CartItem[] = [
      { product: milk, quantity: 3, weight: 0 }
    ];

    const { subtotal, preAuthPrice } = calculatePrices(cart);

    expect(subtotal).toBe(22.50); // 3 * 7.5
    expect(preAuthPrice).toBe(22.50); // No weightable item, no buffer
  });

  it('calculates price correctly with weightable items, adding 10% safety buffer when enabled', () => {
    const cart: CartItem[] = [
      { product: bananas, quantity: 0, weight: 2.5 }
    ];

    const { subtotal, preAuthPrice } = calculatePrices(cart, true);

    const expectedSubtotal = 2.5 * 4.20; // 10.5
    const expectedBuffer = expectedSubtotal * 0.10; // 1.05
    const expectedPreAuth = expectedSubtotal + expectedBuffer; // 11.55

    expect(subtotal).toBe(expectedSubtotal);
    expect(preAuthPrice).toBe(Number(expectedPreAuth.toFixed(2)));
  });

  it('calculates price correctly with weightable items, adding NO safety buffer when disabled', () => {
    const cart: CartItem[] = [
      { product: bananas, quantity: 0, weight: 2.5 }
    ];

    const { subtotal, preAuthPrice } = calculatePrices(cart, false);

    const expectedSubtotal = 2.5 * 4.20; // 10.5

    expect(subtotal).toBe(expectedSubtotal);
    expect(preAuthPrice).toBe(expectedSubtotal); // No safety buffer added
  });

  it('calculates mixed cart totals correctly (only applying buffer to weightable portion when enabled)', () => {
    const cart: CartItem[] = [
      { product: milk, quantity: 2, weight: 0 }, // 2 * 7.5 = 15.00
      { product: bananas, quantity: 0, weight: 1.5 } // 1.5 * 4.2 = 6.30 (buffer = 0.63)
    ];

    const { subtotal, preAuthPrice } = calculatePrices(cart, true);

    expect(subtotal).toBe(21.30); // 15.00 + 6.30
    expect(preAuthPrice).toBe(21.93); // 21.30 + 0.63
  });

  it('calculates mixed cart totals correctly (applying NO buffer when disabled)', () => {
    const cart: CartItem[] = [
      { product: milk, quantity: 2, weight: 0 }, // 2 * 7.5 = 15.00
      { product: bananas, quantity: 0, weight: 1.5 } // 1.5 * 4.2 = 6.30
    ];

    const { subtotal, preAuthPrice } = calculatePrices(cart, false);

    expect(subtotal).toBe(21.30); // 15.00 + 6.30
    expect(preAuthPrice).toBe(21.30); // No safety buffer added
  });
});
