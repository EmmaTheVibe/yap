import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/shared/SessionContext";

export const metadata: Metadata = {
  title: "Yapp",
  description: "End-to-end encrypted messaging",
};

export const viewport: Viewport = {
  themeColor: "#111b21",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
