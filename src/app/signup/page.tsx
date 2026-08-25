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
            <text x="8" y="27" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#0070f3">S</text>
            <text x="40" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#fff">SAP</text>
          </svg>
        </div>
        <div className="sap-top-bar-right">
          <Link href="/login" className="sap-top-link">Already have an account? Log On</Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="sap-login-container">
        {/* Left Panel - Branding */}
        <div className="sap-branding-panel">
          <div className="sap-branding-content">
            <div className="sap-brand-logo">
              <svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="10" width="40" height="40" rx="6" fill="rgba(255,255,255,0.2)" />
                <text x="10" y="38" fontFamily="Arial, sans-serif" fontSize="26" fontWeight="bold" fill="#fff">S</text>
                <text x="50" y="42" fontFamily="Arial, sans-serif" fontSize="32" fontWeight="bold" fill="#fff">SAP</text>
              </svg>
            </div>
            <h1 className="sap-brand-title">Create Your Account</h1>
            <p className="sap-brand-subtitle">Join SAP Enterprise Resource Planning</p>
            
            <div className="sap-features">
              <div className="sap-feature">
                <div className="sap-feature-icon">◈</div>
                <span>Access Business Applications</span>
              </div>
              <div className="sap-feature">
                <div className="sap-feature-icon">◈</div>
                <span>Manage Your Enterprise Data</span>
              </div>
              <div className="sap-feature">
                <div className="sap-feature-icon">◈</div>
                <span>Collaborate Across Teams</span>
              </div>
            </div>
          </div>
          
          <div className="sap-branding-footer">
            <p>© 2026 SAP SE. All rights reserved.</p>
          </div>
        </div>

        {/* Right Panel - Signup Form */}
        <div className="sap-login-panel">
          <div className="sap-login-form-container">
            <div className="sap-login-header">
              <h2>Register</h2>
              <p>Create a new user account</p>
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
                  Email Address
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
                <span className="sap-checkbox-label">
                  By registering, you agree to our <a href="#" className="sap-forgot-link">Terms of Service</a>
                </span>
              </div>
            </form>

            <div className="sap-login-footer">
              <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#555' }}>
                Already have an account? <Link href="/login" className="sap-forgot-link">Log On</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}