export function renderTask(task) {
  const name = task.name.trim();
  const state = task.completed ? "done" : "open";
  return `Task ${name}: ${state}`;
}

export function renderProject(project) {
  const name = project.name.trim();
  const state = project.archived ? "done" : "open";
  return `Project ${name}: ${state}`;
}
