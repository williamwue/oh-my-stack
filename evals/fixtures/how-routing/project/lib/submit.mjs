let nextId = 1;

export function createSubmitter(queue) {
  return function submit(input) {
    if (!input || typeof input.title !== "string" || input.title.trim() === "") {
      throw new TypeError("title is required");
    }
    const report = Object.freeze({
      title: input.title.trim(),
      lines: Array.isArray(input.lines) ? [...input.lines] : [],
    });
    const id = `report-${nextId++}`;
    queue.enqueue({ id, report });
    return id;
  };
}
