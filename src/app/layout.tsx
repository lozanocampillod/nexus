import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SearchForm from "@/components/search-form";
import { ThemeProvider } from "@/providers/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nexus",
  description: "Nexus: etymology tree generator from Wiktionary",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`flex flex-col h-full ${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header className="flex justify-between items-center py-4 px-8 bg-background border-b border-border sticky top-0 z-10">
            <h1 className="text-lg md:text-xl font-semibold">Nexus</h1>
            <ThemeToggle />
          </header>

          <main className="flex-1 p-4 md:p-8">
            <div className="flex flex-col h-full gap-4 items-center justify-center">
              <Card className="lg:w-1/2 w-full">
                <CardHeader>
                  <CardTitle className="text-center">
                    Search Wiktionary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SearchForm />
                </CardContent>
              </Card>
              {children}
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
