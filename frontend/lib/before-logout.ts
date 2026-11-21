// Work that must run before «Logg ut» (story 3.5). A practice session in
// progress registers «send the result first» here; useLogout (identity) waits
// for every registered task before it calls POST /api/identity/logout. The
// register is neutral, so identity never needs to know about practice.

export type BeforeLogoutTask = () => Promise<unknown> | void;

// How long logging out waits at most for the tasks.
export const BEFORE_LOGOUT_TIMEOUT_MS = 3000;

const tasks = new Set<BeforeLogoutTask>();

// Registers a task; the returned function removes it again.
export function registerBeforeLogout(task: BeforeLogoutTask): () => void {
  tasks.add(task);
  return () => {
    tasks.delete(task);
  };
}

// Runs every registered task and waits until all are done (a failing task
// counts as done), but never longer than `timeoutMs`.
export async function runBeforeLogout(timeoutMs: number = BEFORE_LOGOUT_TIMEOUT_MS): Promise<void> {
  if (tasks.size === 0) return;
  const all = Promise.allSettled([...tasks].map((task) => Promise.resolve().then(task)));
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  try {
    await Promise.race([all, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
