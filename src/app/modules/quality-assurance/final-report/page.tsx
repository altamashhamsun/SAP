"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Entry {
  id: string;
  date: string;
  issue_number: string;
  branch_code: string;
  department: string;
  category: string;
  severity: string;
  status: string;
  repeated: boolean;
  description: string;
  images: string[];
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  "Open": { bg: "#fef2f2", border: "#dc2626", text: "#dc2626" },
  "In Progress": { bg: "#fffbeb", border: "#d97706", text: "#b45309" },
  "Resolved": { bg: "#f0fdf4", border: "#16a34a", text: "#16a34a" },
  "Closed": { bg: "#f3f4f6", border: "#6b7280", text: "#374151" },
};
const categoryColors: Record<string, { bg: string; border: string; text: string }> = {
  "Performance": { bg: "#fef2f2", border: "#dc2626", text: "#b91c1c" },
  "Compliance": { bg: "#f0fdf4", border: "#16a34a", text: "#166534" },
  "Non issue": { bg: "#f3f4f6", border: "#9ca3af", text: "#4b5563" },
  "Development": { bg: "#eff6ff", border: "#2563eb", text: "#1d4ed8" },
  "FIR (MAINTENANCE)": { bg: "#fff7ed", border: "#e97025", text: "#c2410c" },
};

const esc = (s: string) => (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export default function FinalReport() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [pendingReport, setPendingReport] = useState<{ code: string; name: string; date: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const [bRes, qRes] = await Promise.all([
        supabase.from("branches").select("id,name,code").order("code"),
        supabase.from("qa_issue_entries").select("*").order("issue_number"),
      ]);
      if (bRes.data) setBranches(bRes.data as Branch[]);
      if (qRes.data) setEntries(qRes.data as Entry[]);
      setLoading(false);
    };
    init();
  }, []);

  const isDone = (status: string) => status === "Resolved" || status === "Closed";
  const isPending = (status: string) => status === "Open" || status === "In Progress";

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return entries;
    return entries.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo]);

  const unknownCodes = Array.from(new Set(filtered.map((e) => e.branch_code)))
    .filter((c) => c && !branches.some((b) => b.code === c))
    .sort() as string[];

  const branchRows = [
    ...branches.map((b) => ({ code: b.code, name: b.name })),
    ...unknownCodes.map((c) => ({ code: c, name: c })),
  ];

  const datesForBranch = (code: string) => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      if (e.branch_code !== code) continue;
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return Array.from(map.entries())
      .map(([date, list]) => ({
        date,
        count: list.length,
        done: list.filter((x) => isDone(x.status)).length,
        pending: list.filter((x) => isPending(x.status)).length,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const toggleBranch = (code: string) => {
    const next = new Set(expandedBranches);
    if (next.has(code)) next.delete(code); else next.add(code);
    setExpandedBranches(next);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const generatePdf = (code: string, name: string, date: string) => {
    setGenerating(true);
    setError("");
    const list = filtered.filter((e) => e.branch_code === code && e.date === date);
    const done = list.filter((x) => isDone(x.status)).length;
    const pending = list.filter((x) => isPending(x.status)).length;
    const major = list.filter((x) => x.severity === "Major").length;
    const minor = list.filter((x) => x.severity === "Minor").length;

    const cats = new Map<string, number>();
    for (const x of list) cats.set(x.category, (cats.get(x.category) || 0) + 1);
    const catText = Array.from(cats.entries()).map(([c, n]) => `${esc(c)}: ${n}`).join(" · ");

    const badge = (t: string, bg: string, border: string, color: string) =>
      `<span class="badge" style="background:${bg};border:1px solid ${border};color:${color}">${esc(t)}</span>`;

    const rows = list.map((x) => {
      const sc = statusColors[x.status] || statusColors["Open"];
      const cc = categoryColors[x.category] || categoryColors["Non issue"];
      const sev = x.severity === "Major"
        ? { bg: "#fef2f2", border: "#dc2626", text: "#dc2626" }
        : { bg: "#fffbeb", border: "#d97706", text: "#b45309" };
      const pics = (x.images || []).map((img) => `<a href="${esc(img)}" target="_blank"><img class="thumb" src="${esc(img)}" alt="pic" /></a>`).join(" ");
      const dp = isDone(x.status)
        ? badge("Done", "#f0fdf4", "#16a34a", "#16a34a")
        : badge("Pending", "#fef2f2", "#dc2626", "#dc2626");
      return `<tr>
        <td class="num">${esc(x.issue_number)}</td>
        <td>${esc(x.description)}</td>
        <td>${esc(x.department || "—")}</td>
        <td>${badge(x.category, cc.bg, cc.border, cc.text)}</td>
        <td>${badge(x.severity || "—", sev.bg, sev.border, sev.text)}</td>
        <td>${badge(x.status, sc.bg, sc.border, sc.text)}</td>
        <td>${dp}</td>
        <td>${pics || "—"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>QA Final Report — ${esc(code)} — ${esc(date)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1f2937; font-size: 12px; margin: 0; }
  .head { border-bottom: 3px solid #0070f3; padding-bottom: 10px; margin-bottom: 16px; }
  .brand { font-size: 21px; font-weight: 800; color: #0070f3; }
  .title { font-size: 15px; font-weight: 700; margin-top: 4px; color: #0a2540; }
  .meta { font-size: 10px; color: #6b7280; margin-top: 3px; }
  .summary { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0 16px; }
  .card { flex: 1; min-width: 90px; text-align: center; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 8px; }
  .card b { display: block; font-size: 20px; }
  .card span { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .cats { font-size: 10.5px; color: #374151; margin-bottom: 14px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #0070f3; color: #fff; text-align: left; padding: 7px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  td { border: 1px solid #d1d5db; padding: 6px 8px; font-size: 10.5px; vertical-align: top; }
  .num { font-weight: 700; white-space: nowrap; }
  .badge { font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 9.5px; display: inline-block; white-space: nowrap; }
  img.thumb { width: 44px; height: 44px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd; }
  .footer { margin-top: 18px; font-size: 9px; color: #9ca3af; text-align: right; }
  tr { break-inside: avoid; }
</style>
</head>
<body>
  <div class="head">
    <div class="brand">QAC — Quality Assurance</div>
    <div class="title">Final Report — ${esc(name)} (${esc(code)})</div>
    <div class="meta">Issues marked on: ${esc(date)} &nbsp;·&nbsp; Generated: ${esc(new Date().toLocaleString())} &nbsp;·&nbsp; ${list.length} issues</div>
  </div>
  <div class="summary">
    <div class="card"><b style="color:#0070f3">${list.length}</b><span>Total Issues</span></div>
    <div class="card"><b style="color:#16a34a">✓ ${done}</b><span>Done</span></div>
    <div class="card"><b style="color:#dc2626">⏳ ${pending}</b><span>Pending</span></div>
    <div class="card"><b style="color:#dc2626">${major}</b><span>Major</span></div>
    <div class="card"><b style="color:#b45309">${minor}</b><span>Minor</span></div>
  </div>
  ${catText ? `<div class="cats"><b>Category breakdown:</b> ${catText}</div>` : ""}
  <table>
    <thead>
      <tr>
        <th>Issue #</th>
        <th style="width:30%">Issue Description</th>
        <th>Department</th>
        <th>Category</th>
        <th>Severity</th>
        <th>Status</th>
        <th>Done / Pending</th>
        <th>Pictures</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  <div class="footer">Prepared by QAC · ${esc(new Date().toLocaleString())}</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      setError("Pop-up was blocked. Allow pop-ups for this site to generate the PDF.");
      setGenerating(false);
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); setGenerating(false); setPendingReport(null); }, 500);
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

  const totalDone = filtered.filter((e) => isDone(e.status)).length;
  const totalPending = filtered.filter((e) => isPending(e.status)).length;

  const thStyle: React.CSSProperties = {
    padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", color: "#fff", background: "#0070f3", border: "1px solid #0060d0", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem", fontSize: "0.78rem", border: "1px solid var(--sap-border)", verticalAlign: "top",
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
        <h1>Final Report</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span><button onClick={() => setError("")} style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0a2540" }}>Report Period:</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: "0.35rem 0.5rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px", background: "#fff" }} />
          <span style={{ fontSize: "0.8rem", color: "#999" }}>to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: "0.35rem 0.5rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px", background: "#fff" }} />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }}
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem", background: "#f5f5f5", border: "1px solid #d9d9d9", borderRadius: "6px", cursor: "pointer", color: "#666" }}>
              Clear
            </button>
          )}
          <span style={{ fontSize: "0.78rem", color: "#888", marginLeft: "auto" }}>
            {filtered.length} issues in period · ✓ {totalDone} done · ⏳ {totalPending} pending
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="sap-empty-msg">
            No issues in this period. Mark issues in the Issues List first — every branch is shown below with its dates once issues exist.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {branchRows.map((b) => {
              const dates = datesForBranch(b.code);
              const open = expandedBranches.has(b.code);
              const total = dates.reduce((a, d) => a + d.count, 0);
              const done = dates.reduce((a, d) => a + d.done, 0);
              const pending = dates.reduce((a, d) => a + d.pending, 0);
              return (
                <div key={b.code} style={{ border: "1px solid var(--sap-border)", borderRadius: "12px", overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div
                    onClick={() => toggleBranch(b.code)}
                    style={{ cursor: "pointer", padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", background: open ? "#f0f7ff" : "#fff", borderBottom: open ? "1px solid var(--sap-border)" : "none" }}
                  >
                    <span style={{ color: "#0070f3", fontSize: "0.85rem", width: "1.1rem", textAlign: "center" }}>{open ? "▼" : "▶"}</span>
                    <span className="sap-branch-code-tag">{b.code}</span>
                    <span style={{ fontWeight: 700, color: "#0a2540", flex: 1, minWidth: "150px" }}>{b.name}</span>
                    <div style={{ display: "flex", gap: "1.3rem", alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0070f3" }}>{total}</div>
                        <div style={{ fontSize: "0.62rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Issues</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#16a34a" }}>✓ {done}</div>
                        <div style={{ fontSize: "0.62rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Done</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#dc2626" }}>⏳ {pending}</div>
                        <div style={{ fontSize: "0.62rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Pending</div>
                      </div>
                    </div>
                  </div>

                  {open && (
                    <div style={{ padding: "1rem 1.1rem", background: "#fafafa" }}>
                      {dates.length === 0 ? (
                        <p style={{ fontSize: "0.82rem", color: "#999", margin: "0.5rem 0" }}>No issues recorded for {b.code} in the selected period.</p>
                      ) : (
                        <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sap-border)", background: "#fff" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "520px" }}>
                            <thead>
                              <tr>
                                <th style={thStyle}>Date Marked</th>
                                <th style={thStyle}>Issues</th>
                                <th style={thStyle}>Done</th>
                                <th style={thStyle}>Pending</th>
                                <th style={thStyle}>PDF</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dates.map((d) => (
                                <tr key={d.date} onClick={() => setPendingReport({ code: b.code, name: b.name, date: d.date })}
                                  style={{ cursor: "pointer" }}>
                                  <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: "nowrap", color: "#0a2540" }}>{d.date}</td>
                                  <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>{d.count}</td>
                                  <td style={{ ...tdStyle, textAlign: "center", color: "#16a34a", fontWeight: 600 }}>{d.done}</td>
                                  <td style={{ ...tdStyle, textAlign: "center", color: "#dc2626", fontWeight: 600 }}>{d.pending}</td>
                                  <td style={tdStyle}>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setPendingReport({ code: b.code, name: b.name, date: d.date }); }}
                                      className="sap-action-btn"
                                      style={{ fontWeight: 700, padding: "0.3rem 0.7rem", fontSize: "0.72rem", whiteSpace: "nowrap" }}
                                    >
                                      🖨 Make PDF
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {pendingReport && !generating && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem 1.75rem", maxWidth: "440px", width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
              <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem", color: "#0a2540" }}>Make PDF report?</h3>
              <p style={{ fontSize: "0.85rem", color: "#555", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
                Generate the QA Final Report PDF for <b>{pendingReport.name} ({pendingReport.code})</b> covering issues marked on <b>{pendingReport.date}</b>?
              </p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                <button onClick={() => setPendingReport(null)} style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", background: "#f5f5f5", border: "1px solid #d9d9d9", borderRadius: "8px", cursor: "pointer", color: "#555" }}>Cancel</button>
                <button onClick={() => generatePdf(pendingReport.code, pendingReport.name, pendingReport.date)} className="sap-action-btn" style={{ fontWeight: 700 }}>Generate PDF</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}