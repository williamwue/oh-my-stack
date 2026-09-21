import { createQueue } from "./queue.mjs";
import { renderReport } from "./render.mjs";
import { createStore } from "./store.mjs";
import { createSubmitter } from "./submit.mjs";
import { createWorker } from "./worker.mjs";

export function createReportSystem() {
  const queue = createQueue();
  const store = createStore();
  return {
    submit: createSubmitter(queue),
    processNext: createWorker({ queue, render: renderReport, store }),
    read: (id) => store.get(id),
  };
}
