"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

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

      {/* Centered Login */}
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

          <form onSubmit={handleLogin} className="sap-login-form">
            {error && (
              <div className="sap-error-message">
                <span className="sap-error-icon">⚠</span>
                {error}
              </div>
            )}

            <div className="sap-field-group">
              <label htmlFor="username" className="sap-field-label">
                Email
              </label>
              <input
                id="username"
                type="email"
                className="sap-field-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your email"
                required
                autoComplete="username"
              />
            </div>

            <div className="sap-field-group">
              <label htmlFor="password" className="sap-field-label">
                Password
              </label>
              <div className="sap-password-wrapper">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="sap-field-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="sap-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? "◉" : "○"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="sap-login-button"
              disabled={loading}
            >
              {loading ? (
                <span className="sap-loading">
                  <span className="sap-loading-spinner"></span>
                  Signing in...
                </span>
              ) : (
                "Sign In"
              )}
            </button>

            <div className="sap-login-options">
              <a href="#" className="sap-forgot-link">
                Forgot password?
              </a>
            </div>
          </form>
        </div>

        <div className="sap-center-footer">
          <p>© 2026 QAC Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}