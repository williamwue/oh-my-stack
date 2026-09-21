export function createWorker({ queue, render, store }) {
  return function processNext() {
    const job = queue.dequeue();
    if (job === null) return null;
    store.put(job.id, render(job.report));
    return job.id;
  };
}
