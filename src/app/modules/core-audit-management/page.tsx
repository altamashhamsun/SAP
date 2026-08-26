"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

function SubIcon({ type }: { type: string }) {
  const icons: Record<string, React.JSX.Element> = {
    planning: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="4" width="20" height="20" rx="3" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <line x1="4" y1="10" x2="24" y2="10" stroke="#0070f3" strokeWidth="2"/>
        <line x1="10" y1="4" x2="10" y2="10" stroke="#0070f3" strokeWidth="2"/>
        <line x1="18" y1="4" x2="18" y2="10" stroke="#0070f3" strokeWidth="2"/>
        <circle cx="10" cy="16" r="1.5" fill="#0070f3"/>
        <circle cx="18" cy="16" r="1.5" fill="#0070f3"/>
        <circle cx="10" cy="21" r="1.5" fill="#0070f3"/>
      </svg>
    ),
    scheduling: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="11" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <line x1="14" y1="7" x2="14" y2="14" stroke="#0070f3" strokeWidth="2" strokeLinecap="round"/>
        <line x1="14" y1="14" x2="20" y2="18" stroke="#0070f3" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="14" cy="14" r="1.5" fill="#0070f3"/>
      </svg>
    ),
    checklist: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="2" width="20" height="24" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M9 10l2 2 4-4" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="9" y1="17" x2="19" y2="17" stroke="#0070f3" strokeWidth="1.5"/>
        <path d="M9 22l2 2 4-4" stroke="#0070f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    findings: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="11" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <circle cx="14" cy="11" r="4" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M8 23c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="#0070f3" strokeWidth="2" fill="none"/>
        <line x1="20" y1="4" x2="24" y2="4" stroke="#0070f3" strokeWidth="2" strokeLinecap="round"/>
        <line x1="22" y1="2" x2="22" y2="6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    reports: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect x="4" y="2" width="18" height="24" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
        <path d="M22 8h4v18a2 2 0 01-2 2H8" stroke="#0070f3" strokeWidth="2" fill="none"/>
        <line x1="8" y1="8" x2="18" y2="8" stroke="#0070f3" strokeWidth="1.5"/>
        <line x1="8" y1="13" x2="16" y2="13" stroke="#0070f3" strokeWidth="1.5"/>
        <line x1="8" y1="18" x2="14" y2="18" stroke="#0070f3" strokeWidth="1.5"/>
        <path d="M18 18l2 2 4-4" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  };
  return icons[type] || null;
}

export default function CoreAuditManagement() {
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

  const subTiles = [
    { icon: "planning", title: "Audit Planning", href: "/modules/audit-planning" },
    { icon: "scheduling", title: "Audit Scheduling", href: "/modules/audit-scheduling" },
    { icon: "checklist", title: "Audit Checklists", href: "/modules/audit-checklist" },
    { icon: "findings", title: "Findings & Observations Log", href: "#" },
    { icon: "reports", title: "Audit Reports & Sign-off", href: "#" },
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

      <div className="sap-module-header">
        <Link href="/dashboard" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </Link>
        <h1>Core Audit Management</h1>
      </div>

      <div className="sap-dashboard-content">
        <div className="sap-tiles-grid">
          {subTiles.map((tile, i) => (
            <Link key={i} href={tile.href} className="sap-tile">
              <div className="sap-tile-icon">
                <SubIcon type={tile.icon} />
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
