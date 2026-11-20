import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dine emner – Studiekamerat",
};

// The front page (mockup 02): no sidebar, 80 px margin on both sides.
// The subjects arrive in a later epic.
export default function HomePage() {
  return (
    <div className="px-home-margin pt-7 pb-7">
      <h1 className="text-page-title">Dine emner</h1>
    </div>
  );
}
