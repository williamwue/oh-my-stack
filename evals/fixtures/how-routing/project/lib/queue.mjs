export function createQueue() {
  const jobs = [];
  return {
    enqueue(job) {
      jobs.push(Object.freeze({ ...job }));
    },
    dequeue() {
      return jobs.shift() ?? null;
    },
  };
}
