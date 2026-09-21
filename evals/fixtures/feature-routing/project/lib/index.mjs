import { normalizeOrder } from "./normalize-order.mjs";
import { renderReceipt } from "./receipt.mjs";

export function createReceipt(input) {
  return renderReceipt(normalizeOrder(input));
}
