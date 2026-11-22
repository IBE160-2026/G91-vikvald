import { afterEach, describe, expect, it, vi } from "vitest";

import { BEFORE_LOGOUT_TIMEOUT_MS, registerBeforeLogout, runBeforeLogout } from "./before-logout";

const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((remove) => remove());
  vi.useRealTimers();
});

function register(task: () => Promise<unknown> | void) {
  cleanups.push(registerBeforeLogout(task));
}

describe("runBeforeLogout", () => {
  it("FR-56: uten oppgaver er den ferdig med en gang", async () => {
    await expect(runBeforeLogout()).resolves.toBeUndefined();
  });

  it("FR-56: venter på alle registrerte oppgaver, også når én feiler", async () => {
    const done: string[] = [];
    register(async () => {
      await Promise.resolve();
      done.push("økt");
    });
    register(() => {
      throw new Error("feilet");
    });
    register(() => {
      done.push("annen");
    });
    await runBeforeLogout();
    expect(done.sort()).toEqual(["annen", "økt"]);
  });

  it("FR-56: venter høyst 3 sekunder", async () => {
    vi.useFakeTimers();
    register(() => new Promise(() => {}));
    let finished = false;
    const running = runBeforeLogout().then(() => {
      finished = true;
    });
    await vi.advanceTimersByTimeAsync(BEFORE_LOGOUT_TIMEOUT_MS - 1);
    expect(finished).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await running;
    expect(finished).toBe(true);
    expect(BEFORE_LOGOUT_TIMEOUT_MS).toBe(3000);
  });

  it("FR-56: en fjernet oppgave kjøres ikke", async () => {
    const task = vi.fn();
    const remove = registerBeforeLogout(task);
    remove();
    await runBeforeLogout();
    expect(task).not.toHaveBeenCalled();
  });
});
