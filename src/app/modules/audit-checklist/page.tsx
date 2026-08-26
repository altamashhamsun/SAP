"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
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
  audit_scope: string;
  audit_criteria: string;
  schedule_timetable: string;
  audit_methods: string;
  reporting_structure: string;
  created_at: string;
  updated_at: string;
}

interface ChecklistItem {
  id: string;
  audit_plan_id: string;
  audit_id: string;
  department_id: string;
  list_type: "numeric" | "bullet";
  items: string[];
  audit_date: string | null;
  created_at: string;
  updated_at: string;
}

interface AuditGroup {
  key: string;
  plan: AuditPlan;
  audits: Audit[];
  branchCode: string;
  branchName: string;
  objective: string;
  start_date: string;
  end_date: string;
}

export default function AuditChecklist() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [plans, setPlans] = useState<AuditPlan[]>([]);
  const [checklists, setChecklists] = useState<ChecklistItem[]>([]);

  const [selectedGroup, setSelectedGroup] = useState<AuditGroup | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saveStatuses, setSaveStatuses] = useState<Record<string, "idle" | "saving" | "saved">>({});

  const router = useRouter();
  const supabase = createClient();
  const saveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await fetchAll();
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    return () => {
      saveTimers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const fetchAll = async () => {
    const [auditsRes, plansRes, checklistsRes] = await Promise.all([
      supabase.from("audits").select("*, branches(id, name, code), departments(id, name, code)").order("start_date"),
      supabase.from("audit_plans").select("*").order("created_at", { ascending: false }),
      supabase.from("audit_checklists").select("*"),
    ]);
    if (auditsRes.data) setAudits(auditsRes.data as Audit[]);
    if (plansRes.data) setPlans(plansRes.data as AuditPlan[]);
    if (checklistsRes.data) setChecklists(checklistsRes.data as ChecklistItem[]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const auditGroups: AuditGroup[] = plans.map((plan) => {
    const planAudit = audits.find((a) => a.id === plan.audit_id);
    if (!planAudit) return null;
    const related = audits.filter(
      (a) =>
        a.branch_id === planAudit.branch_id &&
        a.start_date === planAudit.start_date &&
        a.end_date === planAudit.end_date &&
        a.objective === planAudit.objective
    );
    return {
      key: plan.id,
      plan,
      audits: related,
      branchCode: planAudit.branches?.code || "—",
      branchName: planAudit.branches?.name || "—",
      objective: planAudit.objective,
      start_date: planAudit.start_date,
      end_date: planAudit.end_date,
    };
  }).filter(Boolean) as AuditGroup[];

  const getChecklist = (auditPlanId: string, departmentId: string): ChecklistItem | undefined => {
    return checklists.find(
      (c) => c.audit_plan_id === auditPlanId && c.department_id === departmentId
    );
  };

  const saveChecklist = useCallback(async (planId: string, deptId: string, listType: string, items: string[]) => {
    const key = `${planId}|${deptId}`;
    setSaveStatuses((prev) => ({ ...prev, [key]: "saving" }));

    const existing = checklists.find(
      (c) => c.audit_plan_id === planId && c.department_id === deptId
    );

    if (existing) {
      const { error: err } = await supabase
        .from("audit_checklists")
        .update({ list_type: listType, items, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (!err) {
        setChecklists((prev) =>
          prev.map((c) =>
            c.id === existing.id ? { ...c, list_type: listType as "numeric" | "bullet", items, updated_at: new Date().toISOString() } : c
          )
        );
      }
    } else {
      const auditForDept = selectedGroup?.audits.find((a) => a.department_id === deptId);
      if (!auditForDept) return;
      const { data, error: err } = await supabase
        .from("audit_checklists")
        .insert({
          audit_plan_id: planId,
          audit_id: auditForDept.id,
          department_id: deptId,
          list_type: listType,
          items,
          audit_date: new Date().toISOString(),
        })
        .select()
        .single();
      if (!err && data) {
        setChecklists((prev) => [...prev, data as ChecklistItem]);
      }
    }

    setSaveStatuses((prev) => ({ ...prev, [key]: "saved" }));
    setTimeout(() => {
      setSaveStatuses((prev) => {
        if (prev[key] === "saved") {
          const next = { ...prev };
          delete next[key];
          return next;
        }
        return prev;
      });
    }, 1500);
  }, [checklists, supabase, selectedGroup]);

  const debouncedSave = (planId: string, deptId: string, listType: string, items: string[]) => {
    const timerKey = `${planId}|${deptId}`;
    if (saveTimers.current.has(timerKey)) clearTimeout(saveTimers.current.get(timerKey)!);
    saveTimers.current.set(
      timerKey,
      setTimeout(() => {
        saveChecklist(planId, deptId, listType, items);
        saveTimers.current.delete(timerKey);
      }, 800)
    );
  };

  const updateItemType = (planId: string, deptId: string, newType: "numeric" | "bullet") => {
    const existing = getChecklist(planId, deptId);
    const items = existing?.items || [];
    saveChecklist(planId, deptId, newType, items);
  };

  const addItem = (planId: string, deptId: string) => {
    const existing = getChecklist(planId, deptId);
    const items = [...(existing?.items || []), ""];
    debouncedSave(planId, deptId, existing?.list_type || "numeric", items);
    setChecklists((prev) => {
      const cl = prev.find((c) => c.audit_plan_id === planId && c.department_id === deptId);
      if (cl) {
        return prev.map((c) => c.id === cl.id ? { ...c, items } : c);
      }
      return prev;
    });
  };

  const updateItemText = (planId: string, deptId: string, index: number, value: string) => {
    const existing = getChecklist(planId, deptId);
    const items = [...(existing?.items || [])];
    items[index] = value;
    debouncedSave(planId, deptId, existing?.list_type || "numeric", items);
    setChecklists((prev) => {
      const cl = prev.find((c) => c.audit_plan_id === planId && c.department_id === deptId);
      if (cl) {
        return prev.map((c) => c.id === cl.id ? { ...c, items } : c);
      }
      return prev;
    });
  };

  const removeItem = (planId: string, deptId: string, index: number) => {
    const existing = getChecklist(planId, deptId);
    if (!existing) return;
    const items = existing.items.filter((_, i) => i !== index);
    saveChecklist(planId, deptId, existing.list_type, items);
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
        <h1>Audit Checklists</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        {!selectedGroup && (
          <>
            {auditGroups.length === 0 ? (
              <p className="sap-empty-msg">No audit plans created yet. Create a plan first in Audit Planning.</p>
            ) : (
              <div className="sap-plans-list">
                {auditGroups.map((group) => (
                  <div key={group.key} className="sap-plan-card" style={{ cursor: "pointer" }} onClick={() => { setSelectedGroup(group); setExpandedDept(null); }}>
                    <div className="sap-plan-card-header">
                      <div>
                        <span className="sap-branch-code-tag">{group.branchCode}</span>
                        <span className="sap-plan-card-title">{group.branchName}</span>
                      </div>
                    </div>
                    <div className="sap-plan-card-dates">{group.start_date} → {group.end_date}</div>
                    <div className="sap-plan-card-summary">
                      <span>{group.objective}</span>
                    </div>
                    <div className="sap-plan-card-summary" style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "#666" }}>
                      {group.audits.length} department{group.audits.length > 1 ? "s" : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {selectedGroup && (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <button className="sap-action-btn" onClick={() => { setSelectedGroup(null); setExpandedDept(null); }}>
                ← Back to Plans
              </button>
            </div>

            <div className="sap-plan-form-section" style={{ marginBottom: "1.5rem" }}>
              <div className="sap-plan-form-header">
                <h3>
                  <span className="sap-branch-code-tag">{selectedGroup.branchCode}</span>
                  {" "}{selectedGroup.branchName} — {selectedGroup.objective}
                </h3>
              </div>
              <div style={{ fontSize: "0.85rem", color: "#666" }}>
                {selectedGroup.start_date} → {selectedGroup.end_date} · {selectedGroup.audits.length} department{selectedGroup.audits.length > 1 ? "s" : ""}
              </div>
            </div>

            <div className="sap-checklist-dept-list">
              {selectedGroup.audits.map((audit) => {
                const dept = audit.departments;
                const cl = getChecklist(selectedGroup.plan.id, audit.department_id);
                const isExpanded = expandedDept === audit.department_id;
                const listType = cl?.list_type || "numeric";
                const items = cl?.items || [];

                return (
                  <div key={audit.department_id} className="sap-checklist-dept-card">
                    <div
                      className="sap-checklist-dept-header"
                      onClick={() => setExpandedDept(isExpanded ? null : audit.department_id)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                        <span className="sap-expand-btn">{isExpanded ? "▼" : "▶"}</span>
                        <span className="sap-dept-tag">{dept?.code || "—"}</span>
                        <span style={{ fontWeight: 500 }}>{dept?.name || "—"}</span>
                        {saveStatuses[`${selectedGroup.plan.id}|${audit.department_id}`] && (
                          <span className={`sap-autosave-status ${saveStatuses[`${selectedGroup.plan.id}|${audit.department_id}`]}`}>
                            {saveStatuses[`${selectedGroup.plan.id}|${audit.department_id}`] === "saving" && "Saving..."}
                            {saveStatuses[`${selectedGroup.plan.id}|${audit.department_id}`] === "saved" && "Saved"}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: "0.8rem", color: "#999" }}>
                        {items.length > 0 ? `${items.length} point${items.length !== 1 ? "s" : ""}` : "No points yet"}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="sap-checklist-dept-body">
                        <div className="sap-checklist-type-toggle">
                          <label className="sap-field-label" style={{ marginBottom: "0.5rem" }}>List Type</label>
                          <div className="sap-toggle-buttons">
                            <button
                              className={`sap-toggle-btn ${listType === "numeric" ? "active" : ""}`}
                              onClick={() => updateItemType(selectedGroup.plan.id, audit.department_id, "numeric")}
                            >
                              1. Numeric
                            </button>
                            <button
                              className={`sap-toggle-btn ${listType === "bullet" ? "active" : ""}`}
                              onClick={() => updateItemType(selectedGroup.plan.id, audit.department_id, "bullet")}
                            >
                              • Bullet
                            </button>
                          </div>
                        </div>

                        <div className="sap-checklist-items">
                          {items.map((item, idx) => (
                            <div key={idx} className="sap-checklist-item-row">
                              <span className="sap-checklist-item-marker">
                                {listType === "numeric" ? `${idx + 1}.` : "•"}
                              </span>
                              <input
                                type="text"
                                className="sap-field-input"
                                value={item}
                                onChange={(e) => updateItemText(selectedGroup.plan.id, audit.department_id, idx, e.target.value)}
                                placeholder="Enter finding or observation..."
                              />
                              <button
                                className="sap-action-btn sap-action-delete"
                                onClick={() => removeItem(selectedGroup.plan.id, audit.department_id, idx)}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          className="sap-action-btn"
                          style={{ marginTop: "0.75rem", border: "1px dashed var(--sap-border)", width: "100%", padding: "0.5rem" }}
                          onClick={() => addItem(selectedGroup.plan.id, audit.department_id)}
                        >
                          + Add Point
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
