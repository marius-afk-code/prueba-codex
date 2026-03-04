import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata = { title: "ScoutFlow MVP" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body>
        <div className="flex">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
