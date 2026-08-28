"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }

interface Round {
  id: string;
  branch_id: string;
  date: string;
  round_number: number;
  content: string;
  ended_at: string | null;
}

export default function IssueNoted() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [branchId, setBranchId] = useState("");
  const [noteDate, setNoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [dayEnded, setDayEnded] = useState(false);
  const [roundsLoaded, setRoundsLoaded] = useState(false);

  const [saveState, setSaveState] = useState<{ spin: boolean; msg: string }>({ spin: false, msg: "" });
  const [error, setError] = useState("");

  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const bRes = await supabase.from("branches").select("id,name,code").order("code");
      if (bRes.data) setBranches(bRes.data);
      setLoading(false);
    };
    init();
  }, []);

  const loadRounds = async (bid: string, date: string) => {
    setRoundsLoaded(false);
    setRounds([]);
    setDayEnded(false);
    const { data } = await supabase
      .from("qa_daily_rounds")
      .select("*")
      .eq("branch_id", bid)
      .eq("date", date)
      .order("round_number", { ascending: true });
    let rows = (data || []) as Round[];
    if (rows.length === 0) {
      const { data: created, error: insErr } = await supabase.from("qa_daily_rounds").insert({
        branch_id: bid,
        date,
        round_number: 1,
        content: "",
      }).select();
      if (insErr) {
        setError(`Failed to create notepad: ${insErr.message}`);
      } else if (created) {
        rows = created as Round[];
      }
    }
    setRounds(rows);
    setDayEnded(rows.length > 0 && rows.some((r) => !!r.ended_at));
    setRoundsLoaded(true);
  };

  const handleBranchChange = (bid: string) => {
    setBranchId(bid);
    if (bid) loadRounds(bid, noteDate);
  };

  const handleDateChange = (date: string) => {
    setNoteDate(date);
    if (branchId) loadRounds(branchId, date);
  };

  const saveRound = async (roundId: string, content: string) => {
    setSaveState({ spin: true, msg: "Saving..." });
    const { error: uErr } = await supabase
      .from("qa_daily_rounds")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", roundId);
    if (uErr) {
      setError(`Save failed: ${uErr.message}`);
      setSaveState({ spin: false, msg: "Save failed" });
      return;
    }
    setSaveState({ spin: false, msg: "Saved ✓" });
    setTimeout(() => setSaveState((s) => (s.msg === "Saved ✓" ? { spin: false, msg: "" } : s)), 2000);
  };

  const handleTextChange = (roundId: string, value: string) => {
    setRounds((prev) => prev.map((r) => (r.id === roundId ? { ...r, content: value } : r)));
    const existing = saveTimers.current.get(roundId);
    if (existing) clearTimeout(existing);
    saveTimers.current.set(roundId, setTimeout(() => saveRound(roundId, value), 1200));
  };

  const addRound = async () => {
    const nextNumber = rounds.length > 0 ? rounds[rounds.length - 1].round_number + 1 : 1;
    const { data: created, error: insErr } = await supabase.from("qa_daily_rounds").insert({
      branch_id: branchId,
      date: noteDate,
      round_number: nextNumber,
      content: "",
    }).select();
    if (insErr) {
      setError(`Failed to add round: ${insErr.message}`);
      return;
    }
    if (created) {
      setRounds((prev) => [...prev, ...(created as Round[])]);
    }
  };

  const endDay = async () => {
    if (!window.confirm(`End the day for ${noteDate}? You will not be able to edit these notepads afterwards.`)) return;
    const now = new Date().toISOString();
    const { error: uErr } = await supabase
      .from("qa_daily_rounds")
      .update({ ended_at: now, updated_at: now })
      .eq("branch_id", branchId)
      .eq("date", noteDate);
    if (uErr) {
      setError(`Failed to end day: ${uErr.message}`);
      return;
    }
    setRounds((prev) => prev.map((r) => ({ ...r, ended_at: now })));
    setDayEnded(true);
  };

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

  const labelStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem", display: "block" };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.65rem", fontSize: "0.85rem",
    border: "1px solid #d9d9d9", borderRadius: "6px", background: "#fff",
  };

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
        <Link href="/modules/quality-assurance" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Quality Assurance
        </Link>
        <h1>Issue Noted</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span><button onClick={() => setError("")} style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}

        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div style={{ minWidth: "240px" }}>
            <label style={labelStyle}>Branch *</label>
            <select value={branchId} onChange={(e) => handleBranchChange(e.target.value)} style={inputStyle}>
              <option value="">— Select Branch —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Date *</label>
            <input
              type="date"
              value={noteDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {saveState.msg && (
              <span style={{ fontSize: "0.78rem", color: saveState.spin ? "#e97025" : "#16a34a", fontWeight: 600 }}>
                {saveState.spin ? "⏳" : ""} {saveState.msg}
              </span>
            )}
            {branchId && (
              <button
                onClick={endDay}
                disabled={!roundsLoaded || dayEnded}
                className="sap-action-btn"
                style={{ fontWeight: 700, background: dayEnded ? "#9ca3af" : "#dc2626", borderColor: dayEnded ? "#9ca3af" : "#b91c1c" }}
              >
                {dayEnded ? "Day Ended" : "End Day"}
              </button>
            )}
          </div>
        </div>

        {!branchId ? (
          <div className="sap-plans-list">
            <div className="sap-plan-card" style={{ textAlign: "center", padding: "3rem" }}>
              <div style={{ fontSize: "0.9rem", color: "#999" }}>
                Select a branch and a date to open the daily notepad.
              </div>
            </div>
          </div>
        ) : !roundsLoaded ? (
          <div className="sap-plans-list">
            <div className="sap-plan-card" style={{ textAlign: "center", padding: "3rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#666" }}>Loading notepad…</span>
            </div>
          </div>
        ) : (
          <div>
            {dayEnded && (
              <div className="sap-error-message" style={{ marginBottom: "1rem", background: "#f3f4f6", borderColor: "#9ca3af" }}>
                <span style={{ color: "#374151" }}>This day has been ended on {noteDate}. Notepads are locked.</span>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {rounds.map((round) => (
                <div key={round.id} style={{
                  background: "#fff", border: "1px solid var(--sap-border)", borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden",
                }}>
                  <div style={{
                    padding: "0.75rem 1.25rem", borderBottom: "1px solid var(--sap-border)", background: "#f8fafc",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <span className="sap-dept-tag">R{round.round_number}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0a2540" }}>
                        Round {round.round_number}
                      </span>
                    </div>
                    {round.ended_at && <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>🔒 ended {new Date(round.ended_at).toLocaleString()}</span>}
                  </div>
                  <textarea
                    value={round.content}
                    disabled={dayEnded}
                    onChange={(e) => handleTextChange(round.id, e.target.value)}
                    onBlur={(e) => {
                      const existing = saveTimers.current.get(round.id);
                      if (existing) { clearTimeout(existing); saveTimers.current.delete(round.id); }
                      saveRound(round.id, e.target.value);
                    }}
                    placeholder="Write all issues observed today just like a notepad..."
                    rows={10}
                    style={{
                      width: "100%", padding: "1rem 1.25rem", fontSize: "0.88rem", lineHeight: 1.6,
                      border: "none", outline: "none", resize: "vertical", background: dayEnded ? "#f9fafb" : "#fff",
                      color: dayEnded ? "#6b7280" : "#111", fontFamily: "inherit",
                      minHeight: "200px",
                    }}
                  />
                </div>
              ))}

              {!dayEnded && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button onClick={addRound} className="sap-action-btn" style={{ fontWeight: 700 }}>
                    + Add Round {rounds.length + 1}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}