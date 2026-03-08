import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meta Ads | AI Dashboard",
  description: "AI-powered Meta Ads management and creative generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="layout-container">
          <aside className="sidebar glass-panel">
            <div className="logo-section">
              <h1 className="gradient-text">MetaAI</h1>
            </div>
            <nav className="nav-menu">
              <div className="nav-item active">Dashboard</div>
              <div className="nav-item">Campaigns</div>
              <div className="nav-item">Creatives</div>
              <div className="nav-item">Insights</div>
            </nav>
            <div className="sidebar-footer">
              <div className="user-profile">
                <div className="avatar">AD</div>
                <span>Ad Manager</span>
              </div>
            </div>
          </aside>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
