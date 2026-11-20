// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import { inertOthers } from "./dialog";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("inertOthers", () => {
  it("#68: gjør alt utenfor dialogen inert, men ikke veien ned til den, og angrer etterpå", () => {
    document.body.innerHTML =
      '<div id="app"><main id="main"></main></div><div id="portal"><div id="scrim"><div id="dialog"></div></div><p id="beside"></p></div>';
    const undo = inertOthers(document.getElementById("dialog")!);
    expect(document.getElementById("app")!.hasAttribute("inert")).toBe(true);
    expect(document.getElementById("beside")!.hasAttribute("inert")).toBe(true);
    for (const id of ["portal", "scrim", "dialog"]) {
      expect(document.getElementById(id)!.hasAttribute("inert")).toBe(false);
    }
    undo();
    expect(document.querySelectorAll("[inert]")).toHaveLength(0);
  });

  it("#68: lar aria-live-områder være, og det som var inert fra før, forblir inert", () => {
    document.body.innerHTML =
      '<div id="app"><p id="live" aria-live="polite"></p><main id="main"></main></div><div id="old" inert></div><div id="dialog"></div>';
    const undo = inertOthers(document.getElementById("dialog")!);
    expect(document.getElementById("live")!.hasAttribute("inert")).toBe(false);
    expect(document.getElementById("app")!.hasAttribute("inert")).toBe(false);
    expect(document.getElementById("main")!.hasAttribute("inert")).toBe(true);
    undo();
    expect(document.getElementById("main")!.hasAttribute("inert")).toBe(false);
    expect(document.getElementById("old")!.hasAttribute("inert")).toBe(true);
  });
});
