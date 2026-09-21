export function normalizeOrder(input) {
  if (typeof input?.customer !== "string" || input.customer.trim() === "") {
    throw new TypeError("customer is required");
  }

  return Object.freeze({
    customer: input.customer.trim(),
    items: Object.freeze(Array.isArray(input.items) ? [...input.items] : []),
  });
}
