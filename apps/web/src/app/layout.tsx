import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Syllascribe",
  description:
    "Upload a course syllabus, extract key dates, review and edit, then export as .ics calendar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight text-indigo-600">
              Syllascribe
            </a>
            <span className="text-sm text-gray-500">
              Syllabus &rarr; Calendar
            </span>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
