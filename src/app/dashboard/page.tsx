"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="sap-login-page">
        <div className="sap-top-bar">
          <div className="sap-top-bar-left">
            <svg className="sap-logo" viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="5" width="30" height="30" rx="4" fill="#fff" />
              <text x="8" y="27" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#0070f3">Q</text>
              <text x="40" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#fff">QAC</text>
            </svg>
          </div>
        </div>
        <div className="sap-login-center">
          <div className="sap-loading-spinner" style={{ width: 40, height: 40, borderWidth: 3 }}></div>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  const displayName = user.email?.split("@")[0] || "User";
  const loginTime = user.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "N/A";

  return (
    <div className="sap-dashboard">
      {/* Top Bar */}
      <div className="sap-top-bar" style={{ justifyContent: "space-between" }}>
        <div className="sap-top-bar-left">
          <svg className="sap-logo" viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="5" width="30" height="30" rx="4" fill="#fff" />
            <text x="8" y="27" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#0070f3">Q</text>
            <text x="40" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#fff">QAC</text>
          </svg>
        </div>
        <div className="sap-top-bar-right">
          <span className="sap-top-user">{user.email}</span>
          <button onClick={handleLogout} className="sap-logout-btn">Sign Out</button>
        </div>
      </div>

      {/* Main Content */}
      <div className="sap-dashboard-content">
        {/* Welcome Banner */}
        <div className="sap-welcome-banner">
          <div className="sap-welcome-text">
            <h1>Welcome, {displayName}</h1>
            <p>Quality Audit and Compliance Portal</p>
          </div>
          <div className="sap-welcome-time">
            <span>Last login: {loginTime}</span>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="sap-dashboard-grid">
          <div className="sap-dashboard-card">
            <div className="sap-card-icon" style={{ background: "#e6f2ff" }}>
              <span style={{ color: "#0070f3", fontSize: "1.5rem" }}>◈</span>
            </div>
            <h3>Audits</h3>
            <p>Manage and track quality audits</p>
          </div>

          <div className="sap-dashboard-card">
            <div className="sap-card-icon" style={{ background: "#e6ffe6" }}>
              <span style={{ color: "#107c10", fontSize: "1.5rem" }}>◈</span>
            </div>
            <h3>Compliance</h3>
            <p>Monitor compliance status</p>
          </div>

          <div className="sap-dashboard-card">
            <div className="sap-card-icon" style={{ background: "#fff2e6" }}>
              <span style={{ color: "#e97025", fontSize: "1.5rem" }}>◈</span>
            </div>
            <h3>Reports</h3>
            <p>View and generate reports</p>
          </div>

          <div className="sap-dashboard-card">
            <div className="sap-card-icon" style={{ background: "#f5f5f5" }}>
              <span style={{ color: "#555", fontSize: "1.5rem" }}>◈</span>
            </div>
            <h3>Settings</h3>
            <p>System configuration</p>
          </div>
        </div>
      </div>
    </div>
  );
}