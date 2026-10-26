import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reverse-CUP | Direzione Sanitaria ASL",
  description: "Sistema di Yield Management per liste d'attesa SSN",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}