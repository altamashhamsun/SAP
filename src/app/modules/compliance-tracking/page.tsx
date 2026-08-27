"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Department { id: string; branch_id: string; name: string; code: string; standards: string; }
interface NcrRecord {
  id: string;
  ncr_number: string;
  finding_id: string;
  description: string;
  branch_id: string;
  department_id: string;
  iso_standard: string;
  clause_number: string;
  clause_name: string;
  opening_ncs: string | null;
  closing_ncs: string | null;
  corrective_action: string;
  preventive_action: string;
  status: string;
  communicated_to_bm: string;
  communicated_date: string | null;
  ncr_type: string;
  priority: string;
  priority_set_date: string | null;
  timeline_deadline: string | null;
  created_at: string;
}

interface DeptWithNcrs {
  dept: Department;
  ncrs: NcrRecord[];
}

const statusOptions = ["Not Resolved", "Resolved"] as const;
const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  "Not Resolved": { bg: "#fef2f2", border: "#dc2626", text: "#dc2626" },
  "Resolved": { bg: "#f0fdf4", border: "#16a34a", text: "#16a34a" },
};

const typeOptions = ["Minor", "Major"] as const;

const priorityConfig: Record<string, { label: string; days: number; color: string; bg: string }> = {
  Urgent: { label: "Urgent", days: 1, color: "#dc2626", bg: "#fef2f2" },
  High: { label: "High", days: 3, color: "#e97025", bg: "#fff7ed" },
  Medium: { label: "Medium", days: 7, color: "#d97706", bg: "#fffbeb" },
  Low: { label: "Low", days: 10, color: "#16a34a", bg: "#f0fdf4" },
};

const DAYS_FOR_PRIORITY: Record<string, number> = {
  Urgent: 1,
  High: 3,
  Medium: 7,
  Low: 10,
};

export default function ComplianceTracking() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ncrs, setNcrs] = useState<NcrRecord[]>([]);

  const [view, setView] = useState<"branches" | "departments" | "ncrs">("branches");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  const [updatingNcr, setUpdatingNcr] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const [branchesRes, deptsRes, ncrsRes] = await Promise.all([
        supabase.from("branches").select("*").order("code"),
        supabase.from("departments").select("*").order("code"),
        supabase.from("ncr_records").select("*").order("ncr_number"),
      ]);
      if (branchesRes.data) setBranches(branchesRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
      if (ncrsRes.data) setNcrs(ncrsRes.data as NcrRecord[]);
      setLoading(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const filteredNcrs = useMemo(() => {
    if (!dateFrom && !dateTo) return ncrs;
    return ncrs.filter((n) => {
      const d = n.opening_ncs || "";
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [ncrs, dateFrom, dateTo]);

  const branchDepartments = (): DeptWithNcrs[] => {
    if (!selectedBranch) return [];
    const deptMap = new Map<string, DeptWithNcrs>();
    for (const dept of departments.filter((d) => d.branch_id === selectedBranch.id)) {
      deptMap.set(dept.id, { dept, ncrs: [] });
    }
    for (const ncr of filteredNcrs.filter((n) => n.branch_id === selectedBranch.id)) {
      const entry = deptMap.get(ncr.department_id);
      if (entry) entry.ncrs.push(ncr);
    }
    return Array.from(deptMap.values()).filter((d) => d.ncrs.length > 0);
  };

  const deptNcrs = (): NcrRecord[] => {
    if (!selectedBranch || !selectedDept) return [];
    return filteredNcrs.filter((n) => n.branch_id === selectedBranch.id && n.department_id === selectedDept.id);
  };

  const computeDeadline = (priority: string, fromDate?: string | null): string => {
    const days = DAYS_FOR_PRIORITY[priority] ?? 10;
    const base = fromDate || new Date().toISOString().split("T")[0];
    const dt = new Date(base);
    dt.setDate(dt.getDate() + days);
    return dt.toISOString().split("T")[0];
  };

  const updateNcr = async (ncrId: string, field: string, value: string) => {
    setUpdatingNcr(ncrId);
    setError("");
    const updateData: Record<string, string | null> = { [field]: value, updated_at: new Date().toISOString() };
    if (field === "status" && value === "Resolved" && !ncrs.find((n) => n.id === ncrId)?.closing_ncs) {
      updateData.closing_ncs = new Date().toISOString().split("T")[0];
    }
    if (field === "communicated_to_bm" && value === "Yes") {
      updateData.communicated_date = new Date().toISOString().split("T")[0];
    }
    if (field === "communicated_to_bm" && value === "No") {
      updateData.communicated_date = null;
    }
    if (field === "priority") {
      const ncr = ncrs.find((n) => n.id === ncrId);
      const setDate = new Date().toISOString().split("T")[0];
      updateData.priority_set_date = setDate;
      updateData.timeline_deadline = computeDeadline(value, setDate);
    }
    if (field === "ncr_type") {
      updateData.closing_ncs = ncrs.find((n) => n.id === ncrId)?.closing_ncs || null;
    }

    const { error: dbErr } = await supabase.from("ncr_records").update(updateData).eq("id", ncrId);
    if (dbErr) {
      setError(`Update failed: ${dbErr.message}`);
    } else {
      setNcrs((prev) => prev.map((n) => n.id === ncrId ? { ...n, ...updateData } : n));
    }
    setUpdatingNcr(null);
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

  const DateFilter = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#555" }}>Opening Date Range:</span>
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
      <span style={{ fontSize: "0.75rem", color: "#999" }}>
        Urgent=1d · High=3d · Medium=7d · Low=10d
      </span>
    </div>
  );

  const deadlineCellStyle = (deadline: string | null, status: string) => {
    if (!deadline || status === "Resolved") return { bg: "#f9fafb", color: "#999" };
    const today = new Date().toISOString().split("T")[0];
    if (deadline < today) return { bg: "#fef2f2", color: "#dc2626" };
    const diff = Math.ceil((new Date(deadline).getTime() - new Date(today).getTime()) / 86400000);
    if (diff <= 1) return { bg: "#fffbeb", color: "#d97706" };
    return { bg: "#f0fdf4", color: "#16a34a" };
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
        <Link href="/dashboard" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </Link>
        <h1>Compliance Tracking</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span><button onClick={() => setError("")} style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        {view === "branches" && (
          <div>
            <DateFilter />
            <h3 style={{ marginBottom: "1rem" }}>Branches</h3>
            <div className="sap-plans-list">
              {branches.map((b) => {
                const count = filteredNcrs.filter((n) => n.branch_id === b.id).length;
                if (count === 0) return null;
                return (
                  <div key={b.id} className="sap-plan-card" style={{ cursor: "pointer" }}
                    onClick={() => { setSelectedBranch(b); setView("departments"); }}>
                    <div className="sap-plan-card-header">
                      <div>
                        <span className="sap-branch-code-tag">{b.code}</span>
                        <span className="sap-plan-card-title">{b.name}</span>
                      </div>
                    </div>
                    <div className="sap-plan-card-summary">{count} NCR{count !== 1 ? "s" : ""}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "departments" && selectedBranch && (
          <div>
            <button className="sap-action-btn" onClick={() => { setView("branches"); setSelectedBranch(null); setSelectedDept(null); }}>
              ← Back to Branches
            </button>
            <h3 style={{ margin: "1rem 0" }}>
              <span className="sap-branch-code-tag">{selectedBranch.code}</span> {selectedBranch.name} — Departments
            </h3>
            <DateFilter />
            <div className="sap-plans-list">
              {branchDepartments().map(({ dept, ncrs: dNcrs }) => {
                const resolved = dNcrs.filter((n) => n.status === "Resolved").length;
                const major = dNcrs.filter((n) => n.ncr_type === "Major").length;
                return (
                  <div key={dept.id} className="sap-plan-card" style={{ cursor: "pointer" }}
                    onClick={() => { setSelectedDept(dept); setView("ncrs"); }}>
                    <div className="sap-plan-card-header">
                      <div>
                        <span className="sap-dept-tag">{dept.code}</span>
                        <span className="sap-plan-card-title">{dept.name}</span>
                      </div>
                    </div>
                    <div className="sap-plan-card-summary">
                      {dNcrs.length} NCR{dNcrs.length !== 1 ? "s" : ""}
                      {" · "}
                      <span style={{ color: "#dc2626" }}>{major} major</span>
                      {" · "}
                      <span style={{ color: "#16a34a" }}>{resolved} resolved</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === "ncrs" && selectedBranch && selectedDept && (
          <div>
            <button className="sap-action-btn" onClick={() => { setView("departments"); setSelectedDept(null); }}>
              ← Back to Departments
            </button>
            <h3 style={{ margin: "1rem 0" }}>
              <span className="sap-branch-code-tag">{selectedBranch.code}</span>{" "}
              <span className="sap-dept-tag">{selectedDept.code}</span> {selectedDept.name} — NCRs
            </h3>

            <DateFilter />

            {deptNcrs().length === 0 ? (
              <p className="sap-empty-msg">No NCRs for this department{dateFrom || dateTo ? " in the selected date range" : ""}.</p>
            ) : (
              <ComplianceTable ncrs={deptNcrs()} updatingNcr={updatingNcr} updateNcr={updateNcr} supabase={supabase} branches={branches} departments={departments}
                deadlineCellStyle={deadlineCellStyle} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ComplianceTable({ ncrs, updatingNcr, updateNcr, supabase, branches, departments, deadlineCellStyle }: {
  ncrs: NcrRecord[];
  updatingNcr: string | null;
  updateNcr: (id: string, field: string, value: string) => Promise<void>;
  supabase: ReturnType<typeof createClient>;
  branches: Branch[];
  departments: Department[];
  deadlineCellStyle: (deadline: string | null, status: string) => { bg: string; color: string };
}) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [rowImages, setRowImages] = useState<Record<string, string[]>>({});

  const branchMap = new Map(branches.map((b) => [b.id, b.code]));
  const deptMap = new Map(departments.map((d) => [d.id, d.code]));

  const toggleRow = async (ncrId: string, findingId: string) => {
    const next = new Set(expandedRows);
    if (next.has(ncrId)) {
      next.delete(ncrId);
    } else {
      next.add(ncrId);
      if (!rowImages[ncrId]) {
        const { data } = await supabase.from("audit_findings").select("images").eq("id", findingId).single();
        setRowImages((prev) => ({ ...prev, [ncrId]: (data?.images || []) as string[] }));
      }
    }
    setExpandedRows(next);
  };

  const thStyle: React.CSSProperties = {
    padding: "0.6rem 0.75rem",
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#fff",
    background: "#0070f3",
    border: "1px solid #0060d0",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };

  const tdStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem",
    fontSize: "0.78rem",
    border: "1px solid var(--sap-border)",
    verticalAlign: "top",
  };

  const selectStyle: React.CSSProperties = {
    padding: "0.25rem 0.5rem",
    fontSize: "0.75rem",
    border: "1px solid #ddd",
    borderRadius: "4px",
    background: "#fff",
    cursor: "pointer",
    minWidth: "110px",
  };

  const priorityStyle = (p: string): React.CSSProperties => {
    const cfg = priorityConfig[p] || priorityConfig["Low"];
    return { ...selectStyle, background: cfg.bg, borderColor: cfg.color, color: cfg.color, fontWeight: 600 };
  };

  return (
    <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sap-border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1700px" }}>
        <thead>
          <tr>
            <th style={thStyle}>NCR #</th>
            <th style={{ ...thStyle, minWidth: "200px" }}>Description</th>
            <th style={thStyle}>Branch</th>
            <th style={thStyle}>Dept</th>
            <th style={thStyle}>NCR Type</th>
            <th style={thStyle}>Priority</th>
            <th style={thStyle}>Timeline Deadline</th>
            <th style={thStyle}>ISO Standard</th>
            <th style={thStyle}>Clause #</th>
            <th style={thStyle}>Clause Name</th>
            <th style={thStyle}>Opening Date</th>
            <th style={thStyle}>Closing Date</th>
            <th style={{ ...thStyle, minWidth: "180px" }}>Corrective Action</th>
            <th style={{ ...thStyle, minWidth: "180px" }}>Preventive Action</th>
            <th style={thStyle}>Status</th>
            <th style={thStyle}>Comm. to BM</th>
            <th style={{ ...thStyle, width: "30px" }}></th>
          </tr>
        </thead>
        <tbody>
          {ncrs.map((ncr) => {
            const sc = statusColors[ncr.status] || statusColors["Not Resolved"];
            const dls = deadlineCellStyle(ncr.timeline_deadline, ncr.status);
            return (
              <React.Fragment key={ncr.id}>
                <tr style={{ background: ncr.status === "Resolved" ? "#f0fff4" : "#fff" }}>
                  <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap" }}>{ncr.ncr_number}</td>
                  <td style={{ ...tdStyle, maxWidth: "200px" }}>{ncr.description}</td>
                  <td style={tdStyle}>{branchMap.get(ncr.branch_id) || "—"}</td>
                  <td style={tdStyle}>{deptMap.get(ncr.department_id) || "—"}</td>
                  <td style={tdStyle}>
                    <select
                      value={ncr.ncr_type || "Minor"}
                      disabled={updatingNcr === ncr.id}
                      onChange={(e) => updateNcr(ncr.id, "ncr_type", e.target.value)}
                      style={{ ...selectStyle, background: ncr.ncr_type === "Major" ? "#fef2f2" : "#f0fdf4", borderColor: ncr.ncr_type === "Major" ? "#dc2626" : "#16a34a", color: ncr.ncr_type === "Major" ? "#dc2626" : "#16a34a", fontWeight: 600 }}
                    >
                      {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={ncr.priority || "Low"}
                      disabled={updatingNcr === ncr.id}
                      onChange={(e) => updateNcr(ncr.id, "priority", e.target.value)}
                      style={priorityStyle(ncr.priority || "Low")}
                    >
                      {Object.entries(priorityConfig).map(([key, cfg]) => (
                        <option key={key} value={key}>{cfg.label} ({cfg.days}d)</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ ...tdStyle, background: dls.bg }}>
                    <div style={{ color: dls.color, fontWeight: 700, whiteSpace: "nowrap" }}>{ncr.timeline_deadline || "—"}</div>
                    {ncr.timeline_deadline && ncr.status !== "Resolved" && (
                      (() => {
                        const today = new Date().toISOString().split("T")[0];
                        const diff = Math.ceil((new Date(ncr.timeline_deadline!).getTime() - new Date(today).getTime()) / 86400000);
                        return (
                          <div style={{ fontSize: "0.65rem", color: dls.color, marginTop: "0.2rem" }}>
                            {diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? "Due today" : `${diff}d left`}
                          </div>
                        );
                      })()
                    )}
                  </td>
                  <td style={tdStyle}>{ncr.iso_standard}</td>
                  <td style={tdStyle}>{ncr.clause_number}</td>
                  <td style={tdStyle}>{ncr.clause_name}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{ncr.opening_ncs || "—"}</td>
                  <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{ncr.closing_ncs || "—"}</td>
                  <td style={{ ...tdStyle, maxWidth: "180px", fontSize: "0.72rem" }}>{ncr.corrective_action}</td>
                  <td style={{ ...tdStyle, maxWidth: "180px", fontSize: "0.72rem" }}>{ncr.preventive_action}</td>
                  <td style={tdStyle}>
                    <select
                      value={ncr.status}
                      disabled={updatingNcr === ncr.id}
                      onChange={(e) => updateNcr(ncr.id, "status", e.target.value)}
                      style={{ ...selectStyle, background: sc.bg, borderColor: sc.border, color: sc.text, fontWeight: 600 }}
                    >
                      {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <select
                      value={ncr.communicated_to_bm}
                      disabled={updatingNcr === ncr.id}
                      onChange={(e) => updateNcr(ncr.id, "communicated_to_bm", e.target.value)}
                      style={selectStyle}
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                    {ncr.communicated_date && (
                      <div style={{ fontSize: "0.65rem", color: "#999", marginTop: "0.2rem" }}>{ncr.communicated_date}</div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    <button
                      onClick={() => toggleRow(ncr.id, ncr.finding_id)}
                      style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", padding: "0.2rem" }}
                      title="View evidence images"
                    >
                      {expandedRows.has(ncr.id) ? "▼" : "▶"}
                    </button>
                  </td>
                </tr>
                {expandedRows.has(ncr.id) && (
                  <tr>
                    <td colSpan={17} style={{ ...tdStyle, background: "#fafafa", padding: "1rem" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem" }}>Evidence Images</div>
                      {(!rowImages[ncr.id] || rowImages[ncr.id].length === 0) ? (
                        <span style={{ fontSize: "0.75rem", color: "#999" }}>No images</span>
                      ) : (
                        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                          {rowImages[ncr.id].map((img, i) => (
                            <a key={i} href={typeof img === "string" ? img : String(img)} target="_blank" rel="noopener noreferrer">
                              <img src={typeof img === "string" ? img : String(img)} alt={`Evidence ${i + 1}`} loading="lazy"
                                style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "6px", border: "1px solid #ddd" }} />
                            </a>
                          ))}
                        </div>
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
  );
}