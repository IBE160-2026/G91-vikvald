import { describe, expect, it } from "vitest";

import { fieldForErrorCode, registerErrorCodes, registerSchema } from "./validation";

const VALID_PASSWORD = "hemmelig1";

describe("registreringsreglene (samme som backenden)", () => {
  it("FR-3: gyldig e-post og passord godtas, e-posten trimmes og får små bokstaver", () => {
    const result = registerSchema.parse({ email: "  Klara@Eksempel.NO ", password: VALID_PASSWORD });
    expect(result.email).toBe("klara@eksempel.no");
    expect(registerErrorCodes({ email: "klara@eksempel.no", password: VALID_PASSWORD })).toBeNull();
  });

  it.each(["klara", "klara@eksempel", "", "   ", "klara @eksempel.no", "klara@@eksempel.no"])(
    "FR-3: «%s» gir INVALID_EMAIL",
    (email) => {
      expect(registerErrorCodes({ email, password: VALID_PASSWORD })).toEqual({ email: "INVALID_EMAIL" });
    },
  );

  it("FR-3: e-post på 254 tegn godtas, 255 gir INVALID_EMAIL", () => {
    const domain = "@eksempel.no";
    expect(registerErrorCodes({ email: "a".repeat(254 - domain.length) + domain, password: VALID_PASSWORD })).toBeNull();
    expect(registerErrorCodes({ email: "a".repeat(255 - domain.length) + domain, password: VALID_PASSWORD })).toEqual({
      email: "INVALID_EMAIL",
    });
  });

  it("FR-3: e-postlengden telles i tegn som i backenden, ikke i UTF-16-enheter", () => {
    const domain = "@eksempel.no";
    // 242 emoji + 12 = 254 characters, but 496 UTF-16 units.
    const email = "😀".repeat(254 - domain.length) + domain;
    expect(email.length).toBeGreaterThan(254);
    expect(registerErrorCodes({ email, password: VALID_PASSWORD })).toBeNull();
    expect(registerErrorCodes({ email: "😀" + email, password: VALID_PASSWORD })).toEqual({
      email: "INVALID_EMAIL",
    });
  });

  it("FR-3: 7 tegn gir PASSWORD_TOO_SHORT, 8 godtas", () => {
    expect(registerErrorCodes({ email: "klara@eksempel.no", password: "1234567" })).toEqual({
      password: "PASSWORD_TOO_SHORT",
    });
    expect(registerErrorCodes({ email: "klara@eksempel.no", password: "12345678" })).toBeNull();
  });

  it("FR-3: lengden telles i tegn, så 7 «æ» er for kort", () => {
    expect(registerErrorCodes({ email: "klara@eksempel.no", password: "æ".repeat(7) })).toEqual({
      password: "PASSWORD_TOO_SHORT",
    });
  });

  it("AR-10: 36 «æ» (72 byte) godtas", () => {
    expect(registerErrorCodes({ email: "klara@eksempel.no", password: "æ".repeat(36) })).toBeNull();
  });

  it("AR-10: 37 «æ» (74 byte) gir PASSWORD_TOO_LONG", () => {
    expect(registerErrorCodes({ email: "klara@eksempel.no", password: "æ".repeat(37) })).toEqual({
      password: "PASSWORD_TOO_LONG",
    });
  });

  it("FR-3: passordet trimmes ikke", () => {
    expect(registerSchema.parse({ email: "klara@eksempel.no", password: "  hemmelig  " }).password).toBe(
      "  hemmelig  ",
    );
    // Seven characters plus spaces is eight or more: the spaces count.
    expect(registerErrorCodes({ email: "klara@eksempel.no", password: " 1234567" })).toBeNull();
  });

  it("FR-3: begge feltene kan ha feil samtidig", () => {
    expect(registerErrorCodes({ email: "klara", password: "kort" })).toEqual({
      email: "INVALID_EMAIL",
      password: "PASSWORD_TOO_SHORT",
    });
  });

  it.each([
    ["INVALID_EMAIL", "email"],
    ["EMAIL_ALREADY_REGISTERED", "email"],
    ["PASSWORD_TOO_SHORT", "password"],
    ["PASSWORD_TOO_LONG", "password"],
    ["INTERNAL_ERROR", null],
    ["NETWORK_ERROR", null],
    ["VALIDATION_ERROR", null],
  ])("NFR-11: feilkoden %s hører til feltet %s", (code, field) => {
    expect(fieldForErrorCode(code)).toBe(field);
  });
});
