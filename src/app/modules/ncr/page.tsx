"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; standards: string; branch_id: string; }
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
  created_at: string;
}

interface DeptWithNcrs {
  dept: Department;
  ncrs: NcrRecord[];
}

const statusOptions = ["Not Resolved", "In Progress", "Resolved", "Closed"] as const;
const statusColors: Record<string, { bg: string; border: string; text: string }> = {
  "Not Resolved": { bg: "#fef2f2", border: "#dc2626", text: "#dc2626" },
  "In Progress": { bg: "#eff6ff", border: "#2563eb", text: "#2563eb" },
  "Resolved": { bg: "#f0fdf4", border: "#16a34a", text: "#16a34a" },
  "Closed": { bg: "#f3f4f6", border: "#6b7280", text: "#6b7280" },
};

export default function NcrPage() {
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
      const d = n.created_at?.split("T")[0] || "";
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

  const totalNcrs = filteredNcrs.length;
  const resolvedCount = filteredNcrs.filter((n) => n.status === "Resolved" || n.status === "Closed").length;
  const openCount = filteredNcrs.filter((n) => n.status === "Not Resolved").length;
  const inProgressCount = filteredNcrs.filter((n) => n.status === "In Progress").length;
  const unresolvedCount = totalNcrs - resolvedCount;
  const resolutionRate = totalNcrs > 0 ? Math.round((resolvedCount / totalNcrs) * 100) : 0;

  const DateFilter = () => (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#555" }}>Date Range:</span>
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
      <span style={{ fontSize: "0.75rem", color: "#999" }}>{totalNcrs} NCRs in range</span>
    </div>
  );

  const ScoreCard = ({ label, value, color, icon }: { label: string; value: number | string; color: string; icon?: string }) => (
    <div style={{ textAlign: "center", padding: "1rem 1.5rem", background: `${color}11`, borderRadius: "10px", border: `1px solid ${color}33`, minWidth: "110px" }}>
      {icon && <div style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>{icon}</div>}
      <div style={{ fontSize: "1.75rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.7rem", color: "#666", marginTop: "0.35rem", fontWeight: 500 }}>{label}</div>
    </div>
  );

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
        <h1>Non-Conformities & CAPAs</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span><button onClick={() => setError("")} style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        {view === "branches" && (
          <div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <div style={{
                background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)",
                borderRadius: "16px",
                border: "1px solid #c7d2fe",
                padding: "1.5rem 2.5rem",
                boxShadow: "0 4px 12px rgba(0,112,243,0.08)",
                width: "100%",
                maxWidth: "700px",
              }}>
                <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0a2540", marginBottom: "0.25rem" }}>NCR Scoreboard</div>
                  <div style={{ fontSize: "0.75rem", color: "#666" }}>Overview of all Non-Conformities & Corrective Actions</div>
                </div>
                <DateFilter />
                <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <ScoreCard label="Total NCRs" value={totalNcrs} color="#0070f3" icon="📋" />
                  <ScoreCard label="Resolved" value={resolvedCount} color="#16a34a" icon="✅" />
                  <ScoreCard label="In Progress" value={inProgressCount} color="#2563eb" icon="🔄" />
                  <ScoreCard label="Open" value={openCount} color="#dc2626" icon="⚠️" />
                  <ScoreCard label="Resolution Rate" value={`${resolutionRate}%`} color={resolutionRate >= 70 ? "#16a34a" : resolutionRate >= 40 ? "#e97025" : "#dc2626"} icon="📊" />
                </div>
              </div>
            </div>

            <h3 style={{ marginBottom: "1rem" }}>Branches</h3>
            <div className="sap-plans-list">
              {branches.map((b) => {
                const bNcrs = filteredNcrs.filter((n) => n.branch_id === b.id);
                const count = bNcrs.length;
                if (count === 0) return null;
                const resolved = bNcrs.filter((n) => n.status === "Resolved" || n.status === "Closed").length;
                const inProg = bNcrs.filter((n) => n.status === "In Progress").length;
                const open = bNcrs.filter((n) => n.status === "Not Resolved").length;
                const rate = count > 0 ? Math.round((resolved / count) * 100) : 0;
                return (
                  <div key={b.id} className="sap-plan-card" style={{ cursor: "pointer" }}
                    onClick={() => { setSelectedBranch(b); setView("departments"); }}>
                    <div className="sap-plan-card-header">
                      <div>
                        <span className="sap-branch-code-tag">{b.code}</span>
                        <span className="sap-plan-card-title">{b.name}</span>
                      </div>
                    </div>
                    <div className="sap-plan-card-summary">
                      {count} NCR{count !== 1 ? "s" : ""}
                      {" · "}
                      <span style={{ color: "#16a34a" }}>{resolved} resolved</span>
                      {" · "}
                      <span style={{ color: "#2563eb" }}>{inProg} in progress</span>
                      {" · "}
                      <span style={{ color: "#dc2626" }}>{open} open</span>
                      {" · "}
                      <span style={{ fontWeight: 600 }}>{rate}%</span>
                    </div>
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

            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
              <div style={{
                background: "linear-gradient(135deg, #f8faff 0%, #eef2ff 100%)",
                borderRadius: "16px",
                border: "1px solid #c7d2fe",
                padding: "1.5rem 2.5rem",
                boxShadow: "0 4px 12px rgba(0,112,243,0.08)",
                width: "100%",
                maxWidth: "700px",
              }}>
                <div style={{ textAlign: "center", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0a2540", marginBottom: "0.25rem" }}>
                    <span className="sap-branch-code-tag" style={{ marginRight: "0.5rem" }}>{selectedBranch.code}</span>
                    Department NCR Scoreboard
                  </div>
                </div>
                <DateFilter />
                {(() => {
                  const branchNcrs = filteredNcrs.filter((n) => n.branch_id === selectedBranch.id);
                  const bTotal = branchNcrs.length;
                  const bResolved = branchNcrs.filter((n) => n.status === "Resolved" || n.status === "Closed").length;
                  const bInProgress = branchNcrs.filter((n) => n.status === "In Progress").length;
                  const bOpen = branchNcrs.filter((n) => n.status === "Not Resolved").length;
                  const bRate = bTotal > 0 ? Math.round((bResolved / bTotal) * 100) : 0;
                  return (
                    <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <ScoreCard label="Total NCRs" value={bTotal} color="#0070f3" icon="📋" />
                      <ScoreCard label="Resolved" value={bResolved} color="#16a34a" icon="✅" />
                      <ScoreCard label="In Progress" value={bInProgress} color="#2563eb" icon="🔄" />
                      <ScoreCard label="Open" value={bOpen} color="#dc2626" icon="⚠️" />
                      <ScoreCard label="Resolution Rate" value={`${bRate}%`} color={bRate >= 70 ? "#16a34a" : bRate >= 40 ? "#e97025" : "#dc2626"} icon="📊" />
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="sap-plans-list">
              {branchDepartments().map(({ dept, ncrs: dNcrs }) => {
                const resolved = dNcrs.filter((n) => n.status === "Resolved" || n.status === "Closed").length;
                const inProg = dNcrs.filter((n) => n.status === "In Progress").length;
                const open = dNcrs.filter((n) => n.status === "Not Resolved").length;
                const rate = dNcrs.length > 0 ? Math.round((resolved / dNcrs.length) * 100) : 0;
                return (
                  <div key={dept.id} className="sap-plan-card" style={{ cursor: "pointer" }}
                    onClick={() => { setSelectedDept(dept); setView("ncrs"); }}>
                    <div className="sap-plan-card-header">
                      <div>
                        <span className="sap-dept-tag">{dept.code}</span>
                        <span className="sap-plan-card-title">{dept.name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: "50%",
                          border: `3px solid ${rate >= 70 ? "#16a34a" : rate >= 40 ? "#e97025" : "#dc2626"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "0.75rem", fontWeight: 800,
                          color: rate >= 70 ? "#16a34a" : rate >= 40 ? "#e97025" : "#dc2626",
                        }}>
                          {rate}%
                        </div>
                      </div>
                    </div>
                    <div className="sap-plan-card-summary">
                      {dNcrs.length} NCR{dNcrs.length !== 1 ? "s" : ""}
                      {" · "}
                      <span style={{ color: "#16a34a" }}>{resolved} resolved</span>
                      {" · "}
                      <span style={{ color: "#2563eb" }}>{inProg} in progress</span>
                      {" · "}
                      <span style={{ color: "#dc2626" }}>{open} open</span>
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
              <NcrTable ncrs={deptNcrs()} updatingNcr={updatingNcr} updateNcr={updateNcr} supabase={supabase} branches={branches} departments={departments} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NcrTable({ ncrs, updatingNcr, updateNcr, supabase, branches, departments }: {
  ncrs: NcrRecord[];
  updatingNcr: string | null;
  updateNcr: (id: string, field: string, value: string) => Promise<void>;
  supabase: ReturnType<typeof createClient>;
  branches: Branch[];
  departments: Department[];
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

  return (
    <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sap-border)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1400px" }}>
        <thead>
          <tr>
            <th style={thStyle}>NCR #</th>
            <th style={{ ...thStyle, minWidth: "200px" }}>Description</th>
            <th style={thStyle}>Branch</th>
            <th style={thStyle}>Dept</th>
            <th style={thStyle}>ISO Standard</th>
            <th style={thStyle}>Clause #</th>
            <th style={thStyle}>Clause Name</th>
            <th style={thStyle}>Opening NCs</th>
            <th style={thStyle}>Closing NCs</th>
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
            return (
              <React.Fragment key={ncr.id}>
                <tr style={{ background: ncr.status === "Resolved" ? "#f0fff4" : ncr.status === "Closed" ? "#f9fafb" : "#fff" }}>
                  <td style={{ ...tdStyle, fontWeight: 600, whiteSpace: "nowrap" }}>{ncr.ncr_number}</td>
                  <td style={{ ...tdStyle, maxWidth: "200px" }}>{ncr.description}</td>
                  <td style={tdStyle}>{branchMap.get(ncr.branch_id) || "—"}</td>
                  <td style={tdStyle}>{deptMap.get(ncr.department_id) || "—"}</td>
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
                    <td colSpan={14} style={{ ...tdStyle, background: "#fafafa", padding: "1rem" }}>
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
