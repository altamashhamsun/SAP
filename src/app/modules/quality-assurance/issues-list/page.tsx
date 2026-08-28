"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; }
interface IssueEntry {
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

const statusOptions = ["Open", "In Progress", "Resolved", "Closed"] as const;
const categoryOptions = ["Performance", "Compliance", "Non issue", "Development", "FIR (MAINTENANCE)"] as const;
const severityOptions = ["Minor", "Major"] as const;

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

export default function IssuesList() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [entries, setEntries] = useState<IssueEntry[]>([]);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const [bRes, dRes] = await Promise.all([
        supabase.from("branches").select("id,name,code").order("code"),
        supabase.from("departments").select("id,name,code").order("code"),
      ]);
      if (bRes.data) setBranches(bRes.data);
      if (dRes.data) setDepartments(dRes.data);
      setLoading(false);
    };
    init();
  }, []);

  const loadEntries = async (dateValue?: string) => {
    const d = dateValue || selectedDate;
    const { data } = await supabase
      .from("qa_issue_entries")
      .select("*")
      .eq("date", d)
      .order("issue_number");
    setEntries((data || []) as IssueEntry[]);
  };

  const handleDateChange = (dateValue: string) => {
    setSelectedDate(dateValue);
    if (dateValue) loadEntries(dateValue);
  };

  const createList = async () => {
    if (!selectedDate) return;
    setGenerating(true);
    setError("");
    setSuccess("");

    const { data: roundsData } = await supabase
      .from("qa_daily_rounds")
      .select("branch_id,date,round_number,content")
      .eq("date", selectedDate)
      .order("round_number", { ascending: true });
    const rounds = (roundsData || []).map((r) => ({
      branch_code: branches.find((b) => b.id === r.branch_id)?.code || "",
      round_number: r.round_number,
      content: r.content,
    })).filter((r) => r.content && r.content.trim());

    if (rounds.length === 0) {
      setError("No notepad content found for this date. Add notes in Issue Noted first.");
      setGenerating(false);
      return;
    }

    const res = await fetch("/api/qa/process-issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, rounds, branches, departments }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "AI processing failed");
      setGenerating(false);
      return;
    }

    const { error: delErr } = await supabase.from("qa_issue_entries").delete().eq("date", selectedDate);
    if (delErr) {
      setError(`Failed to reset previous list: ${delErr.message}`);
      setGenerating(false);
      return;
    }

    const { error: insErr } = await supabase.from("qa_issue_entries").insert(data.issues);
    if (insErr) {
      setError(`Failed to save issues: ${insErr.message}`);
      setGenerating(false);
      return;
    }

    await loadEntries();
    setGenerating(false);
    setSuccess(`List created for ${selectedDate} — ${data.issues.length} issues${data.issues.some((i: IssueEntry) => i.repeated) ? " (repeated issues checked)" : ""}`);
    setTimeout(() => setSuccess(""), 4000);
  };

  const updateEntry = async (id: string, field: string, value: string) => {
    setUpdatingId(id);
    setError("");
    const { error: dbErr } = await supabase
      .from("qa_issue_entries")
      .update({ [field]: value, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (dbErr) {
      setError(`Update failed: ${dbErr.message}`);
    } else {
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, [field]: value } : e));
    }
    setUpdatingId(null);
  };

  const uploadImage = async (entryId: string, file: File) => {
    setUploadingId(entryId);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/cloudinary", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(`Upload failed: ${uploadData.error}`);
        setUploadingId(null);
        return;
      }
      const current = entries.find((e) => e.id === entryId);
      const newImages = [...(current?.images || []), uploadData.url];
      const { error: dbErr } = await supabase
        .from("qa_issue_entries")
        .update({ images: newImages, updated_at: new Date().toISOString() })
        .eq("id", entryId);
      if (dbErr) {
        setError(`DB error: ${dbErr.message}`);
        setUploadingId(null);
        return;
      }
      setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, images: newImages } : e));
      setUploadingId(null);
      setSuccess("Image uploaded!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(`Error: ${String(err)}`);
      setUploadingId(null);
    }
  };

  const removeImage = async (entryId: string, imageUrl: string) => {
    setError("");
    const current = entries.find((e) => e.id === entryId);
    const newImages = (current?.images || []).filter((img) => img !== imageUrl);
    const { error: dbErr } = await supabase
      .from("qa_issue_entries")
      .update({ images: newImages, updated_at: new Date().toISOString() })
      .eq("id", entryId);
    if (dbErr) {
      setError(`Delete failed: ${dbErr.message}`);
      return;
    }
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, images: newImages } : e));
  };

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id); else next.add(id);
    setExpandedRows(next);
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

  const repeatedIssues = entries.filter((e) => e.repeated);

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
    background: "#fff", cursor: "pointer", minWidth: "130px",
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

        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem", display: "block" }}>Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              style={{ padding: "0.5rem 0.65rem", fontSize: "0.85rem", border: "1px solid #d9d9d9", borderRadius: "6px", background: "#fff" }}
            />
          </div>
          <button onClick={createList} disabled={generating} className="sap-action-btn" style={{ fontWeight: 700 }}>
            {generating ? "⏳ AI is creating list..." : "Create List from this Date"}
          </button>
          {entries.length > 0 && (
            <span style={{ fontSize: "0.78rem", color: "#888" }}>
              {entries.length} issues · {repeatedIssues.length} repeated
            </span>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="sap-empty-msg">
            No issues listed yet. Select a date and click "Create List from this Date" — the AI will read all notepad rounds of that day and build the issue list.
          </p>
        ) : (
          <div>
            {repeatedIssues.length > 0 && (
              <div style={{ background: "#fffbe6", border: "1px solid #fcd34d", borderRadius: "12px", padding: "1rem 1.25rem", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", color: "#92400e" }}>
                  ☑ Repeated Issues Checklist (found across rounds)
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  {repeatedIssues.map((issue) => (
                    <div key={issue.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.82rem" }}>
                      <span style={{ color: "#d97706", fontWeight: 700, marginTop: "0.1rem" }}>▢</span>
                      <div>
                        <span style={{ fontWeight: 700, color: "#0a2540" }}>{issue.issue_number}</span>
                        {" — "}
                        <span style={{ color: "#444" }}>{issue.description}</span>
                        <span style={{ color: "#888" }}> ({issue.branch_code}{issue.department ? ` · ${issue.department}` : ""})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sap-border)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1500px" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>☐</th>
                    <th style={thStyle}>Issue #</th>
                    <th style={{ ...thStyle, minWidth: "220px" }}>Issue Description</th>
                    <th style={thStyle}>Date Noted</th>
                    <th style={thStyle}>Branch</th>
                    <th style={thStyle}>Department</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Minor / Major</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, minWidth: "150px" }}>Pictures</th>
                    <th style={{ ...thStyle, width: "30px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((issue) => {
                    const sc = statusColors[issue.status] || statusColors["Open"];
                    const cc = categoryColors[issue.category] || categoryColors["Non issue"];
                    return (
                      <React.Fragment key={issue.id}>
                        <tr style={{ background: issue.repeated ? "#fffbeb" : "#fff" }}>
                          <td style={{ ...tdStyle, textAlign: "center", fontSize: "0.95rem", color: "#d97706" }}>
                            {issue.repeated ? "☑" : "☐"}
                          </td>
                          <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap" }}>{issue.issue_number}</td>
                          <td style={{ ...tdStyle, maxWidth: "220px" }}>{issue.description}</td>
                          <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{issue.date}</td>
                          <td style={tdStyle}>
                            <span className="sap-branch-code-tag">{issue.branch_code || "—"}</span>
                          </td>
                          <td style={tdStyle}>
                            <select
                              value={issue.department}
                              disabled={updatingId === issue.id}
                              onChange={(e) => updateEntry(issue.id, "department", e.target.value)}
                              style={selectStyle}
                            >
                              {departments.map((d) => <option key={d.id} value={d.name}>{d.code} · {d.name}</option>)}
                            </select>
                          </td>
                          <td style={tdStyle}>
                            <select
                              value={issue.category}
                              disabled={updatingId === issue.id}
                              onChange={(e) => updateEntry(issue.id, "category", e.target.value)}
                              style={{ ...selectStyle, background: cc.bg, borderColor: cc.border, color: cc.text, fontWeight: 600 }}
                            >
                              {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td style={tdStyle}>
                            <select
                              value={issue.severity || ""}
                              disabled={updatingId === issue.id}
                              onChange={(e) => updateEntry(issue.id, "severity", e.target.value)}
                              style={{ ...selectStyle, fontWeight: 600, color: issue.severity === "Major" ? "#b91c1c" : issue.severity === "Minor" ? "#d97706" : "#888" }}
                            >
                              <option value="">— Pick —</option>
                              {severityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={tdStyle}>
                            <select
                              value={issue.status}
                              disabled={updatingId === issue.id}
                              onChange={(e) => updateEntry(issue.id, "status", e.target.value)}
                              style={{ ...selectStyle, background: sc.bg, borderColor: sc.border, color: sc.text, fontWeight: 600 }}
                            >
                              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                              {issue.images && issue.images.map((img, i) => (
                                <div key={i} style={{ position: "relative" }}>
                                  <a href={img} target="_blank" rel="noopener noreferrer">
                                    <img src={img} alt={`pic ${i + 1}`} loading="lazy"
                                      style={{ width: 40, height: 40, objectFit: "cover", borderRadius: "4px", border: "1px solid #ddd" }} />
                                  </a>
                                  <button onClick={() => removeImage(issue.id, img)}
                                    style={{ position: "absolute", top: -5, right: -5, background: "#dc2626", border: "none", color: "#fff", width: 15, height: 15, borderRadius: "50%", fontSize: "0.6rem", lineHeight: 1, cursor: "pointer" }}>✕</button>
                                </div>
                              ))}
                              <label style={{ cursor: "pointer", background: uploadingId === issue.id ? "#e5e7eb" : "#f5f5f5", border: "1px dashed #d9d9d9", borderRadius: "4px", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", color: "#0070f3" }}>
                                {uploadingId === issue.id ? "⏳" : "+"}
                                <input type="file" accept="image/*" hidden
                                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(issue.id, f); e.target.value = ""; }}
                                  disabled={uploadingId === issue.id} />
                              </label>
                            </div>
                          </td>
                          <td style={{ ...tdStyle, textAlign: "center" }}>
                            <button onClick={() => toggleRow(issue.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", padding: "0.2rem" }}>
                              {expandedRows.has(issue.id) ? "▼" : "▶"}
                            </button>
                          </td>
                        </tr>
                        {expandedRows.has(issue.id) && (
                          <tr>
                            <td colSpan={11} style={{ ...tdStyle, background: "#fafafa", padding: "1rem" }}>
                              <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>Full Description</div>
                              <p style={{ fontSize: "0.8rem", color: "#444", margin: "0" }}>{issue.description}</p>
                              {issue.images && issue.images.length > 0 && (
                                <>
                                  <div style={{ fontSize: "0.8rem", fontWeight: 600, marginTop: "1rem", marginBottom: "0.3rem" }}>Pictures</div>
                                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                                    {issue.images.map((img, i) => (
                                      <a key={i} href={img} target="_blank" rel="noopener noreferrer">
                                        <img src={img} alt={`pic ${i + 1}`} loading="lazy"
                                          style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "6px", border: "1px solid #ddd" }} />
                                      </a>
                                    ))}
                                  </div>
                                </>
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
          </div>
        )}
      </div>
    </div>
  );
}