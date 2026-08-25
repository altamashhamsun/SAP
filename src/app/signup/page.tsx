"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Registration successful! Please check your email for the confirmation link.");
    setLoading(false);
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

      {/* Centered Signup */}
      <div className="sap-login-center">
        <div className="sap-login-card">
          <div className="sap-login-header">
            <div className="sap-brand-logo-center">
              <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="60" height="60" rx="12" fill="var(--sap-blue)" />
                <text x="14" y="42" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="#fff">Q</text>
              </svg>
            </div>
            <h1>Create Account</h1>
            <p>Quality Audit and Compliance</p>
          </div>

          <form onSubmit={handleSignup} className="sap-login-form">
            {error && (
              <div className="sap-error-message">
                <span className="sap-error-icon">⚠</span>
                {error}
              </div>
            )}

            {success && (
              <div className="sap-success-message">
                <span className="sap-success-icon">✓</span>
                {success}
              </div>
            )}

            <div className="sap-field-group">
              <label htmlFor="email" className="sap-field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="sap-field-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                required
                autoComplete="email"
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
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  autoComplete="new-password"
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
                  Creating Account...
                </span>
              ) : (
                "Register"
              )}
            </button>

            <div className="sap-login-options">
              <span style={{ fontSize: '0.85rem', color: '#555' }}>
                By registering, you agree to our <a href="#" className="sap-forgot-link">Terms</a>
              </span>
            </div>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: '#555' }}>
            Already have an account? <Link href="/login" className="sap-forgot-link">Sign In</Link>
          </div>
        </div>

        <div className="sap-center-footer">
          <p>© 2026 QAC Portal. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}