import type { Metadata } from "next";
import { ForsetiChatbot } from "@/components/forseti-chatbot";
import { LOGIN_USERNAME, hasValidSession } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Contabilidad Forseti",
  description: "Dashboard privado de contabilidad Forseti",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/faviconforseti.jpg",
        type: "image/jpeg",
      },
    ],
    shortcut: "/favicon.ico",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authenticated = await hasValidSession();

  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <ForsetiChatbot authenticated={authenticated} userName={authenticated ? LOGIN_USERNAME : undefined} />
      </body>
    </html>
  );
}
