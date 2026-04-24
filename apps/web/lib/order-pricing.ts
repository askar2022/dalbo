export const DELIVERY_FEE = 3.99;
export const SERVICE_FEE = 1.99;
export const RESTAURANT_COMMISSION_RATE = 0.1;

export function calculateOrderPricing(subtotal: number) {
  const normalizedSubtotal = Number(subtotal.toFixed(2));
  const commissionAmount = Number((normalizedSubtotal * RESTAURANT_COMMISSION_RATE).toFixed(2));
  const total = Number((normalizedSubtotal + DELIVERY_FEE + SERVICE_FEE).toFixed(2));

  return {
    subtotal: normalizedSubtotal,
    deliveryFee: DELIVERY_FEE,
    serviceFee: SERVICE_FEE,
    commissionAmount,
    total,
  };
}

export function toStripeAmount(value: number) {
  return Math.round(value * 100);
}
