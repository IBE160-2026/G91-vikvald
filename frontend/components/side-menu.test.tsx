// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MenuButton, SideMenu, SideMenuProvider, useOpenShortcuts, useSideMenuCollapsed } from "./side-menu";
import { TopBar } from "./top-bar";

let pathname = "/emner/s1";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

let narrow = false;

beforeEach(() => {
  pathname = "/emner/s1";
  narrow = false;
  vi.stubGlobal("matchMedia", () => ({
    matches: narrow,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function Menu() {
  const openShortcuts = useOpenShortcuts();
  return (
    <nav aria-label="Emner">
      <a href="/emner/s2">Samfunnsøkonomi</a>
      <button type="button" onClick={openShortcuts}>
        ? Hurtigtaster
      </button>
    </nav>
  );
}

function Content() {
  return <p>{useSideMenuCollapsed() ? "smal" : "bred"}</p>;
}

function App({ withMenu = true }: { withMenu?: boolean }) {
  return (
    <SideMenuProvider>
      <TopBar logoHref="/" start={<MenuButton />} />
      <main>
        {withMenu ? (
          <SideMenu title="Emner">
            <Menu />
          </SideMenu>
        ) : null}
        <Content />
      </main>
    </SideMenuProvider>
  );
}

function menuButton() {
  return screen.getByRole("button", { name: "Meny" });
}

describe("SideMenu", () => {
  it("UX-DR32: bred skjerm viser sidemenyen i siden og ingen menyknapp", () => {
    render(<App />);
    expect(screen.getByRole("navigation", { name: "Emner" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Meny" })).toBeNull();
    expect(screen.getByText("bred")).toBeTruthy();
  });

  it("UX-DR32: utenfor rammen vises barna rett i siden", () => {
    render(
      <SideMenu title="Emner">
        <Menu />
      </SideMenu>,
    );
    expect(screen.getByRole("navigation", { name: "Emner" })).toBeTruthy();
  });

  it("UX-DR32: smal skjerm skjuler sidemenyen bak «Meny» i toppfeltet, til venstre for logoen", () => {
    narrow = true;
    render(<App />);
    expect(screen.queryByRole("navigation", { name: "Emner" })).toBeNull();
    const button = menuButton();
    const header = screen.getByRole("banner");
    expect(header.contains(button)).toBe(true);
    expect(button.compareDocumentPosition(screen.getByRole("link", { name: "Studiekamerat" }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getByText("smal")).toBeTruthy();
  });

  it("UX-DR32: smal skjerm uten sidemeny har ingen menyknapp", () => {
    narrow = true;
    render(<App withMenu={false} />);
    expect(screen.queryByRole("button", { name: "Meny" })).toBeNull();
  });

  it("UX-DR32: «Meny» åpner panelet over innholdet, og Esc lukker det med fokus tilbake på «Meny»", async () => {
    narrow = true;
    render(<App />);
    const button = menuButton();
    button.focus();
    fireEvent.click(button);
    const panel = screen.getByRole("dialog", { name: "Emner" });
    expect(within(panel).getByRole("navigation", { name: "Emner" })).toBeTruthy();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(within(panel).getByRole("button", { name: "Lukk" })).toBeTruthy();
    fireEvent.keyDown(panel, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it("UX-DR32: krysset «Lukk» lukker panelet", () => {
    narrow = true;
    render(<App />);
    fireEvent.click(menuButton());
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Lukk" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("UX-DR32: panelet lukkes når siden byttes", () => {
    narrow = true;
    const { rerender } = render(<App />);
    fireEvent.click(menuButton());
    expect(screen.getByRole("dialog")).toBeTruthy();
    pathname = "/emner/s2";
    rerender(<App />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("UX-DR31: «? Hurtigtaster» i panelet lukker panelet først, og fokus går til «Meny» når dialogen lukkes", async () => {
    narrow = true;
    render(<App />);
    const button = menuButton();
    button.focus();
    fireEvent.click(button);
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "? Hurtigtaster" }));
    const dialogs = screen.getAllByRole("dialog");
    expect(dialogs).toHaveLength(1);
    expect(dialogs[0].getAttribute("aria-labelledby")).toBeTruthy();
    expect(within(dialogs[0]).getByRole("heading", { name: "Hurtigtaster" })).toBeTruthy();
    fireEvent.keyDown(dialogs[0], { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it("UX-DR31: på bred skjerm går fokus tilbake til «? Hurtigtaster»", async () => {
    render(<App />);
    const opener = screen.getByRole("button", { name: "? Hurtigtaster" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Hurtigtaster" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});
