export function renderReceipt(order) {
  return [`Customer: ${order.customer}`, `Items: ${order.items.join(", ")}`].join("\n");
}
