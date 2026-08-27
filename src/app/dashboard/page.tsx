"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

function QacIcon({ type }: { type: string }) {
  const icons: Record<string, React.JSX.Element> = {
    audit: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="2" width="20" height="24" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <line x1="8" y1="8" x2="20" y2="8" stroke="#0070f3" strokeWidth="1.5"/>
        <line x1="8" y1="13" x2="20" y2="13" stroke="#0070f3" strokeWidth="1.5"/>
        <line x1="8" y1="18" x2="16" y2="18" stroke="#0070f3" strokeWidth="1.5"/>
        <circle cx="21" cy="21" r="5" fill="#0070f3"/>
        <path d="M19 21l1.5 1.5L23 19.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    ncr: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 3L25 23H3L14 3Z" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <line x1="14" y1="11" x2="14" y2="17" stroke="#0070f3" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="14" cy="20" r="1" fill="#0070f3"/>
      </svg>
    ),
    compliance: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="22" rx="4" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M8 14l4 4 8-8" stroke="#0070f3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    document: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M6 2h10l6 6v18a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M16 2v6h6" stroke="#0070f3" strokeWidth="2"/>
        <line x1="8" y1="14" x2="20" y2="14" stroke="#0070f3" strokeWidth="1.5"/>
        <line x1="8" y1="18" x2="16" y2="18" stroke="#0070f3" strokeWidth="1.5"/>
      </svg>
    ),
    risk: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="11" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M14 7v8" stroke="#0070f3" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="14" cy="19.5" r="1.25" fill="#0070f3"/>
      </svg>
    ),
    people: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="10" cy="8" r="4" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M2 24c0-4 3.5-7 8-7s8 3 8 7" stroke="#0070f3" strokeWidth="2" fill="none"/>
        <circle cx="20" cy="9" r="3" stroke="#0070f3" strokeWidth="1.5" fill="#fff"/>
        <path d="M22 17c2.5 0.5 4 2.5 4 5" stroke="#0070f3" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    supplier: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="10" width="22" height="14" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M3 14h22" stroke="#0070f3" strokeWidth="1.5"/>
        <path d="M8 10V6a6 6 0 0112 0v4" stroke="#0070f3" strokeWidth="2" fill="none"/>
        <circle cx="14" cy="19" r="2" stroke="#0070f3" strokeWidth="1.5" fill="#fff"/>
      </svg>
    ),
    operational: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="5" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <circle cx="14" cy="14" r="10" stroke="#0070f3" strokeWidth="1.5" strokeDasharray="3 3" fill="none"/>
        <circle cx="14" cy="2" r="2" fill="#0070f3"/>
        <circle cx="14" cy="26" r="2" fill="#0070f3"/>
        <circle cx="2" cy="14" r="2" fill="#0070f3"/>
        <circle cx="26" cy="14" r="2" fill="#0070f3"/>
      </svg>
    ),
    reporting: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="18" width="5" height="7" rx="1" fill="#0070f3"/>
        <rect x="11" y="12" width="5" height="13" rx="1" fill="#0070f3" opacity="0.6"/>
        <rect x="19" y="6" width="5" height="19" rx="1" fill="#0070f3" opacity="0.35"/>
        <path d="M4 8l8-4 8 6 6-3" stroke="#0070f3" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <circle cx="12" y="4" r="1.5" fill="#0070f3"/>
      </svg>
    ),
    admin: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="10" r="5" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M4 26c0-5 4.5-9 10-9s10 4 10 9" stroke="#0070f3" strokeWidth="2" fill="none"/>
        <circle cx="22" cy="8" r="3" stroke="#0070f3" strokeWidth="1.5" fill="#fff"/>
        <path d="M21 13l1 1 2-2" stroke="#0070f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    storage: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <ellipse cx="14" cy="7" rx="10" ry="4" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M4 7v14c0 2.2 4.5 4 10 4s10-1.8 10-4V7" stroke="#0070f3" strokeWidth="2" fill="none"/>
        <path d="M4 14c0 2.2 4.5 4 10 4s10-1.8 10-4" stroke="#0070f3" strokeWidth="2" fill="none"/>
      </svg>
    ),
    settings: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="4" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M14 2v4M14 22v4M2 14h4M22 14h4M5.1 5.1l2.8 2.8M20.1 20.1l2.8 2.8M5.1 22.9l2.8-2.8M20.1 7.9l2.8-2.8" stroke="#0070f3" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    branches: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="10" height="10" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <rect x="15" y="3" width="10" height="10" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <rect x="3" y="15" width="10" height="10" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <rect x="15" y="15" width="10" height="10" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
      </svg>
    ),
  };
  return icons[type] || null;
}

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
    { icon: "audit", title: "Core Audit Management", href: "/modules/core-audit-management" },
    { icon: "ncr", title: "Non-Conformities & CAPAs", href: "/modules/ncr" },
    { icon: "compliance", title: "Compliance Tracking", href: "/modules/compliance-tracking" },
    { icon: "document", title: "Document Control", href: "#" },
    { icon: "risk", title: "Risk Management", href: "#" },
    { icon: "people", title: "People & Training", href: "#" },
    { icon: "supplier", title: "Supplier/Vendor Quality", href: "#" },
    { icon: "branches", title: "Branches & Departments", href: "/modules/branches" },
    { icon: "operational", title: "Operational Add-ons", href: "#" },
    { icon: "reporting", title: "Reporting & Analytics", href: "#" },
    { icon: "admin", title: "System/Admin", href: "#" },
    { icon: "storage", title: "Storage", href: "/modules/storage" },
    { icon: "settings", title: "Settings", href: "/modules/settings" },
  ];

  return (
    <div className="sap-dashboard">
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

      <div className="sap-welcome-banner">
        <div className="sap-welcome-text">
          <h1>Welcome, {displayName}</h1>
          <p>Quality Audit and Compliance Portal</p>
        </div>
        <div className="sap-welcome-time">
          <span>Last login: {loginTime}</span>
        </div>
      </div>

      <div className="sap-dashboard-content">
        <div className="sap-tiles-grid">
          {tiles.map((tile, i) => (
            <Link key={i} href={tile.href} className="sap-tile">
              <div className="sap-tile-icon">
                <QacIcon type={tile.icon} />
              </div>
              <div className="sap-tile-body">
                <h3>{tile.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}