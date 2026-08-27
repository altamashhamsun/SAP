"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; branch_id: string; }
interface NcrRecord {
  id: string;
  branch_id: string;
  department_id: string;
  status: string;
  opening_ncs: string | null;
  closing_ncs: string | null;
}

interface PerfRow {
  id: string;
  code: string;
  name: string;
  branchCode?: string;
  total: number;
  resolved: number;
  rate: number;
}

export default function ReportingAnalytics() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [ncrs, setNcrs] = useState<NcrRecord[]>([]);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const [branchesRes, deptsRes, ncrsRes] = await Promise.all([
        supabase.from("branches").select("id,name,code").order("code"),
        supabase.from("departments").select("id,name,code,branch_id").order("code"),
        supabase.from("ncr_records").select("id,branch_id,department_id,status,opening_ncs,closing_ncs"),
      ]);
      if (branchesRes.data) setBranches(branchesRes.data);
      if (deptsRes.data) setDepartments(deptsRes.data);
      if (ncrsRes.data) setNcrs(ncrsRes.data as NcrRecord[]);
      setLoading(false);
    };
    init();
  }, []);

  const filteredNcrs = useMemo(() => {
    if (!dateFrom && !dateTo) return ncrs;
    return ncrs.filter((n) => {
      const d = n.opening_ncs || "";
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [ncrs, dateFrom, dateTo]);

  const rankBranches = useMemo<PerfRow[]>(() => {
    const map = new Map<string, PerfRow>();
    for (const b of branches) {
      const row: PerfRow = { id: b.id, code: b.code, name: b.name, total: 0, resolved: 0, rate: 0 };
      const nList = filteredNcrs.filter((n) => n.branch_id === b.id);
      row.total = nList.length;
      row.resolved = nList.filter((n) => n.status === "Resolved" || n.status === "Closed").length;
      row.rate = row.total > 0 ? Math.round((row.resolved / row.total) * 100) : 0;
      map.set(b.id, row);
    }
    return Array.from(map.values())
      .filter((r) => r.total > 0)
      .sort((a, b) => b.rate - a.rate || b.resolved - a.resolved || a.code.localeCompare(b.code));
  }, [branches, filteredNcrs]);

  const rankDepartments = useMemo<PerfRow[]>(() => {
    const map = new Map<string, PerfRow>();
    for (const d of departments) {
      const branch = branches.find((b) => b.id === d.branch_id);
      const row: PerfRow = { id: d.id, code: d.code, name: d.name, branchCode: branch?.code || "", total: 0, resolved: 0, rate: 0 };
      const nList = filteredNcrs.filter((n) => n.department_id === d.id);
      row.total = nList.length;
      row.resolved = nList.filter((n) => n.status === "Resolved" || n.status === "Closed").length;
      row.rate = row.total > 0 ? Math.round((row.resolved / row.total) * 100) : 0;
      map.set(d.id, row);
    }
    return Array.from(map.values())
      .filter((r) => r.total > 0)
      .sort((a, b) => b.rate - a.rate || b.resolved - a.resolved || a.code.localeCompare(b.code));
  }, [departments, branches, filteredNcrs]);

  const bestBranch = rankBranches[0];
  const bestDept = rankDepartments[0];

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

  const rateColor = (rate: number) => (rate >= 70 ? "#16a34a" : rate >= 40 ? "#e97025" : "#dc2626");

  const RankingTable = ({ rows, showBranch }: { rows: PerfRow[]; showBranch?: boolean }) => {
    if (rows.length === 0) return <p className="sap-empty-msg">No NCRs in this period.</p>;
    const maxRate = Math.max(...rows.map((r) => r.rate), 1);
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
        <thead>
          <tr>
            <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", background: "#0070f3", border: "1px solid #0060d0" }}>#</th>
            <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", background: "#0070f3", border: "1px solid #0060d0" }}>{showBranch ? "Department" : "Branch"}</th>
            {showBranch && <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", background: "#0070f3", border: "1px solid #0060d0" }}>Branch</th>}
            <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", background: "#0070f3", border: "1px solid #0060d0" }}>Observed NCRs</th>
            <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", background: "#0070f3", border: "1px solid #0060d0" }}>Resolved</th>
            <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#fff", background: "#0070f3", border: "1px solid #0060d0" }}>Resolution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const best = i === 0;
            return (
              <tr key={row.id} style={{ background: best ? "#fffbe6" : i % 2 ? "#f8fafc" : "#fff", borderBottom: "1px solid var(--sap-border)" }}>
                <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", fontWeight: 800, color: best ? "#d97706" : "#888" }}>
                  {best ? "🏆" : i + 1}
                </td>
                <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", fontWeight: best ? 800 : 500, color: best ? "#0a2540" : "#333" }}>
                  <span className="sap-dept-tag">{row.code}</span> {row.name}
                </td>
                {showBranch && <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.8rem", color: "#666" }}>{row.branchCode || "—"}</td>}
                <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", textAlign: "center", color: "#333" }}>{row.total}</td>
                <td style={{ padding: "0.6rem 0.75rem", fontSize: "0.85rem", textAlign: "center", color: "#16a34a", fontWeight: 600 }}>{row.resolved}</td>
                <td style={{ padding: "0.6rem 0.75rem", minWidth: "180px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ flex: 1, background: "#e5e7eb", borderRadius: "4px", height: "10px", overflow: "hidden" }}>
                      <div style={{ width: `${(row.rate / maxRate) * 100}%`, height: "100%", background: rateColor(row.rate), borderRadius: "4px" }}></div>
                    </div>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: rateColor(row.rate), minWidth: "45px", textAlign: "right" }}>{row.rate}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
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
        <h1>Reporting & Analytics</h1>
      </div>

      <div className="sap-dashboard-content">
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0a2540" }}>Performance Period:</span>
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
          {bestBranch && (
            <span style={{ fontSize: "0.75rem", color: "#888" }}>
              {dateFrom || dateTo
                ? `Showing NCRs opened ${dateFrom ? `from ${dateFrom}` : ""}${dateFrom && dateTo ? " " : ""}${dateTo ? `to ${dateTo}` : ""}.`
                : "Showing NCRs opened in all time."}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {bestBranch && (
            <div style={{ flex: 1, minWidth: "240px", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", borderRadius: "14px", border: "1px solid #fcd34d", padding: "1.25rem 1.5rem", boxShadow: "0 4px 12px rgba(217,119,6,0.12)" }}>
              <div style={{ fontSize: "2rem", lineHeight: 1 }}>🏆</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#b45309", marginTop: "0.5rem" }}>Best Performing Branch</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0a2540", marginTop: "0.25rem" }}>
                <span className="sap-branch-code-tag">{bestBranch.code}</span> {bestBranch.name}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.35rem" }}>
                {bestBranch.rate}% resolution · {bestBranch.resolved}/{bestBranch.total} NCRs solved
              </div>
            </div>
          )}
          {bestDept && (
            <div style={{ flex: 1, minWidth: "240px", background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)", borderRadius: "14px", border: "1px solid #cbd5e1", padding: "1.25rem 1.5rem", boxShadow: "0 4px 12px rgba(71,85,105,0.1)" }}>
              <div style={{ fontSize: "2rem", lineHeight: 1 }}>🏅</div>
              <div style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#475569", marginTop: "0.5rem" }}>Best Performing Department</div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0a2540", marginTop: "0.25rem" }}>
                <span className="sap-dept-tag">{bestDept.code}</span> {bestDept.name}
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.35rem" }}>
                <span className="sap-branch-code-tag">{bestDept.branchCode}</span> · {bestDept.rate}% resolution · {bestDept.resolved}/{bestDept.total} solved
              </div>
            </div>
          )}
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--sap-border)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--sap-border)", background: "#f8fafc" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#0a2540" }}>Branch Performance (Best First)</h3>
            <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.15rem" }}>Ranked by resolved NCRs <span style={{ fontWeight: 700 }}>÷</span> observed NCRs{(dateFrom || dateTo) ? ` (${dateFrom || "start"} to ${dateTo || "today"})` : ""}</div>
          </div>
          <div style={{ overflowX: "auto", padding: "0.75rem" }}>
            <RankingTable rows={rankBranches} />
          </div>
        </div>

        <div style={{ background: "#fff", border: "1px solid var(--sap-border)", borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", marginTop: "1.5rem" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--sap-border)", background: "#f8fafc" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "#0a2540" }}>Department Performance across All Branches (Best First)</h3>
            <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.15rem" }}>Ranked by resolved NCRs <span style={{ fontWeight: 700 }}>÷</span> observed NCRs{(dateFrom || dateTo) ? ` (${dateFrom || "start"} to ${dateTo || "today"})` : ""}</div>
          </div>
          <div style={{ overflowX: "auto", padding: "0.75rem" }}>
            <RankingTable rows={rankDepartments} showBranch />
          </div>
        </div>
      </div>
    </div>
  );
}