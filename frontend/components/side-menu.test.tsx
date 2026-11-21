// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MenuButton, SideMenu, SideMenuProvider, useOpenShortcuts, useSideMenuCollapsed } from "./side-menu";
import { TopBar } from "./top-bar";

let pathname = "/emner/s1";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));

let narrow = false;
const mediaListeners = new Set<() => void>();

// Changes the screen width as matchMedia sees it, and tells the listeners.
function setNarrow(value: boolean) {
  narrow = value;
  act(() => mediaListeners.forEach((listener) => listener()));
}

beforeEach(() => {
  pathname = "/emner/s1";
  narrow = false;
  mediaListeners.clear();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return narrow;
    },
    addEventListener: (_: string, listener: () => void) => mediaListeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => mediaListeners.delete(listener),
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
  it("UX-DR10: bred skjerm viser sidemenyen i siden og ingen menyknapp", () => {
    render(<App />);
    expect(screen.getByRole("navigation", { name: "Emner" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Meny" })).toBeNull();
    expect(screen.getByText("bred")).toBeTruthy();
  });

  it("UX-DR10: utenfor rammen vises barna rett i siden", () => {
    render(
      <SideMenu title="Emner">
        <Menu />
      </SideMenu>,
    );
    expect(screen.getByRole("navigation", { name: "Emner" })).toBeTruthy();
  });

  it("UX-DR10: smal skjerm skjuler sidemenyen bak «Meny» i toppfeltet, til venstre for logoen", () => {
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

  it("UX-DR10: smal skjerm uten sidemeny har ingen menyknapp", () => {
    narrow = true;
    render(<App withMenu={false} />);
    expect(screen.queryByRole("button", { name: "Meny" })).toBeNull();
  });

  it("UX-DR10: «Meny» åpner panelet over innholdet, og Esc lukker det med fokus tilbake på «Meny»", async () => {
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

  it("UX-DR10: krysset «Lukk» lukker panelet", () => {
    narrow = true;
    render(<App />);
    fireEvent.click(menuButton());
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Lukk" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("UX-DR10: klikk på sløret lukker panelet, klikk i panelet gjør det ikke", () => {
    narrow = true;
    render(<App />);
    fireEvent.click(menuButton());
    const panel = screen.getByRole("dialog");
    fireEvent.click(panel);
    expect(screen.getByRole("dialog")).toBeTruthy();
    fireEvent.click(document.querySelector("[data-slot='sheet-overlay']")!);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("UX-DR10: panelet lukkes når skjermen blir bred, og er lukket når den blir smal igjen", () => {
    narrow = true;
    render(<App />);
    fireEvent.click(menuButton());
    expect(screen.getByRole("dialog")).toBeTruthy();
    setNarrow(false);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("navigation", { name: "Emner" })).toBeTruthy();
    setNarrow(true);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(menuButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("UX-DR10: panelet lukkes når siden byttes", () => {
    narrow = true;
    const { rerender } = render(<App />);
    fireEvent.click(menuButton());
    expect(screen.getByRole("dialog")).toBeTruthy();
    pathname = "/emner/s2";
    rerender(<App />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("UX-DR10, UX-DR26: «? Hurtigtaster» i panelet lukker panelet først, og fokus går til «Meny» når dialogen lukkes", async () => {
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

  it("UX-DR26: på bred skjerm går fokus tilbake til «? Hurtigtaster»", async () => {
    render(<App />);
    const opener = screen.getByRole("button", { name: "? Hurtigtaster" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Hurtigtaster" });
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(document.activeElement).toBe(opener));
  });
});
