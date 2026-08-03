import type { ReactNode } from "react";
import Link from "next/link";

export default function OfflinePage(): ReactNode {
  return (
    <html lang="ar" dir="rtl">
      <body style={styles.body}>
        <div style={styles.container}>
          <div style={styles.icon}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </div>
          <h1 style={styles.title}>لا يوجد اتصال بالإنترنت</h1>
          <p style={styles.description}>
            يرجى التحقق من اتصالك بالإنترنت وحاول مرة أخرى
          </p>
          <Link href="/" style={styles.button}>
            حاول مرة أخرى
          </Link>
        </div>
      </body>
    </html>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    margin: 0,
    padding: 0,
    backgroundColor: "#0f0f0f",
    color: "#e5e5e5",
    fontFamily: "system-ui, -apple-system, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
  },
  container: {
    textAlign: "center",
    padding: "2rem",
    maxWidth: "400px",
  },
  icon: {
    marginBottom: "1.5rem",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 700,
    margin: "0 0 0.75rem",
  },
  description: {
    fontSize: "1rem",
    color: "#a3a3a3",
    margin: "0 0 2rem",
    lineHeight: 1.6,
  },
  button: {
    display: "inline-block",
    padding: "0.75rem 2rem",
    backgroundColor: "#6366f1",
    color: "#fff",
    borderRadius: "0.75rem",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "1rem",
  },
};
