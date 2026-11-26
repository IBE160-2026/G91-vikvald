// Types for the content module's summary (story 9.2), mirroring
// backend/app/modules/content/schemas.py (SummaryOut).

export type SummarySource = {
  file_id: string;
  // The file's original name, shown as «merkevare-notater.pdf, side 4».
  file_name: string;
  // The PDF's own page number, starting at 1.
  page_no: number;
};

export type SummaryPoint = {
  id: string;
  // Generated text, shown as plain text.
  text: string;
  // «Inneholder formel – sjekk mot kilden» above the source (FR-41).
  formula_flag: boolean;
  source: SummarySource;
};

export type SummaryTheme = {
  title: string;
  // In stored order.
  points: SummaryPoint[];
};

export type SummaryFile = {
  file_id: string;
  file_name: string;
  page_count: number;
};

export type Summary = {
  // ISO 8601 time in UTC.
  created_at: string;
  point_count: number;
  // In the order each theme first shows up.
  themes: SummaryTheme[];
  // The files the points come from, in upload order.
  files: SummaryFile[];
};
