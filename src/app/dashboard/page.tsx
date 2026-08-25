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

  const tiles = [
    { icon: "📋", title: "Core Audit Management", desc: "Plan, schedule, and execute quality audits", color: "#e6f2ff" },
    { icon: "⚠️", title: "Non-Conformance & Corrective Action", desc: "Track NCRs, root cause analysis, and CAPA", color: "#fff2e6" },
    { icon: "✅", title: "Compliance Tracking", desc: "Monitor regulatory and internal compliance", color: "#e6ffe6" },
    { icon: "📄", title: "Document Control", desc: "Manage SOPs, policies, and revisions", color: "#f5f0ff" },
    { icon: "🛡️", title: "Risk Management", desc: "Identify, assess, and mitigate risks", color: "#ffe6e6" },
    { icon: "👥", title: "People & Training", desc: "Track training records and certifications", color: "#e6ffff" },
    { icon: "🏭", title: "Supplier/Vendor Quality", desc: "Evaluate and monitor supplier performance", color: "#fffde6" },
    { icon: "⚙️", title: "Operational Add-ons", desc: "Industry-specific modules and extensions", color: "#f0f0f0" },
    { icon: "📊", title: "Reporting & Analytics", desc: "Dashboards, KPIs, and trend analysis", color: "#e6f9e6" },
    { icon: "🔧", title: "System/Admin", desc: "Users, roles, and system configuration", color: "#f5f5f5" },
  ];

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

      {/* Tiles Grid */}
      <div className="sap-dashboard-content">
        <div className="sap-tiles-grid">
          {tiles.map((tile, i) => (
            <div key={i} className="sap-tile" style={{ borderTop: `3px solid ${tile.color.replace('e6', '99c2e6').replace('ff', 'cc9999').replace('f5', 'b3b3b3').replace('f0', 'b3b3b3')}` }}>
              <div className="sap-tile-icon" style={{ background: tile.color }}>
                <span>{tile.icon}</span>
              </div>
              <div className="sap-tile-body">
                <h3>{tile.title}</h3>
                <p>{tile.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}