// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  clearSignedIn,
  handleSessionLost,
  markSignedIn,
  noteSessionLost,
  takeSessionExpired,
} from "./session";

afterEach(() => {
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("flaggene i sessionStorage", () => {
  it("UX-DR40: innlogget fane som mister innloggingen gir meldingen én gang", () => {
    markSignedIn();
    expect(noteSessionLost()).toBe(true);
    expect(takeSessionExpired()).toBe(true);
    // Read once: a reload of the login page does not show it again.
    expect(takeSessionExpired()).toBe(false);
  });

  it("UX-DR40: fane som aldri var innlogget gir ingen melding", () => {
    expect(noteSessionLost()).toBe(false);
    expect(takeSessionExpired()).toBe(false);
  });

  it("UX-DR40: etter «Logg ut» gir 401 ingen melding", () => {
    markSignedIn();
    clearSignedIn();
    expect(noteSessionLost()).toBe(false);
    expect(takeSessionExpired()).toBe(false);
  });

  it("UX-DR40: andre 401 etter den første gir ikke meldingen på nytt", () => {
    markSignedIn();
    noteSessionLost();
    takeSessionExpired();
    expect(noteSessionLost()).toBe(false);
  });

  it("NFR-7: flaggene er bare «1», aldri token eller e-post", () => {
    markSignedIn();
    noteSessionLost();
    markSignedIn();
    const values = Object.keys(window.sessionStorage).map((key) => window.sessionStorage.getItem(key));
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => value === "1")).toBe(true);
    expect(window.localStorage.length).toBe(0);
  });

  it("UX-DR40: sessionStorage som kaster gir ingen feil og ingen melding", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => markSignedIn()).not.toThrow();
    expect(() => clearSignedIn()).not.toThrow();
    expect(noteSessionLost()).toBe(false);
    expect(takeSessionExpired()).toBe(false);
  });
});

describe("handleSessionLost", () => {
  it("UX-DR40: tømmer bufferen, går til /logg-inn og husker meldingen", () => {
    markSignedIn();
    const clear = vi.fn();
    const replace = vi.fn();
    handleSessionLost({ clear }, { replace });
    expect(clear).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith("/logg-inn");
    expect(takeSessionExpired()).toBe(true);
  });
});
