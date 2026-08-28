"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  images: string[];
}

const statusOptions = ["Noted", "In Progress", "Resolved", "Closed"] as const;
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

export default function IssuesList() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingIssue, setEditingIssue] = useState<string | null>(null);
  const [editingAction, setEditingAction] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const branchMap = new Map(branches.map((b) => [b.id, b.code]));
  const deptMap = new Map(departments.map((d) => [d.id, d.code]));

  const updateStatus = async (issueId: string, status: string) => {
    setUpdatingId(issueId);
    setError("");
    const updates: Record<string, string> = { status, updated_at: new Date().toISOString() };
    if (status === "Resolved" || status === "Closed") {
      updates.resolved_date = new Date().toISOString().split("T")[0];
    }
    const { error: dbErr } = await supabase.from("quality_issues").update(updates).eq("id", issueId);
    if (dbErr) {
      setError(`Update failed: ${dbErr.message}`);
    } else {
      setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, ...updates } : i));
    }
    setUpdatingId(null);
  };

  const saveAction = async (issueId: string) => {
    setUpdatingId(issueId);
    setError("");
    const { error: dbErr } = await supabase.from("quality_issues").update({
      action_taken: editingAction,
      updated_at: new Date().toISOString(),
    }).eq("id", issueId);
    if (dbErr) {
      setError(`Save failed: ${dbErr.message}`);
    } else {
      setIssues((prev) => prev.map((i) => i.id === issueId ? { ...i, action_taken: editingAction } : i));
      setEditingIssue(null);
      setSuccess("Action saved!");
      setTimeout(() => setSuccess(""), 2000);
    }
    setUpdatingId(null);
  };

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedRows(next);
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

  const thStyle: React.CSSProperties = {
    padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", color: "#fff", background: "#0070f3", border: "1px solid #0060d0",
    whiteSpace: "nowrap", position: "sticky", top: 0, zIndex: 1,
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem", fontSize: "0.78rem", border: "1px solid var(--sap-border)", verticalAlign: "top",
  };
  const selectStyle: React.CSSProperties = {
    padding: "0.25rem 0.5rem", fontSize: "0.75rem", border: "1px solid #ddd", borderRadius: "4px",
    background: "#fff", cursor: "pointer", minWidth: "120px",
  };
  const inputStyle: React.CSSProperties = {
    padding: "0.25rem 0.5rem", fontSize: "0.75rem", border: "1px solid #ddd", borderRadius: "4px", background: "#fff",
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
        <h1>Issues List</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span><button onClick={() => setError("")} style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "1rem" }}>
          <Link href="/modules/quality-assurance/issue-noted" className="sap-action-btn" style={{ textDecoration: "none", display: "inline-block", fontWeight: 700 }}>
            + New Issue
          </Link>
        </div>

        {issues.length === 0 ? (
          <p className="sap-empty-msg">No issues recorded yet.</p>
        ) : (
          <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sap-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1400px" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Issue #</th>
                  <th style={{ ...thStyle, minWidth: "180px" }}>Title</th>
                  <th style={thStyle}>Branch</th>
                  <th style={thStyle}>Dept</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Severity</th>
                  <th style={thStyle}>Noted Date</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, minWidth: "160px" }}>Action Taken</th>
                  <th style={thStyle}>Resolved Date</th>
                  <th style={{ ...thStyle, width: "30px" }}></th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => {
                  const sc = statusColors[issue.status] || statusColors["Noted"];
                  const sevc = severityColors[issue.severity] || severityColors["Minor"];
                  return (
                    <React.Fragment key={issue.id}>
                      <tr style={{ background: issue.status === "Closed" ? "#f9fafb" : "#fff" }}>
                        <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap" }}>{issue.issue_number}</td>
                        <td style={{ ...tdStyle, maxWidth: "200px" }}>{issue.title}</td>
                        <td style={tdStyle}>{issue.branch_id ? branchMap.get(issue.branch_id) || "—" : "—"}</td>
                        <td style={tdStyle}>{issue.department_id ? deptMap.get(issue.department_id) || "—" : "—"}</td>
                        <td style={tdStyle}>{issue.category}</td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", background: sevc.bg, border: `1px solid ${sevc.border}`, color: sevc.text }}>
                            {issue.severity}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{issue.noted_date || "—"}</td>
                        <td style={tdStyle}>
                          <select
                            value={issue.status}
                            disabled={updatingId === issue.id}
                            onChange={(e) => updateStatus(issue.id, e.target.value)}
                            style={{ ...selectStyle, background: sc.bg, borderColor: sc.border, color: sc.text, fontWeight: 600 }}
                          >
                            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td style={{ ...tdStyle, maxWidth: "200px" }}>
                          {editingIssue === issue.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                              <textarea value={editingAction} onChange={(e) => setEditingAction(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", width: "100%" }} />
                              <div style={{ display: "flex", gap: "0.3rem" }}>
                                <button onClick={() => saveAction(issue.id)} disabled={updatingId === issue.id} className="sap-action-btn" style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem" }}>Save</button>
                                <button onClick={() => setEditingIssue(null)} style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", background: "#f5f5f5", border: "1px solid #d9d9d9", borderRadius: "6px", cursor: "pointer", color: "#666" }}>Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <span style={{ fontSize: "0.75rem", color: "#444", lineHeight: 1.4 }}>{issue.action_taken || <span style={{ color: "#aaa" }}>—</span>}</span>
                              <button onClick={() => { setEditingIssue(issue.id); setEditingAction(issue.action_taken || ""); }} className="sap-action-btn" style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem", whiteSpace: "nowrap" }}>Edit</button>
                            </div>
                          )}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{issue.resolved_date || "—"}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <button onClick={() => toggleRow(issue.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", padding: "0.2rem" }} title="View details">
                            {expandedRows.has(issue.id) ? "▼" : "▶"}
                          </button>
                        </td>
                      </tr>
                      {expandedRows.has(issue.id) && (
                        <tr>
                          <td colSpan={11} style={{ ...tdStyle, background: "#fafafa", padding: "1rem" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>Full Description</div>
                            <p style={{ fontSize: "0.8rem", color: "#444", margin: "0 0 0.75rem" }}>{issue.description}</p>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>Images</div>
                            {issue.images && issue.images.length > 0 ? (
                              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                {issue.images.map((img, i) => (
                                  <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                    <img src={img} alt={`Issue evidence ${i + 1}`} loading="lazy"
                                      style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "6px", border: "1px solid #ddd" }} />
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span style={{ fontSize: "0.75rem", color: "#999" }}>No images</span>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}