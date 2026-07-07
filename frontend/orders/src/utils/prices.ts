import type { CartItem } from '../types';

export function calculatePrices(cart: CartItem[], enableSafetyMargin: boolean = false) {
  const subtotal = cart.reduce((sum, item) => {
    const amount = item.product.weightable ? item.weight : item.quantity;
    return sum + item.product.price * amount;
  }, 0);

  const weightableTotal = cart
    .filter((item) => item.product.weightable)
    .reduce((sum, item) => sum + item.product.price * item.weight, 0);

  const safetyMargin = enableSafetyMargin ? weightableTotal * 0.10 : 0;
  const preAuthPrice = Number((subtotal + safetyMargin).toFixed(2));

  return {
    subtotal: Number(subtotal.toFixed(2)),
    weightableTotal,
    safetyMargin,
    preAuthPrice
  };
}
