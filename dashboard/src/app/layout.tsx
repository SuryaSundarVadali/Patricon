import type { ReactNode } from "react";

import { DashboardProviders } from "./components/DashboardProviders";
import "./app.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DashboardProviders>{children}</DashboardProviders>
      </body>
    </html>
  );
}
