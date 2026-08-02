import "./globals.css";

export const metadata = {
  title: "Free AI Gateway Dashboard",
  description: "Endpoint OpenAI-compatible terpadu di depan provider LLM gratis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
