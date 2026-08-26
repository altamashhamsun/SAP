"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Department {
  id: string;
  branch_id: string;
  name: string;
  code: string;
  standards: string;
}

interface Audit {
  id: string;
  branch_id: string;
  department_id: string;
  objective: string;
  start_date: string;
  end_date: string;
  branches?: Branch;
  departments?: Department;
}

interface AuditPlan {
  id: string;
  audit_id: string;
  audit_objective: string;
}

interface ChecklistItem {
  id: string;
  audit_plan_id: string;
  audit_id: string;
  department_id: string;
  list_type: string;
  items: string[];
  audit_date: string | null;
  created_at: string;
}

interface FindingItem {
  original: string;
  rephrased: string;
  clause: string;
  severity: string;
  corrective_action: string;
  preventive_action: string;
}

interface AuditFinding {
  id: string;
  checklist_id: string;
  audit_plan_id: string;
  audit_id: string;
  department_id: string;
  branch_id: string;
  raw_items: string[];
  rephrased_findings: FindingItem[];
  processed: boolean;
  audit_date: string | null;
  images?: string[];
}

interface DateGroup {
  date: string;
  objective: string;
  planId: string;
  departments: {
    deptId: string;
    deptName: string;
    deptCode: string;
    standards: string;
    checklist: ChecklistItem | undefined;
    finding: AuditFinding | undefined;
  }[];
}

interface BranchGroup {
  branchId: string;
  branchCode: string;
  branchName: string;
  dateGroups: DateGroup[];
}

export default function FindingsObservations() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [plans, setPlans] = useState<AuditPlan[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);
  const [findings, setFindings] = useState<AuditFinding[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [view, setView] = useState<"branches" | "dates" | "details">("branches");
  const [selectedBranch, setSelectedBranch] = useState<BranchGroup | null>(null);
  const [selectedDate, setSelectedDate] = useState<DateGroup | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [processingDept, setProcessingDept] = useState<string | null>(null);
  const [processingAll, setProcessingAll] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [supabase.auth]);

  useEffect(() => {
    if (user) fetchAll();
  }, [user]);

  const fetchAll = async () => {
    const [auditsRes, plansRes, checklistsRes, findingsRes, deptRes] = await Promise.all([
      supabase.from("audits").select("*, branches(id, name, code), departments(id, name, code)").order("start_date"),
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const branchGroups: BranchGroup[] = useMemo(() => {
    const plansWithChecklists = plans.filter((p) =>
      checklists.some((c) => c.audit_plan_id === p.id && c.items.length > 0)
    );

    const branchMap = new Map<string, BranchGroup>();

    for (const plan of plansWithChecklists) {
      const planAudit = audits.find((a) => a.id === plan.audit_id);
      if (!planAudit) continue;

      const relatedAudits = audits.filter(
        (a) =>
          a.branch_id === planAudit.branch_id &&
          a.start_date === planAudit.start_date &&
          a.end_date === planAudit.end_date &&
          a.objective === planAudit.objective
      );

      const planChecklists = checklists.filter(
        (c) => c.audit_plan_id === plan.id && c.items.length > 0
      );

      const auditDate = planChecklists.find((c) => c.audit_date)?.audit_date?.split("T")[0] || planAudit.start_date;

      const branchId = planAudit.branch_id;
      if (!branchMap.has(branchId)) {
        branchMap.set(branchId, {
          branchId,
          branchCode: planAudit.branches?.code || "—",
          branchName: planAudit.branches?.name || "—",
          dateGroups: [],
        });
      }

      const branch = branchMap.get(branchId)!;
      const dateKey = `${auditDate}|${plan.audit_id}`;
      let dateGroup = branch.dateGroups.find((dg) => dg.date === auditDate && dg.planId === plan.id);

      if (!dateGroup) {
        dateGroup = {
          date: auditDate,
          objective: planAudit.objective,
          planId: plan.id,
          departments: [],
        };
        branch.dateGroups.push(dateGroup);
      }

      for (const cl of planChecklists) {
        const audit = relatedAudits.find((a) => a.department_id === cl.department_id);
        if (!audit) continue;
        const dept = departments.find((d) => d.id === cl.department_id) || audit.departments;
        const existingFinding = findings.find((f) => f.checklist_id === cl.id);

        if (!dateGroup.departments.find((d) => d.deptId === cl.department_id)) {
          dateGroup.departments.push({
            deptId: cl.department_id,
            deptName: dept?.name || "—",
            deptCode: dept?.code || "—",
            standards: dept?.standards || "",
            checklist: cl,
            finding: existingFinding,
          });
        }
      }
    }

    return Array.from(branchMap.values());
  }, [audits, plans, checklists, findings, departments]);

  useEffect(() => {
    if (!selectedBranch || !selectedDate) return;
    const freshBranch = branchGroups.find((bg) => bg.branchId === selectedBranch.branchId);
    if (!freshBranch) return;
    const freshDate = freshBranch.dateGroups.find((dg) => dg.planId === selectedDate.planId);
    if (freshDate && freshDate !== selectedDate) {
      setSelectedBranch(freshBranch);
      setSelectedDate(freshDate);
    }
  }, [branchGroups, selectedBranch?.branchId, selectedDate?.planId]);

  const processWithAI = async (deptData: DateGroup["departments"][0]) => {
    if (!deptData.checklist) return;
    setProcessingDept(deptData.deptId);
    setError("");

    try {
      const res = await fetch("/api/process-findings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: deptData.checklist.items,
          standards: deptData.standards,
          departmentName: deptData.deptName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process findings");
        setProcessingDept(null);
        return;
      }

      const cl = deptData.checklist!;
      const auditDate = cl.audit_date?.split("T")[0] || null;

      if (deptData.finding) {
        await supabase
          .from("audit_findings")
          .update({
            raw_items: deptData.checklist!.items,
            rephrased_findings: data.findings,
            processed: true,
            updated_at: new Date().toISOString(),
          })
          .eq("id", deptData.finding.id);
      } else {
        await supabase.from("audit_findings").insert({
          checklist_id: cl.id,
          audit_plan_id: cl.audit_plan_id,
          audit_id: cl.audit_id,
          department_id: deptData.deptId,
          branch_id: selectedBranch?.branchId || "",
          raw_items: deptData.checklist!.items,
          rephrased_findings: data.findings,
          processed: true,
          audit_date: auditDate,
        });
      }

      await fetchAll();
      setSuccess(`Findings processed for ${deptData.deptName}`);
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(`Error: ${err}`);
    }

    setProcessingDept(null);
  };

  const processAllDepartments = async () => {
    if (!selectedDate) return;
    const unprocessed = selectedDate.departments.filter((dd) => dd.checklist && dd.checklist.items.length > 0 && !dd.finding?.processed);
    if (unprocessed.length === 0) return;

    setProcessingAll(true);
    setError("");

    for (const dd of unprocessed) {
      setProcessingDept(dd.deptId);
      try {
        const res = await fetch("/api/process-findings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: dd.checklist!.items,
            standards: dd.standards,
            departmentName: dd.deptName,
          }),
        });
        const data = await res.json();
        if (!res.ok) continue;

        const cl = dd.checklist!;
        const auditDate = cl.audit_date?.split("T")[0] || null;

        if (dd.finding) {
          await supabase.from("audit_findings").update({
            raw_items: cl.items,
            rephrased_findings: data.findings,
            processed: true,
            updated_at: new Date().toISOString(),
          }).eq("id", dd.finding.id);
        } else {
          await supabase.from("audit_findings").insert({
            checklist_id: cl.id,
            audit_plan_id: cl.audit_plan_id,
            audit_id: cl.audit_id,
            department_id: dd.deptId,
            branch_id: selectedBranch?.branchId || "",
            raw_items: cl.items,
            rephrased_findings: data.findings,
            processed: true,
            audit_date: auditDate,
          });
        }
      } catch {
        continue;
      }
    }

    await fetchAll();
    setProcessingDept(null);
    setProcessingAll(false);
    setSuccess(`Processed ${unprocessed.length} department${unprocessed.length > 1 ? "s" : ""}`);
    setTimeout(() => setSuccess(""), 2000);
  };

  const uploadImage = async (findingId: string, file: File) => {
    setUploadingImage(findingId);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/cloudinary", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        alert(`Upload failed: ${uploadData.error}`);
        setUploadingImage(null);
        return;
      }

      const currentFinding = findings.find((f) => f.id === findingId);
      const currentImages = currentFinding?.images || [];
      const newImages = [...currentImages, uploadData.url];

      const { error: dbError } = await supabase
        .from("audit_findings")
        .update({ images: newImages })
        .eq("id", findingId);

      if (dbError) {
        alert(`DB error: ${dbError.message}`);
        setUploadingImage(null);
        return;
      }

      await fetchAll();
      setUploadingImage(null);
      setSuccess("Image uploaded!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      alert(`Error: ${String(err)}`);
      setUploadingImage(null);
    }
  };

  const removeImage = async (findingId: string, publicId: string) => {
    setDeletingImage(publicId);
    try {
      await fetch("/api/cloudinary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: publicId }),
      });

      const currentFinding = findings.find((f) => f.id === findingId);
      if (!currentFinding) return;
      const newImages = (currentFinding.images || []).filter((img) => {
        const id = typeof img === "string" ? img.split("/").pop()?.split(".")[0] || img : String(img);
        return id !== publicId;
      });
      await supabase.from("audit_findings").update({ images: newImages }).eq("id", findingId);

      await fetchAll();
    } catch (err) {
      setError(`Delete failed: ${err}`);
    }
    setDeletingImage(null);
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
        <Link href="/modules/core-audit-management" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Core Audit Management
        </Link>
        <h1>Findings & Observations Log</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        {branchGroups.length === 0 ? (
          <p className="sap-empty-msg">No findings yet. Complete audit checklists first, then process them here.</p>
        ) : (
          <>
            {view === "branches" && (
              <div>
                <h3 style={{ marginBottom: "1rem" }}>Branches</h3>
                <div className="sap-plans-list">
                  {branchGroups.map((bg) => (
                    <div key={bg.branchId} className="sap-plan-card" style={{ cursor: "pointer" }}
                      onClick={() => { setSelectedBranch(bg); setView("dates"); }}>
                      <div className="sap-plan-card-header">
                        <div>
                          <span className="sap-branch-code-tag">{bg.branchCode}</span>
                          <span className="sap-plan-card-title">{bg.branchName}</span>
                        </div>
                      </div>
                      <div className="sap-plan-card-summary">{bg.dateGroups.length} audit date{bg.dateGroups.length !== 1 ? "s" : ""}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === "dates" && selectedBranch && (
              <div>
                <div style={{ marginBottom: "1rem" }}>
                  <button className="sap-action-btn" onClick={() => { setView("branches"); setSelectedBranch(null); setSelectedDate(null); }}>
                    ← Back to Branches
                  </button>
                </div>
                <h3 style={{ marginBottom: "1rem" }}>
                  <span className="sap-branch-code-tag">{selectedBranch.branchCode}</span> {selectedBranch.branchName}
                </h3>
                <div className="sap-plans-list">
                  {selectedBranch.dateGroups.map((dg, i) => (
                    <div key={i} className="sap-plan-card" style={{ cursor: "pointer" }}
                      onClick={() => { setSelectedDate(dg); setView("details"); setExpandedDept(null); }}>
                      <div className="sap-plan-card-header">
                        <div><span className="sap-plan-card-title">{dg.date}</span></div>
                      </div>
                      <div className="sap-plan-card-summary">{dg.objective}</div>
                      <div className="sap-plan-card-summary" style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#666" }}>
                        {dg.departments.length} department{dg.departments.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {view === "details" && selectedDate && selectedBranch && (
              <div>
                <div style={{ marginBottom: "1rem" }}>
                  <button className="sap-action-btn" onClick={() => { setView("dates"); setSelectedDate(null); setExpandedDept(null); }}>
                    ← Back to Dates
                  </button>
                </div>
                <div className="sap-plan-form-section" style={{ marginBottom: "1.5rem" }}>
                  <div className="sap-plan-form-header">
                    <h3>
                      <span className="sap-branch-code-tag">{selectedBranch.branchCode}</span>
                      {" "}{selectedBranch.branchName} — {selectedDate.date}
                    </h3>
                    {selectedDate.departments.some((dd) => dd.checklist && dd.checklist.items.length > 0 && !dd.finding?.processed) && (
                      <button className="sap-login-button" style={{ marginLeft: "auto", padding: "0.5rem 1.25rem", fontSize: "0.85rem" }}
                        onClick={processAllDepartments} disabled={processingAll}>
                        {processingAll ? "Processing All..." : `Process All with AI (${selectedDate.departments.filter((dd) => dd.checklist && dd.checklist.items.length > 0 && !dd.finding?.processed).length})`}
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: "0.85rem", color: "#666" }}>{selectedDate.objective}</div>
                </div>

                <div className="sap-checklist-dept-list">
                  {selectedDate.departments.map((dd) => {
                    const isExpanded = expandedDept === dd.deptId;
                    const hasItems = dd.checklist && dd.checklist.items.length > 0;
                    const isProcessed = dd.finding?.processed;
                    const isProcessing = processingDept === dd.deptId;

                    return (
                      <div key={dd.deptId} className="sap-checklist-dept-card">
                        <div className="sap-checklist-dept-header"
                          onClick={() => hasItems && setExpandedDept(isExpanded ? null : dd.deptId)}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            {hasItems && <span className="sap-expand-btn">{isExpanded ? "▼" : "▶"}</span>}
                            <span className="sap-dept-tag">{dd.deptCode}</span>
                            <span style={{ fontWeight: 500 }}>{dd.deptName}</span>
                            {isProcessed && <span style={{ fontSize: "0.75rem", color: "var(--sap-success)", fontWeight: 500 }}>✓ Processed</span>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {hasItems && !isProcessed && (
                              <button className="sap-login-button" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}
                                onClick={(e) => { e.stopPropagation(); processWithAI(dd); }}
                                disabled={isProcessing}>
                                {isProcessing ? "Processing..." : "Process with AI"}
                              </button>
                            )}
                            <span style={{ fontSize: "0.8rem", color: "#999" }}>
                              {hasItems ? `${dd.checklist!.items.length} finding${dd.checklist!.items.length !== 1 ? "s" : ""}` : "No findings"}
                            </span>
                          </div>
                        </div>

                        {isExpanded && hasItems && (
                          <div className="sap-checklist-dept-body">
                            <div style={{ marginBottom: "0.75rem", fontSize: "0.8rem", color: "#666" }}>
                              <strong>Standards:</strong> {dd.standards || "None assigned"}
                            </div>

                            {!isProcessed && dd.checklist && (
                              <div className="sap-findings-raw">
                                <h4 style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>Original Findings:</h4>
                                <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
                                  {dd.checklist.items.filter(Boolean).map((item, idx) => (
                                    <li key={idx} style={{ fontSize: "0.85rem", marginBottom: "0.25rem", color: "#555" }}>{item}</li>
                                  ))}
                                </ol>
                              </div>
                            )}

                            {isProcessed && dd.finding && (
                              <div className="sap-findings-processed">
                                {dd.finding.rephrased_findings.map((f, idx) => (
                                  <div key={idx} className="sap-finding-card">
                                    <div className="sap-finding-header">
                                      <span className={`sap-finding-severity sap-severity-${f.severity.toLowerCase().replace(/\s+/g, "-")}`}>
                                        {f.severity}
                                      </span>
                                      <span className="sap-finding-clause">{f.clause}</span>
                                    </div>
                                    <div className="sap-finding-body">
                                      <div className="sap-finding-field">
                                        <label>Finding:</label>
                                        <p>{f.rephrased}</p>
                                      </div>
                                      <div className="sap-finding-field">
                                        <label>Corrective Action:</label>
                                        <p>{f.corrective_action}</p>
                                      </div>
                                      <div className="sap-finding-field">
                                        <label>Preventive Action:</label>
                                        <p>{f.preventive_action}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}

                                <div style={{ marginTop: "1rem", borderTop: "1px solid var(--sap-border)", paddingTop: "0.75rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
                                    <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>Evidence Images</label>
                                    <label style={{ fontSize: "0.8rem", color: "#0070f3", cursor: "pointer", border: "1px dashed #0070f3", padding: "0.25rem 0.75rem", borderRadius: "4px" }}>
                                      {uploadingImage === dd.finding.id ? "Uploading..." : "+ Add Image"}
                                      <input type="file" accept="image/*" style={{ display: "none" }}
                                        disabled={uploadingImage === dd.finding.id}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) uploadImage(dd.finding!.id, file);
                                          e.target.value = "";
                                        }} />
                                    </label>
                                  </div>
                                  {(dd.finding.images || []).length > 0 && (
                                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                                      {(dd.finding.images || []).map((img, i) => {
                                        const imgObj = typeof img === "string" ? { url: img, public_id: img } : img;
                                        return (
                                          <div key={i} style={{ position: "relative" }}>
                                            <img src={imgObj.url} alt={`Evidence ${i + 1}`}
                                              style={{ width: 100, height: 100, objectFit: "cover", borderRadius: "6px", border: "1px solid var(--sap-border)" }} />
                                            <button onClick={() => removeImage(dd.finding!.id, imgObj.public_id)} disabled={deletingImage === imgObj.public_id}
                                              style={{ position: "absolute", top: -6, right: -6, background: "#dc2626", color: "#fff", border: "none", borderRadius: "50%", width: 20, height: 20, fontSize: "0.7rem", cursor: "pointer" }}>{deletingImage === imgObj.public_id ? "..." : "✕"}</button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {(dd.finding.images || []).length === 0 && (
                                    <p style={{ fontSize: "0.8rem", color: "#999" }}>No images uploaded yet</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
