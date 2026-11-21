// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useDocumentTitle } from "./use-document-title";

function Page({ title }: { title: string | null }) {
  useDocumentTitle(title);
  return null;
}

afterEach(() => {
  cleanup();
  document.title = "";
});

describe("useDocumentTitle", () => {
  it("FR-6: setter tittelen og setter den igjen når noe annet overskriver den", async () => {
    document.title = "Studiekamerat";
    render(<Page title="Markedsføring – Studiekamerat" />);
    expect(document.title).toBe("Markedsføring – Studiekamerat");
    document.title = "Studiekamerat";
    await waitFor(() => expect(document.title).toBe("Markedsføring – Studiekamerat"));
  });

  it("FR-6: null rører ikke tittelen, og etter at siden er borte får andre bestemme", async () => {
    document.title = "Dine emner – Studiekamerat";
    const { rerender, unmount } = render(<Page title={null} />);
    expect(document.title).toBe("Dine emner – Studiekamerat");
    rerender(<Page title="Markedsføring – Studiekamerat" />);
    expect(document.title).toBe("Markedsføring – Studiekamerat");
    unmount();
    document.title = "Dine emner – Studiekamerat";
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.title).toBe("Dine emner – Studiekamerat");
  });
});
