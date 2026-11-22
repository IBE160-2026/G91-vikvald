"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useNarrowScreen } from "@/lib/use-narrow-screen";

import { iconProps } from "./icon";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { Sheet, SheetContent, SheetTitle } from "./ui/sheet";

// The frame for the side menu and the session panel (story 3.4, EXPERIENCE.md
// "Skjermstørrelse og plattform"). The menu button stands in the top bar (in
// RequireLogin) while the menu is drawn by the page, so a small context lets
// the page say "I have a side menu" and the top bar show the button.
//
// Wide screen: <SideMenu> shows its children in the page, as before. Narrow
// screen (≤ 768 px or 200 % text, lib/use-narrow-screen.ts): the children are
// hidden behind the button «Meny» in the top bar, and shown in a panel from the
// left over the content (shadcn sheet). The panel closes with Esc, the cross
// «Lukk», a click on the scrim and when the page changes; focus goes back to
// the menu button.
//
// The provider also holds the one shortcut dialog. openShortcuts() remembers
// where focus was, so it goes back there when the dialog closes. Opened from
// the panel, the panel closes first (dialogs are never stacked) and focus goes
// to the menu button afterwards.

type SideMenuContext = {
  narrow: boolean;
  hasMenu: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  register: () => () => void;
  openShortcuts: () => void;
  menuButtonRef: React.RefObject<HTMLButtonElement | null>;
  // Set while the panel closes to hand over to the shortcut dialog.
  handingOver: React.RefObject<boolean>;
  // Where focus goes when the panel closes, instead of the menu button.
  focusAfterClose: React.RefObject<(() => HTMLElement | null) | null>;
};

const Context = createContext<SideMenuContext | null>(null);

export function SideMenuProvider({ children }: { children: ReactNode }) {
  const narrow = useNarrowScreen();
  const pathname = usePathname();
  const [menus, setMenus] = useState(0);
  const [open, setOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const handingOver = useRef(false);
  const focusAfterClose = useRef<(() => HTMLElement | null) | null>(null);

  // The panel closes when the page changes (a link in it was followed) or the
  // screen gets wide.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  if (!narrow && open) setOpen(false);

  const register = useCallback(() => {
    setMenus((count) => count + 1);
    return () => setMenus((count) => count - 1);
  }, []);

  const openShortcuts = useCallback(() => {
    if (open) {
      handingOver.current = true;
      returnTo.current = menuButtonRef.current;
      setOpen(false);
    } else {
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    setShortcutsOpen(true);
  }, [open]);

  const value = useMemo(
    () => ({
      narrow,
      hasMenu: menus > 0,
      open,
      setOpen,
      register,
      openShortcuts,
      menuButtonRef,
      handingOver,
      focusAfterClose,
    }),
    [narrow, menus, open, register, openShortcuts],
  );

  return (
    <Context.Provider value={value}>
      {children}
      <ShortcutsDialog
        open={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        returnFocus={() => {
          const target = returnTo.current;
          returnTo.current = null;
          return target && target.isConnected && target !== document.body ? target : null;
        }}
      />
    </Context.Provider>
  );
}

// Opens the shortcut dialog (from «? Hurtigtaster» or the key «?»). Does
// nothing outside the provider.
export function useOpenShortcuts(): () => void {
  const context = useContext(Context);
  return context?.openShortcuts ?? noop;
}

// True when the side menu is behind the menu button (narrow screen).
export function useSideMenuCollapsed(): boolean {
  const context = useContext(Context);
  return context?.narrow ?? false;
}

// Closes the panel on a narrow screen (if it is open), with focus going to
// `focusTarget` instead of the menu button. Used when the session ends from
// «Avslutt økt» inside the panel and the result page takes its place (story 3.5).
export function useCloseSideMenu(): (focusTarget: () => HTMLElement | null) => void {
  const context = useContext(Context);
  return useCallback(
    (focusTarget: () => HTMLElement | null) => {
      if (!context || !context.open) return;
      context.focusAfterClose.current = focusTarget;
      context.setOpen(false);
    },
    [context],
  );
}

function noop() {}

// The side menu or session panel of a page. `title` names the panel on a
// narrow screen. Outside the provider the children are simply shown.
export function SideMenu({ title, children }: { title: string; children: ReactNode }) {
  const context = useContext(Context);
  const register = context?.register;
  useEffect(() => register?.(), [register]);

  if (!context || !context.narrow) return <>{children}</>;

  const { open, setOpen, menuButtonRef, handingOver, focusAfterClose } = context;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        aria-describedby={undefined}
        onScrimClick={() => setOpen(false)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          // Handing over to the shortcut dialog: it takes focus itself.
          const target = focusAfterClose.current?.() ?? null;
          focusAfterClose.current = null;
          if (handingOver.current) handingOver.current = false;
          else if (target) target.focus();
          else menuButtonRef.current?.focus();
        }}
      >
        {/* Names the panel; a span, so it adds no heading of its own. */}
        <SheetTitle asChild>
          <span className="sr-only">{title}</span>
        </SheetTitle>
        <div className="flex min-h-full flex-1 flex-col *:flex-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

// The button «Meny» in the top bar, left of the logo: only on a narrow screen
// and only on a page with a side menu.
export function MenuButton() {
  const context = useContext(Context);
  if (!context || !context.narrow || !context.hasMenu) return null;
  const { open, setOpen, menuButtonRef } = context;
  return (
    <button
      ref={menuButtonRef}
      type="button"
      aria-label="Meny"
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => setOpen(true)}
      className="-ml-2 inline-flex size-[40px] cursor-pointer items-center justify-center rounded-md text-ink hover:bg-row-hover"
    >
      <Menu {...iconProps} size={20} />
    </button>
  );
}
