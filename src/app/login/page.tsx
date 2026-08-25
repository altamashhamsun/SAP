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
    <div className="erp95-page">
      {/* Desktop Background */}
      <div className="erp95-desktop">
        {/* Top Menu Bar */}
        <div className="erp95-menubar">
          <span className="erp95-menu-item"><u>S</u>ystem</span>
          <span className="erp95-menu-item"><u>M</u>essage</span>
          <span className="erp95-menu-item"><u>H</u>elp</span>
        </div>

        {/* Window */}
        <div className="erp95-window">
          {/* Title Bar */}
          <div className="erp95-titlebar">
            <div className="erp95-titlebar-left">
              <div className="erp95-titlebar-icon">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <rect x="1" y="1" width="14" height="14" fill="#000080" rx="1"/>
                  <text x="4" y="12" fontFamily="Arial" fontSize="11" fontWeight="bold" fill="#fff">Q</text>
                </svg>
              </div>
              <span>QAC Portal - Log On</span>
            </div>
            <div className="erp95-titlebar-buttons">
              <button className="erp95-title-btn" aria-label="Minimize">_</button>
              <button className="erp95-title-btn" aria-label="Maximize">□</button>
              <button className="erp95-title-btn erp95-close" aria-label="Close">X</button>
            </div>
          </div>

          {/* Window Body */}
          <div className="erp95-window-body">
            {/* Toolbar */}
            <div className="erp95-toolbar">
              <div className="erp95-toolbar-btn" title="Enter">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <rect x="0" y="0" width="16" height="16" fill="#008000"/>
                  <text x="3" y="12" fontFamily="Arial" fontSize="11" fontWeight="bold" fill="#fff">▶</text>
                </svg>
                <span>Enter</span>
              </div>
              <div className="erp95-toolbar-separator"></div>
              <div className="erp95-toolbar-btn" title="Help">
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <rect x="0" y="0" width="16" height="16" fill="#808080"/>
                  <text x="3" y="12" fontFamily="Arial" fontSize="11" fontWeight="bold" fill="#fff">?</text>
                </svg>
                <span>Help</span>
              </div>
            </div>

            {/* Content Area */}
            <div className="erp95-content">
              {/* Logo Area */}
              <div className="erp95-logo-area">
                <div className="erp95-logo-box">
                  <div className="erp95-logo-icon">
                    <svg width="48" height="48" viewBox="0 0 48 48">
                      <rect x="2" y="2" width="44" height="44" fill="#000080" stroke="#000" strokeWidth="2"/>
                      <text x="10" y="36" fontFamily="Arial" fontSize="32" fontWeight="bold" fill="#fff">Q</text>
                    </svg>
                  </div>
                  <div className="erp95-logo-text">
                    <div className="erp95-logo-title">Quality Audit &amp; Compliance</div>
                    <div className="erp95-logo-subtitle">QAC Enterprise System v3.20</div>
                  </div>
                </div>
              </div>

              {/* Login Form */}
              <form onSubmit={handleLogin} className="erp95-form">
                {error && (
                  <div className="erp95-error">
                    <span className="erp95-error-icon">⛔</span>
                    <span>{error}</span>
                  </div>
                )}

                <table className="erp95-form-table">
                  <tbody>
                    <tr>
                      <td className="erp95-label">Client:</td>
                      <td>
                        <div className="erp95-field-static">100</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="erp95-label">User:</td>
                      <td>
                        <input
                          type="text"
                          className="erp95-input"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder=""
                          required
                          autoComplete="username"
                          autoFocus
                        />
                      </td>
                    </tr>
                    <tr>
                      <td className="erp95-label">Password:</td>
                      <td>
                        <div className="erp95-password-wrap">
                          <input
                            type={showPassword ? "text" : "password"}
                            className="erp95-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder=""
                            required
                            autoComplete="current-password"
                          />
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="erp95-label">Language:</td>
                      <td>
                        <select className="erp95-select">
                          <option value="EN">English</option>
                          <option value="DE">Deutsch</option>
                        </select>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="erp95-buttons">
                  <button type="submit" className="erp95-btn erp95-btn-primary" disabled={loading}>
                    {loading ? "Connecting..." : "Log On  ⏎"}
                  </button>
                  <button type="button" className="erp95-btn">
                    Cancel
                  </button>
                  <button type="button" className="erp95-btn">
                    Help  <span className="erp95-fkey">F1</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Status Bar */}
            <div className="erp95-statusbar">
              <div className="erp95-statusbar-section">
                {loading ? "Authenticating..." : "Ready"}
              </div>
              <div className="erp95-statusbar-section erp95-statusbar-right">
                <span className="erp95-status-dot"></span>
                <span>Connected to QAC Server</span>
              </div>
            </div>
          </div>
        </div>

        {/* Taskbar */}
        <div className="erp95-taskbar">
          <button className="erp95-start-btn">
            <svg width="16" height="16" viewBox="0 0 16 16">
              <rect x="1" y="1" width="6" height="6" fill="#FF0000"/>
              <rect x="9" y="1" width="6" height="6" fill="#00FF00"/>
              <rect x="1" y="9" width="6" height="6" fill="#0000FF"/>
              <rect x="9" y="9" width="6" height="6" fill="#FFFF00"/>
            </svg>
            <span>Start</span>
          </button>
          <div className="erp95-taskbar-item erp95-taskbar-active">
            <svg width="14" height="14" viewBox="0 0 16 16">
              <rect x="1" y="1" width="14" height="14" fill="#000080" rx="1"/>
              <text x="4" y="12" fontFamily="Arial" fontSize="11" fontWeight="bold" fill="#fff">Q</text>
            </svg>
            <span>QAC Log On</span>
          </div>
          <div className="erp95-taskbar-clock">
            <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}