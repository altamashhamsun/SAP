"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Login() {
  const [client, setClient] = useState("100");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [language, setLanguage] = useState("EN");
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
            <text x="8" y="27" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#0070f3">S</text>
            <text x="40" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#fff">SAP</text>
          </svg>
        </div>
        <div className="sap-top-bar-right">
          <a href="#" className="sap-top-link">Contact Us</a>
          <a href="#" className="sap-top-link">Help</a>
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
            <h1 className="sap-brand-title">SAP Enterprise Resource Planning</h1>
            <p className="sap-brand-subtitle">Sign in to access your business applications</p>
            
            <div className="sap-features">
              <div className="sap-feature">
                <div className="sap-feature-icon">◈</div>
                <span>Integrated Business Processes</span>
              </div>
              <div className="sap-feature">
                <div className="sap-feature-icon">◈</div>
                <span>Real-time Analytics</span>
              </div>
              <div className="sap-feature">
                <div className="sap-feature-icon">◈</div>
                <span>Enterprise Security</span>
              </div>
            </div>
          </div>
          
          <div className="sap-branding-footer">
            <p>© 2026 SAP SE. All rights reserved.</p>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="sap-login-panel">
          <div className="sap-login-form-container">
            <div className="sap-login-header">
              <h2>Log On</h2>
              <p>Enter your credentials to access the system</p>
            </div>

            <form onSubmit={handleLogin} className="sap-login-form">
              {error && (
                <div className="sap-error-message">
                  <span className="sap-error-icon">⚠</span>
                  {error}
                </div>
              )}

              <div className="sap-field-group">
                <label htmlFor="client" className="sap-field-label">
                  Client
                </label>
                <input
                  id="client"
                  type="text"
                  className="sap-field-input"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="100"
                />
              </div>

              <div className="sap-field-group">
                <label htmlFor="username" className="sap-field-label">
                  User
                </label>
                <input
                  id="username"
                  type="text"
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

              <div className="sap-field-group">
                <label htmlFor="language" className="sap-field-label">
                  Logon Language
                </label>
                <select
                  id="language"
                  className="sap-field-input sap-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="EN">English</option>
                  <option value="DE">Deutsch</option>
                  <option value="FR">Français</option>
                  <option value="ES">Español</option>
                  <option value="AR">العربية</option>
                  <option value="ZH">中文</option>
                  <option value="JA">日本語</option>
                </select>
              </div>

              <button
                type="submit"
                className="sap-login-button"
                disabled={loading}
              >
                {loading ? (
                  <span className="sap-loading">
                    <span className="sap-loading-spinner"></span>
                    Authenticating...
                  </span>
                ) : (
                  "Log On"
                )}
              </button>

              <div className="sap-login-options">
                <label className="sap-checkbox-label">
                  <input type="checkbox" className="sap-checkbox" />
                  <span>Save password</span>
                </label>
                <a href="#" className="sap-forgot-link">
                  Forgot password?
                </a>
              </div>
            </form>

            <div className="sap-login-footer">
              <div className="sap-footer-links">
                <a href="#">Privacy Policy</a>
                <span className="sap-footer-divider">|</span>
                <a href="#">Terms of Use</a>
                <span className="sap-footer-divider">|</span>
                <a href="#">Legal</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}