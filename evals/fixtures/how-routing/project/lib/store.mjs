export function createStore() {
  const records = new Map();
  return {
    put(id, content) {
      records.set(id, Object.freeze({ id, content }));
    },
    get(id) {
      return records.get(id) ?? null;
    },
  };
}
