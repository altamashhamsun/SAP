"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Department { id: string; branch_id: string; name: string; code: string; standards: string; }
interface Audit { id: string; branch_id: string; department_id: string; objective: string; start_date: string; end_date: string; branches?: Branch; departments?: Department; }
interface AuditPlan { id: string; audit_id: string; audit_objective: string; audit_scope: string; audit_criteria: string; schedule_timetable: string; audit_methods: string; reporting_structure: string; }
interface ChecklistItem { id: string; audit_plan_id: string; audit_id: string; department_id: string; list_type: string; items: string[]; audit_date: string | null; }
interface FindingItem { original: string; rephrased: string; clause: string; severity: string; corrective_action: string; preventive_action: string; }
interface AuditFinding { id: string; checklist_id: string; audit_plan_id: string; audit_id: string; department_id: string; branch_id: string; raw_items: string[]; rephrased_findings: FindingItem[]; processed: boolean; audit_date: string | null; images?: string[]; }

interface ReportGroup {
  planId: string;
  branchCode: string;
  branchName: string;
  objective: string;
  start_date: string;
  end_date: string;
  plan: AuditPlan;
  departments: {
    deptId: string;
    deptName: string;
    deptCode: string;
    standards: string;
    checklist: ChecklistItem | undefined;
    finding: AuditFinding | undefined;
  }[];
}

export default function AuditReports() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [plans, setPlans] = useState<AuditPlan[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [selectedReport, setSelectedReport] = useState<ReportGroup | null>(null);
  const [signOffs, setSignOffs] = useState<Record<string, { signedBy: string; signedDate: string; role: string }>>({});
  const [showSignOff, setShowSignOff] = useState(false);
  const [signOffName, setSignOffName] = useState("");
  const [signOffRole, setSignOffRole] = useState("");
  const [profileName, setProfileName] = useState("");

  const reportRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data: prof } = await supabase.from("user_profiles").select("name").eq("user_id", user.id).maybeSingle();
      if (prof) setProfileName((prof as { name: string }).name || "");
      await fetchAll();
      setLoading(false);
    };
    init();
  }, []);

  const fetchAll = async () => {
    const [auditsRes, plansRes, checklistsRes, findingsRes, deptRes] = await Promise.all([
      supabase.from("audits").select("*, branches(id, name, code), departments(id, name, code, standards)").order("start_date"),
      supabase.from("audit_plans").select("*"),
      supabase.from("audit_checklists").select("*"),
      supabase.from("audit_findings").select("*"),
      supabase.from("departments").select("*"),
    ]);
    if (auditsRes.data) setAudits(auditsRes.data as Audit[]);
    if (plansRes.data) setPlans(plansRes.data as AuditPlan[]);
    if (checklistsRes.data) setChecklists(checklistsRes.data as ChecklistItem[]);
    if (findingsRes.data) setFindings(findingsRes.data as AuditFinding[]);
    if (deptRes.data) setDepartments(deptRes.data as Department[]);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login"); router.refresh(); };

  const reportGroups: ReportGroup[] = plans.map((plan) => {
    const planAudit = audits.find((a) => a.id === plan.audit_id);
    if (!planAudit) return null;
    const related = audits.filter((a) => a.branch_id === planAudit.branch_id && a.start_date === planAudit.start_date && a.end_date === planAudit.end_date && a.objective === planAudit.objective);
    const planChecklists = checklists.filter((c) => c.audit_plan_id === plan.id && c.items.length > 0);
    const depts = planChecklists.map((cl) => {
      const audit = related.find((a) => a.department_id === cl.department_id);
      const dept = departments.find((d) => d.id === cl.department_id) || audit?.departments;
      return {
        deptId: cl.department_id,
        deptName: dept?.name || "—",
        deptCode: dept?.code || "—",
        standards: dept?.standards || "",
        checklist: cl,
        finding: findings.find((f) => f.checklist_id === cl.id),
      };
    });
    return {
      planId: plan.id,
      branchCode: planAudit.branches?.code || "—",
      branchName: planAudit.branches?.name || "—",
      objective: planAudit.objective,
      start_date: planAudit.start_date,
      end_date: planAudit.end_date,
      plan,
      departments: depts,
    };
  }).filter(Boolean) as ReportGroup[];

  const handlePrint = () => {
    window.print();
  };

  const handleSignOff = () => {
    if (!selectedReport || !signOffName.trim() || !signOffRole.trim()) return;
    setSignOffs((prev) => ({
      ...prev,
      [selectedReport.planId]: {
        signedBy: signOffName.trim(),
        signedDate: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        role: signOffRole.trim(),
      },
    }));
    setShowSignOff(false);
    setSignOffName("");
    setSignOffRole("");
  };

  const getSeverityCount = (report: ReportGroup) => {
    let major = 0, minor = 0, obs = 0;
    for (const d of report.departments) {
      if (d.finding?.rephrased_findings) {
        for (const f of d.finding.rephrased_findings) {
          if (f.severity === "Major NC") major++;
          else if (f.severity === "Minor NC") minor++;
          else obs++;
        }
      }
    }
    return { major, minor, obs, total: major + minor + obs };
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

  if (!user) { router.push("/login"); return null; }

  return (
    <div className="sap-dashboard">
      <div className="sap-top-bar sap-no-print" style={{ justifyContent: "space-between" }}>
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

      <div className="sap-module-header sap-no-print">
        <Link href="/modules/core-audit-management" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Core Audit Management
        </Link>
        <h1>Audit Reports & Sign-off</h1>
      </div>

      <div className="sap-dashboard-content">
        {!selectedReport ? (
          <div>
            {reportGroups.length === 0 ? (
              <p className="sap-empty-msg">No audit plans found. Complete audit planning first.</p>
            ) : (
              <div className="sap-plans-list">
                {reportGroups.map((rg) => {
                  const sev = getSeverityCount(rg);
                  const signed = signOffs[rg.planId];
                  return (
                    <div key={rg.planId} className="sap-plan-card" style={{ cursor: "pointer" }}
                      onClick={() => setSelectedReport(rg)}>
                      <div className="sap-plan-card-header">
                        <div>
                          <span className="sap-branch-code-tag">{rg.branchCode}</span>
                          <span className="sap-plan-card-title">{rg.branchName}</span>
                        </div>
                        {signed && <span style={{ fontSize: "0.75rem", color: "var(--sap-success)", fontWeight: 500 }}>✓ Signed Off</span>}
                      </div>
                      <div className="sap-plan-card-dates">{rg.start_date} → {rg.end_date}</div>
                      <div className="sap-plan-card-summary">{rg.objective}</div>
                      <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", fontSize: "0.8rem", color: "#666" }}>
                        <span>{rg.departments.length} dept{rg.departments.length !== 1 ? "s" : ""}</span>
                        {sev.total > 0 && (
                          <>
                            {sev.major > 0 && <span style={{ color: "#dc2626" }}>{sev.major} Major NC</span>}
                            {sev.minor > 0 && <span style={{ color: "#d97706" }}>{sev.minor} Minor NC</span>}
                            {sev.obs > 0 && <span style={{ color: "#0284c7" }}>{sev.obs} Observation{sev.obs !== 1 ? "s" : ""}</span>}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="sap-no-print" style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
              <button className="sap-action-btn" onClick={() => setSelectedReport(null)}>← Back to Reports</button>
              <button className="sap-login-button" style={{ padding: "0.5rem 1.5rem", fontSize: "0.85rem" }} onClick={handlePrint}>
                Generate PDF
              </button>
              <button className="sap-action-btn" onClick={() => setShowSignOff(true)}>
                {signOffs[selectedReport.planId] ? "Update Sign-off" : "Sign Off"}
              </button>
            </div>

            {showSignOff && (
              <div className="sap-plan-form-section sap-no-print" style={{ marginBottom: "1rem" }}>
                <h3 style={{ marginBottom: "0.75rem" }}>Sign Off</h3>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                  <div className="sap-field-group" style={{ flex: 1 }}>
                    <label className="sap-field-label">Name</label>
                    <input className="sap-field-input" value={signOffName} onChange={(e) => setSignOffName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div className="sap-field-group" style={{ flex: 1 }}>
                    <label className="sap-field-label">Role</label>
                    <input className="sap-field-input" value={signOffRole} onChange={(e) => setSignOffRole(e.target.value)} placeholder="Your role" />
                  </div>
                  <button className="sap-login-button" style={{ marginBottom: "1rem" }} onClick={handleSignOff}>Confirm</button>
                  <button className="sap-cancel-btn" style={{ marginBottom: "1rem" }} onClick={() => setShowSignOff(false)}>Cancel</button>
                </div>
              </div>
            )}

            <div ref={reportRef} className="sap-report-printable">
              <div className="sap-report-header">
                <div className="sap-report-logo">
                  <svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg" style={{ width: 120 }}>
                    <rect x="0" y="5" width="30" height="30" rx="4" fill="#0070f3"/>
                    <text x="8" y="27" fontFamily="Arial" fontSize="18" fontWeight="bold" fill="#fff">Q</text>
                    <text x="40" y="28" fontFamily="Arial" fontSize="22" fontWeight="bold" fill="#0070f3">QAC</text>
                  </svg>
                </div>
                <h2 style={{ fontSize: "0.85rem", fontWeight: 400, color: "#666", margin: 0 }}>Quality Assurance & Compliance Department</h2>
                <h1 className="sap-report-title">Audit Report</h1>
                <div className="sap-report-meta">
                  <div><strong>Branch:</strong> {selectedReport.branchCode} — {selectedReport.branchName}</div>
                  <div><strong>Duration:</strong> {selectedReport.start_date} → {selectedReport.end_date}</div>
                  <div><strong>Audit Date:</strong> {selectedReport.departments.find((dd) => dd.checklist?.audit_date)?.checklist?.audit_date?.split("T")[0] || selectedReport.start_date}</div>
                  <div><strong>Objective:</strong> {selectedReport.objective}</div>
                  <div><strong>Departments Audited:</strong> {selectedReport.departments.length}</div>
                </div>
              </div>

              {(() => {
                const sev = getSeverityCount(selectedReport);
                if (sev.total === 0) return null;
                return (
                  <div className="sap-report-section">
                    <h2>Summary</h2>
                    <div className="sap-report-summary-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                      <div className="sap-summary-card"><div className="sap-summary-number">{sev.total}</div><div className="sap-summary-label">Total Findings</div></div>
                      <div className="sap-summary-card" style={{ borderLeftColor: "#dc2626" }}><div className="sap-summary-number" style={{ color: "#dc2626" }}>{sev.major}</div><div className="sap-summary-label">Major NC</div></div>
                      <div className="sap-summary-card" style={{ borderLeftColor: "#d97706" }}><div className="sap-summary-number" style={{ color: "#d97706" }}>{sev.minor}</div><div className="sap-summary-label">Minor NC</div></div>
                    </div>
                  </div>
                );
              })()}

              <div className="sap-report-section">
                <h2>1. Audit Plan</h2>
                <div className="sap-report-plan-fields">
                  {[
                    { label: "Audit Objective", value: selectedReport.plan.audit_objective },
                    { label: "Audit Scope", value: selectedReport.plan.audit_scope },
                    { label: "Audit Criteria", value: selectedReport.plan.audit_criteria },
                    { label: "Schedule & Timetable", value: selectedReport.plan.schedule_timetable },
                    { label: "Audit Methods", value: selectedReport.plan.audit_methods },
                    { label: "Reporting Structure", value: selectedReport.plan.reporting_structure },
                  ].filter((f) => f.value?.trim()).map((field) => (
                    <div key={field.label} className="sap-report-field">
                      <h4>{field.label}</h4>
                      <p>{field.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="sap-report-section">
                <h2>2. Audit Schedule</h2>
                <table className="sap-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr><th>Department</th><th>Code</th><th>ISO Standards</th><th>Audit Date</th></tr>
                  </thead>
                  <tbody>
                    {selectedReport.departments.map((dd) => (
                      <tr key={dd.deptId}>
                        <td>{dd.deptName}</td>
                        <td><span className="sap-branch-code-tag">{dd.deptCode}</span></td>
                        <td style={{ fontSize: "0.8rem" }}>{dd.standards || "—"}</td>
                        <td>{dd.checklist?.audit_date?.split("T")[0] || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="sap-report-section">
                <h2>3. Findings</h2>
                {selectedReport.departments.filter((dd) => dd.finding?.processed).length === 0 ? (
                  <p style={{ color: "#999", fontSize: "0.9rem" }}>No processed findings yet.</p>
                ) : (
                  selectedReport.departments.filter((dd) => dd.finding?.processed).map((dd) => (
                    <div key={dd.deptId} className="sap-report-dept-findings">
                      <h3><span className="sap-branch-code-tag">{dd.deptCode}</span> {dd.deptName}</h3>
                      <div className="sap-report-standards">Standards: {dd.standards || "None"}</div>
                      {dd.finding!.rephrased_findings.map((f, idx) => (
                        <div key={idx} className="sap-finding-card">
                          <div className="sap-finding-header">
                            <span className={`sap-finding-severity sap-severity-${f.severity.toLowerCase().replace(/\s+/g, "-")}`}>{f.severity}</span>
                            <span className="sap-finding-clause">{f.clause}</span>
                          </div>
                          <div className="sap-finding-body">
                            <div className="sap-finding-field"><label>Finding:</label><p>{f.rephrased}</p></div>
                            <div className="sap-finding-field"><label>Corrective Action:</label><p>{f.corrective_action}</p></div>
                            <div className="sap-finding-field"><label>Preventive Action:</label><p>{f.preventive_action}</p></div>
                          </div>
                        </div>
                      ))}
                      {(dd.finding!.images || []).length > 0 && (
                        <div style={{ marginTop: "0.75rem" }}>
                          <div style={{ fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.5rem", color: "#333" }}>Evidence Images:</div>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {(dd.finding!.images || []).map((img, i) => {
                              const imgUrl = typeof img === "string" ? img : String(img);
                              return (
                                <a key={i} href={imgUrl} target="_blank" rel="noopener noreferrer">
                                  <img src={imgUrl} alt={`Evidence ${i + 1}`} loading="lazy"
                                    style={{ width: 120, height: 120, objectFit: "cover", borderRadius: "6px", border: "1px solid var(--sap-border)" }} />
                                </a>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="sap-report-section">
                <h2>4. Sign-off</h2>
                {signOffs[selectedReport.planId] ? (
                  <div className="sap-report-signoff">
                    <div><strong>Signed by:</strong> {signOffs[selectedReport.planId].signedBy}</div>
                    <div><strong>Role:</strong> {signOffs[selectedReport.planId].role}</div>
                    <div><strong>Date:</strong> {signOffs[selectedReport.planId].signedDate}</div>
                  </div>
                ) : (
                  <div className="sap-report-signoff-blank">
                    <div className="sap-signoff-line">
                      <div>Authorized Signature: _________________________</div>
                      <div>Date: _______________</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sap-report-section">
                <h2>5. Reported by</h2>
                <div className="sap-report-signoff">
                  <div><strong>Reported by:</strong> {profileName || user?.email || "—"}</div>
                  <div><strong>Department:</strong> Quality Assurance and Compliance.</div>
                  <div style={{ marginTop: "0.5rem" }}>
                    <img src="/qa-signature.png" alt="Signature" style={{ width: 150, maxWidth: "100%" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
