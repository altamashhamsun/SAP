"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Room { id: string; branch_id: string; }

export default function RoomInspection() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data: bRes } = await supabase.from("branches").select("id,name,code").order("name");
      if (bRes) setBranches(bRes as Branch[]);
      const { data: rRes } = await supabase.from("rooms").select("id,branch_id");
      if (rRes) {
        const counts: Record<string, number> = {};
        (rRes as Room[]).forEach((r) => { counts[r.branch_id] = (counts[r.branch_id] || 0) + 1; });
        setRoomCounts(counts);
      }
      setLoading(false);
    };
    init();
  }, []);

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

  if (!user) return null;

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
        <h1>Room Inspection</h1>
      </div>

      <div className="sap-dashboard-content">
        <p style={{ fontSize: "0.86rem", color: "#666", marginBottom: "1.25rem" }}>
          Select a branch to inspect its rooms.
        </p>
        {branches.length === 0 ? (
          <p className="sap-empty-msg">No branches configured yet. Add branches in Branches &amp; Departments first.</p>
        ) : (
          <div className="sap-tiles-grid">
            {branches.map((b) => (
              <Link key={b.id} href={`/modules/room-inspection/${b.id}`} className="sap-tile">
                <div className="sap-tile-icon">
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                    <rect x="3" y="5" width="22" height="18" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
                    <line x1="3" y1="9" x2="25" y2="9" stroke="#0070f3" strokeWidth="1.5"/>
                    <line x1="11" y1="9" x2="11" y2="23" stroke="#0070f3" strokeWidth="1.5"/>
                    <rect x="14" y="12" width="2.5" height="2.5" fill="#0070f3" opacity="0.6"/>
                    <rect x="19" y="17" width="3" height="6" rx="0.5" stroke="#0070f3" strokeWidth="1.2" fill="none"/>
                  </svg>
                </div>
                <div className="sap-tile-body">
                  <h3>{b.name}</h3>
                  <span style={{ fontSize: "0.72rem", color: "#0070f3", fontWeight: 700 }}>{b.code}</span>
                  <div style={{ fontSize: "0.78rem", color: "#666", marginTop: "0.3rem" }}>
                    {roomCounts[b.id] || 0} rooms
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
