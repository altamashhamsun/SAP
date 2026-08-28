"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; branch_id: string; }
interface Issue {
  id: string;
  issue_number: string;
  title: string;
  description: string;
  source: string;
  category: string;
  severity: string;
  status: string;
  branch_id: string | null;
  department_id: string | null;
  noted_date: string | null;
  resolved_date: string | null;
  action_taken: string;
}

const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  "Noted": { bg: "#fef2f2", border: "#dc2626", text: "#dc2626" },
  "In Progress": { bg: "#fffbeb", border: "#d97706", text: "#b45309" },
  "Resolved": { bg: "#f0fdf4", border: "#16a34a", text: "#16a34a" },
  "Closed": { bg: "#f3f4f6", border: "#6b7280", text: "#374151" },
};
const severityColors: Record<string, { bg: string; border: string; text: string }> = {
  "Critical": { bg: "#fef2f2", border: "#dc2626", text: "#dc2626" },
  "Major": { bg: "#fff7ed", border: "#e97025", text: "#c2410c" },
  "Minor": { bg: "#fffbeb", border: "#d97706", text: "#b45309" },
};

export default function FinalReport() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const [bRes, dRes, qRes] = await Promise.all([
        supabase.from("branches").select("id,name,code").order("code"),
        supabase.from("departments").select("id,name,code,branch_id").order("code"),
        supabase.from("quality_issues").select("*").order("created_at", { ascending: false }),
      ]);
      if (bRes.data) setBranches(bRes.data);
      if (dRes.data) setDepartments(dRes.data);
      if (qRes.data) setIssues(qRes.data as Issue[]);
      setLoading(false);
    };
    init();
  }, []);

  const filteredIssues = useMemo(() => {
    if (!dateFrom && !dateTo) return issues;
    return issues.filter((i) => {
      const d = i.noted_date || "";
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [issues, dateFrom, dateTo]);

  const stats = useMemo(() => {
    const total = filteredIssues.length;
    const resolved = filteredIssues.filter((i) => i.status === "Resolved" || i.status === "Closed").length;
    const inProgress = filteredIssues.filter((i) => i.status === "In Progress").length;
    const open = filteredIssues.filter((i) => i.status === "Noted").length;
    const critical = filteredIssues.filter((i) => i.severity === "Critical").length;
    const major = filteredIssues.filter((i) => i.severity === "Major").length;
    const minor = filteredIssues.filter((i) => i.severity === "Minor").length;
    const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const byBranch = new Map<string, { code: string; name: string; total: number; resolved: number }>();
    const byCategory = new Map<string, number>();
    for (const i of filteredIssues) {
      if (i.branch_id) {
        const b = branches.find((x) => x.id === i.branch_id);
        const key = i.branch_id;
        const entry = byBranch.get(key) || { code: b?.code || "—", name: b?.name || "Unknown", total: 0, resolved: 0 };
        entry.total++;
        if (i.status === "Resolved" || i.status === "Closed") entry.resolved++;
        byBranch.set(key, entry);
      }
      byCategory.set(i.category, (byCategory.get(i.category) || 0) + 1);
    }
    return { total, resolved, inProgress, open, critical, major, minor, rate, byBranch, byCategory };
  }, [filteredIssues, branches]);

  const branchMap = new Map(branches.map((b) => [b.id, b.code]));
  const deptMap = new Map(departments.map((d) => [d.id, d.code]));

  const generatedAt = new Date().toLocaleString();

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

  const ScoreCard = (label: string, value: number | string, color: string) => (
    <div style={{ textAlign: "center", padding: "0.75rem 1.25rem", background: `${color}11`, borderRadius: "8px", border: `1px solid ${color}33`, minWidth: "90px" }}>
      <div style={{ fontSize: "1.5rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.65rem", color: "#666", marginTop: "0.25rem", fontWeight: 500 }}>{label}</div>
    </div>
  );

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
          <button onClick={() => window.print()} className="sap-action-btn" style={{ fontWeight: 700 }}>
            🖨 Print Report
          </button>
        </div>

        {filteredIssues.length === 0 ? (
          <p className="sap-empty-msg">No issues in this period.</p>
        ) : (
          <div id="qa-report" style={{ background: "#fff", border: "1px solid var(--sap-border)", borderRadius: "12px", padding: "2rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "2px solid #0070f3" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.4rem", color: "#0a2540" }}>Quality Assurance — Final Report</h2>
                <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.25rem" }}>
                  Period: {dateFrom || "Start"} to {dateTo || "Today"} · Generated: {generatedAt}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0070f3" }}>{stats.rate}%</div>
                <div style={{ fontSize: "0.7rem", color: "#666" }}>Resolution Rate</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
              {ScoreCard("Total Issues", stats.total, "#0070f3")}
              {ScoreCard("Resolved", stats.resolved, "#16a34a")}
              {ScoreCard("In Progress", stats.inProgress, "#e97025")}
              {ScoreCard("Open", stats.open, "#dc2626")}
              {ScoreCard("Critical", stats.critical, "#b91c1c")}
              {ScoreCard("Major", stats.major, "#e97025")}
              {ScoreCard("Minor", stats.minor, "#d97706")}
            </div>

            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
              <div style={{ flex: 1, minWidth: "260px", border: "1px solid var(--sap-border)", borderRadius: "10px", padding: "1rem" }}>
                <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#0a2540" }}>Issues by Branch</h4>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...thStyle, fontSize: "0.65rem" }}>Branch</th>
                      <th style={{ ...thStyle, fontSize: "0.65rem" }}>Total</th>
                      <th style={{ ...thStyle, fontSize: "0.65rem" }}>Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(stats.byBranch.values()).sort((a, b) => b.total - a.total).map((row) => (
                      <tr key={row.code}>
                        <td style={tdStyle}><span className="sap-branch-code-tag">{row.code}</span> {row.name}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>{row.total}</td>
                        <td style={{ ...tdStyle, textAlign: "center", color: "#16a34a", fontWeight: 600 }}>{row.resolved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ flex: 1, minWidth: "260px", border: "1px solid var(--sap-border)", borderRadius: "10px", padding: "1rem" }}>
                <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#0a2540" }}>Issues by Category</h4>
                {Array.from(stats.byCategory.entries()).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                  const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={cat} style={{ marginBottom: "0.65rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", marginBottom: "0.2rem" }}>
                        <span style={{ color: "#444" }}>{cat}</span>
                        <span style={{ fontWeight: 600, color: "#333" }}>{count} ({pct}%)</span>
                      </div>
                      <div style={{ background: "#e5e7eb", borderRadius: "4px", height: "8px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: "#0070f3", borderRadius: "4px" }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h4 style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "#0a2540" }}>Issue Summary</h4>
              <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sap-border)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1000px" }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Issue #</th>
                      <th style={{ ...thStyle, minWidth: "180px" }}>Title</th>
                      <th style={thStyle}>Branch</th>
                      <th style={thStyle}>Dept</th>
                      <th style={thStyle}>Severity</th>
                      <th style={thStyle}>Category</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Noted</th>
                      <th style={thStyle}>Resolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIssues.map((issue) => {
                      const sc = statusColors[issue.status] || statusColors["Noted"];
                      const sevc = severityColors[issue.severity] || severityColors["Minor"];
                      return (
                        <tr key={issue.id} style={{ background: issue.status === "Closed" ? "#f9fafb" : "#fff" }}>
                          <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap" }}>{issue.issue_number}</td>
                          <td style={{ ...tdStyle, maxWidth: "200px" }}>{issue.title}</td>
                          <td style={tdStyle}>{issue.branch_id ? branchMap.get(issue.branch_id) || "—" : "—"}</td>
                          <td style={tdStyle}>{issue.department_id ? deptMap.get(issue.department_id) || "—" : "—"}</td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", background: sevc.bg, border: `1px solid ${sevc.border}`, color: sevc.text }}>{issue.severity}</span>
                          </td>
                          <td style={tdStyle}>{issue.category}</td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}>{issue.status}</span>
                          </td>
                          <td style={tdStyle}>{issue.noted_date || "—"}</td>
                          <td style={tdStyle}>{issue.resolved_date || "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}