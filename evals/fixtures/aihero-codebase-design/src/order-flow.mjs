export function validateOrder(order) { return order.items.length > 0; }
export function totalOrder(order) { return order.items.reduce((sum, item) => sum + item.price * item.quantity, 0); }
export function buildCharge(order) { return { cents: totalOrder(order), reference: order.id }; }
export function receipt(order, result) { return { orderId: order.id, paymentId: result.id }; }
export async function checkout(order, stripe) {
  if (!validateOrder(order)) throw new Error("empty order");
  const charge = buildCharge(order);
  const result = await stripe.charge(charge);
  return receipt(order, result);
}
