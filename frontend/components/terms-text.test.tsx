// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { configQueryOptions } from "@/lib/config";

import { TermsText } from "./terms-text";

afterEach(cleanup);

function renderWith(demoMode: boolean) {
  const client = new QueryClient();
  client.setQueryData(configQueryOptions.queryKey, {
    demo_mode: demoMode,
    feature_mnemonics: true,
    feature_freetext: true,
    feature_summary: true,
  });
  render(
    <QueryClientProvider client={client}>
      <TermsText />
    </QueryClientProvider>,
  );
}

const RESPONSIBILITY = [
  "Du er ansvarlig for materialet du laster opp.",
  "Last bare opp egne notater eller materiale du har rett til å bruke.",
  "Ikke last opp personopplysninger, for eksempel navn på medstudenter.",
];
const WHERE_SENT = [
  "Notatene sendes til språkmodellen hos Google, med behandling i EU, for å lage øvingsinnholdet.",
  "Google kan logge forespørslene en periode for å oppdage misbruk.",
];

describe("vilkårsteksten", () => {
  it.each([true, false])("NFR-6: den ordrette teksten står likt (demomodus: %s), overlinjene er h3 og punktene lister", (demo) => {
    renderWith(demo);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);
    expect(headings).toEqual(["DITT ANSVAR", "HVOR NOTATENE SENDES"]);
    const lists = screen.getAllByRole("list");
    expect(within(lists[0]).getAllByRole("listitem").map((item) => item.textContent)).toEqual(RESPONSIBILITY);
    expect(within(lists[1]).getAllByRole("listitem").map((item) => item.textContent)).toEqual(WHERE_SENT);
    // No checkbox: the dialog adds it, the account page (2.7) does not.
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("NFR-6: i demomodus står «I demomodus sendes ingenting ut.» som eget avsnitt under punktene", async () => {
    renderWith(true);
    const sentence = await screen.findByText("I demomodus sendes ingenting ut.");
    expect(sentence.tagName).toBe("P");
    expect(sentence.closest("li")).toBeNull();
    const lastList = screen.getAllByRole("list")[1];
    expect(lastList.compareDocumentPosition(sentence) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("NFR-6: utenfor demomodus står ikke demosetningen", async () => {
    renderWith(false);
    await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(5));
    expect(screen.queryByText("I demomodus sendes ingenting ut.")).toBeNull();
  });
});
