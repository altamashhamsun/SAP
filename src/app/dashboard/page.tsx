"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import dynamic from "next/dynamic";

const Tile3D = dynamic(() => import("@/components/Tile3D"), { ssr: false });

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
    { icon: "📋", title: "Core Audit Management", desc: "Plan, schedule, and execute quality audits", color: "#4a90d9" },
    { icon: "⚠️", title: "Non-Conformance & Corrective Action", desc: "Track NCRs, root cause analysis, and CAPA", color: "#d94a4a" },
    { icon: "✅", title: "Compliance Tracking", desc: "Monitor regulatory and internal compliance", color: "#4ad94a" },
    { icon: "📄", title: "Document Control", desc: "Manage SOPs, policies, and revisions", color: "#9b4ad9" },
    { icon: "🛡️", title: "Risk Management", desc: "Identify, assess, and mitigate risks", color: "#d97a4a" },
    { icon: "👥", title: "People & Training", desc: "Track training records and certifications", color: "#4ad9d9" },
    { icon: "🏭", title: "Supplier/Vendor Quality", desc: "Evaluate and monitor supplier performance", color: "#d9d94a" },
    { icon: "⚙️", title: "Operational Add-ons", desc: "Industry-specific modules and extensions", color: "#808080" },
    { icon: "📊", title: "Reporting & Analytics", desc: "Dashboards, KPIs, and trend analysis", color: "#4ad97a" },
    { icon: "🔧", title: "System/Admin", desc: "Users, roles, and system configuration", color: "#6b7b8d" },
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
            <Tile3D
              key={i}
              emoji={tile.icon}
              title={tile.title}
              desc={tile.desc}
              color={tile.color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}