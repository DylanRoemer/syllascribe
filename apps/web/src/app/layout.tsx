import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Syllascribe",
  description:
    "Upload a course syllabus, extract key dates, review and edit, then export as .ics calendar.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${lora.variable}`}>
      <body className="min-h-screen antialiased font-body bg-surface-50 text-surface-900 dark:bg-surface-900 dark:text-surface-100">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="sticky top-0 z-40 border-b border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-900/80 backdrop-blur-md">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 py-3.5 flex items-center justify-between">
              <a
                href="/"
                className="flex items-center gap-2.5 group"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white text-sm font-bold">
                  S
                </div>
                <span className="text-lg font-semibold tracking-tight text-surface-900 dark:text-surface-100">
                  Syllascribe
                </span>
              </a>
              <div className="flex items-center gap-3">
                <span className="hidden sm:block text-sm text-surface-700 dark:text-surface-400">
                  Syllabus &rarr; Calendar
                </span>
                <ThemeToggle />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
            {children}
          </main>
          <Toaster
            position="bottom-right"
            toastOptions={{
              className: "font-body",
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
