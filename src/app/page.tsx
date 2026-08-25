import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="sap-login-page">
      {/* Top Bar */}
      <div className="sap-top-bar">
        <div className="sap-top-bar-left">
          <svg className="sap-logo" viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="5" width="30" height="30" rx="4" fill="#fff" />
            <text x="8" y="27" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#0070f3">Q</text>
            <text x="40" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#fff">QAC</text>
          </svg>
        </div>
      </div>

      {/* Center Content */}
      <div className="sap-login-center">
        <div className="sap-login-card">
          <div className="sap-login-header">
            <div className="sap-brand-logo-center">
              <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="60" height="60" rx="12" fill="var(--sap-blue)" />
                <text x="14" y="42" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="#fff">Q</text>
              </svg>
            </div>
            <h1>Quality Audit and Compliance</h1>
            <p>QAC Portal</p>
          </div>

          {user ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#555', marginBottom: '1.5rem' }}>Welcome back, {user.email}</p>
              <Link href="/dashboard">
                <button className="sap-login-button">Go to Dashboard</button>
              </Link>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#555', marginBottom: '1.5rem' }}>Sign in to access your audit and compliance tools</p>
              <Link href="/login">
                <button className="sap-login-button" style={{ marginBottom: '1rem' }}>Sign In</button>
              </Link>
              <p style={{ fontSize: '0.9rem', color: '#555' }}>
                Don&apos;t have an account? <Link href="/signup" className="sap-forgot-link">Register</Link>
              </p>
            </div>
          )}
        </div>

        <div className="sap-center-footer">
          <p>© 2026 QAC Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}