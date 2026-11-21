// A tiny PDF builder for the end-to-end tests, so no real notes or third-party
// files are needed. It writes a minimal PDF by hand: Helvetica, one line of text
// per page, and a correct cross-reference table. To make a file of an exact
// size, an extra unused stream object is filled with spaces.

type PdfOptions = {
  // One line of text per page (ASCII only). An empty string gives an empty page.
  pages: string[];
  // The exact size of the whole file in bytes. Leave out for the smallest file.
  totalBytes?: number;
};

function escapeText(text: string): string {
  return text.replace(/[\\()]/g, (char) => `\\${char}`);
}

function build(pages: string[], padding: number): Buffer {
  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 4 + index * 2);
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`);
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  pages.forEach((text, index) => {
    const contentId = pageIds[index] + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
        `/Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    const stream = text ? `BT /F1 14 Tf 72 770 Td (${escapeText(text)}) Tj ET` : "";
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  if (padding > 0) {
    objects.push(`<< /Length ${padding} >>\nstream\n${" ".repeat(padding)}\nendstream`);
  }

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(body.length);
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  // Only ASCII is written, so one character is one byte.
  return Buffer.from(body, "latin1");
}

export function makePdf({ pages, totalBytes }: PdfOptions): Buffer {
  const smallest = build(pages, 0);
  if (totalBytes === undefined) return smallest;
  // The padding object adds its own bytes around the spaces; guess, then adjust
  // until the total is exact (the digits in /Length can change the size).
  let padding = Math.max(1, totalBytes - smallest.length - 64);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const size = build(pages, padding).length;
    if (size === totalBytes) return build(pages, padding);
    padding += totalBytes - size;
    if (padding < 1) break;
  }
  throw new Error(`Could not make a PDF of exactly ${totalBytes} bytes`);
}
