"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
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
  created_at: string;
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
  auditee_contacts: string;
  risk_factors: string;
  reporting_structure: string;
  created_at: string;
  updated_at: string;
}

const FORM_FIELDS = [
  { key: "audit_objective", label: "Audit Objective", placeholder: "Define the purpose and goals of this audit..." },
  { key: "audit_scope", label: "Audit Scope", placeholder: "Define the boundaries and extent of the audit..." },
  { key: "audit_criteria", label: "Audit Criteria", placeholder: "ISO standards, regulations, procedures to audit against..." },
  { key: "schedule_timetable", label: "Schedule & Timetable", placeholder: "Day-by-day schedule, time slots, milestones..." },
  { key: "audit_methods", label: "Audit Methods", placeholder: "Interviews, document review, observations, sampling methods..." },
  { key: "reporting_structure", label: "Reporting Structure", placeholder: "How findings will be reported, follow-up process..." },
] as const;

export default function AuditPlanning() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [plans, setPlans] = useState<AuditPlan[]>([]);

  const [selectedAuditId, setSelectedAuditId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [currentPlan, setCurrentPlan] = useState<AuditPlan | null>(null);

  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const router = useRouter();
  const supabase = createClient();
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [supabase.auth]);

  useEffect(() => {
    if (user) {
      fetchAudits();
      fetchPlans();
    }
  }, [user]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const fetchAudits = async () => {
    const { data } = await supabase
      .from("audits")
      .select("*, branches(id, name, code), departments(id, name, code)")
      .order("start_date", { ascending: true });
    if (data) setAudits(data as Audit[]);
  };

  const fetchPlans = async () => {
    const { data } = await supabase
      .from("audit_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPlans(data as AuditPlan[]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getAuditLabel = (audit: Audit) => {
    const branchCode = audit.branches?.code || "—";
    const branchName = audit.branches?.name || "—";
    const deptName = audit.departments?.name || "—";
    return `[${branchCode}] ${branchName} — ${deptName} (${audit.start_date} to ${audit.end_date})`;
  };

  const getPlanForAudit = (auditId: string) => plans.find((p) => p.audit_id === auditId);

  const startCreatePlan = async () => {
    setError("");
    if (!selectedAuditId) {
      setError("Please select a scheduled audit first");
      return;
    }
    const existing = getPlanForAudit(selectedAuditId);
    if (existing) {
      setError("A plan already exists for this audit. Edit it instead.");
      return;
    }

    const { data, error: err } = await supabase
      .from("audit_plans")
      .insert({ audit_id: selectedAuditId })
      .select()
      .single();

    if (err) { setError(err.message); return; }

    setCurrentPlan(data as AuditPlan);
    setFormData({
      audit_objective: "",
      audit_scope: "",
      audit_criteria: "",
      schedule_timetable: "",
      audit_methods: "",
      auditee_contacts: "",
      risk_factors: "",
      reporting_structure: "",
    });
    setShowForm(true);
  };

  const startEditPlan = (plan: AuditPlan) => {
    setCurrentPlan(plan);
    setSelectedAuditId(plan.audit_id);
    setFormData({
      audit_objective: plan.audit_objective,
      audit_scope: plan.audit_scope,
      audit_criteria: plan.audit_criteria,
      schedule_timetable: plan.schedule_timetable,
      audit_methods: plan.audit_methods,
      auditee_contacts: plan.auditee_contacts,
      risk_factors: plan.risk_factors,
      reporting_structure: plan.reporting_structure,
    });
    setShowForm(true);
  };

  const autosave = useCallback(async (data: Record<string, string>, planId: string) => {
    setSaveStatus("saving");
    const { error: err } = await supabase
      .from("audit_plans")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", planId);
    if (err) {
      setSaveStatus("idle");
      return;
    }
    setSaveStatus("saved");
    fetchPlans();
    setTimeout(() => setSaveStatus("idle"), 1500);
  }, [supabase]);

  const updateField = (key: string, value: string) => {
    const newData = { ...formDataRef.current, [key]: value };
    setFormData(newData);
    formDataRef.current = newData;

    if (!currentPlan) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      autosave(newData, currentPlan.id);
    }, 800);
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this audit plan?")) return;
    await supabase.from("audit_plans").delete().eq("id", id);
    if (showForm && currentPlan?.id === id) {
      setShowForm(false);
      setCurrentPlan(null);
      setFormData({});
    }
    fetchPlans();
  };

  const selectedAudit = audits.find((a) => a.id === selectedAuditId);

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

  if (!user) {
    router.push("/login");
    return null;
  }

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
        <h1>Audit Planning</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span></div>}

        {!showForm && (
          <div className="sap-plan-select-section">
            <div className="sap-plan-select-card">
              <h3>Select Scheduled Audit</h3>
              <div className="sap-field-group">
                <label className="sap-field-label">Choose from scheduled audits</label>
                <select
                  className="sap-field-input"
                  value={selectedAuditId}
                  onChange={(e) => { setSelectedAuditId(e.target.value); setError(""); }}
                >
                  <option value="">Select audit...</option>
                  {audits.map((a) => (
                    <option key={a.id} value={a.id}>{getAuditLabel(a)}</option>
                  ))}
                </select>
              </div>
              {selectedAudit && (
                <div className="sap-audit-preview">
                  <div className="sap-preview-row"><span>Branch:</span> <strong>{selectedAudit.branches?.code} — {selectedAudit.branches?.name}</strong></div>
                  <div className="sap-preview-row"><span>Department:</span> <strong>{selectedAudit.departments?.name}</strong></div>
                  <div className="sap-preview-row"><span>Duration:</span> <strong>{selectedAudit.start_date} → {selectedAudit.end_date}</strong></div>
                  <div className="sap-preview-row"><span>Objective:</span> <strong>{selectedAudit.objective}</strong></div>
                </div>
              )}
              <button className="sap-login-button" onClick={startCreatePlan} disabled={!selectedAuditId}>
                Create Audit Plan
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="sap-plan-form-section">
            <div className="sap-plan-form-header">
              <h3>Edit Audit Plan</h3>
              {selectedAudit && (
                <span className="sap-plan-audit-tag">
                  {selectedAudit.branches?.code} — {selectedAudit.departments?.name} ({selectedAudit.start_date} to {selectedAudit.end_date})
                </span>
              )}
              <span className={`sap-autosave-status ${saveStatus}`}>
                {saveStatus === "saving" && "Saving..."}
                {saveStatus === "saved" && "Saved"}
              </span>
            </div>
            <div className="sap-plan-form-grid">
              {FORM_FIELDS.map((field) => (
                <div key={field.key} className="sap-plan-field">
                  <label className="sap-field-label">{field.label}</label>
                  <textarea
                    className="sap-field-input sap-textarea"
                    value={formData[field.key] || ""}
                    onChange={(e) => updateField(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    rows={4}
                  />
                </div>
              ))}
            </div>
            <div className="sap-form-actions">
              <button className="sap-cancel-btn" onClick={() => { setShowForm(false); setCurrentPlan(null); setFormData({}); }}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* Existing Plans */}
        <div className="sap-plans-list-section">
          <h3>Audit Plans ({plans.length})</h3>
          {plans.length === 0 ? (
            <p className="sap-empty-msg">No audit plans created yet.</p>
          ) : (
            <div className="sap-plans-list">
              {plans.map((plan) => {
                const audit = audits.find((a) => a.id === plan.audit_id);
                return (
                  <div key={plan.id} className="sap-plan-card">
                    <div className="sap-plan-card-header">
                      <div>
                        <span className="sap-branch-code-tag">{audit?.branches?.code || "—"}</span>
                        <span className="sap-plan-card-title">{audit?.branches?.name} — {audit?.departments?.name}</span>
                      </div>
                      <div className="sap-inline-actions">
                        <button className="sap-action-btn" onClick={() => { setSelectedAuditId(plan.audit_id); startEditPlan(plan); }}>Edit</button>
                        <button className="sap-action-btn sap-action-delete" onClick={() => deletePlan(plan.id)}>Delete</button>
                      </div>
                    </div>
                    <div className="sap-plan-card-dates">{audit?.start_date} → {audit?.end_date}</div>
                    <div className="sap-plan-card-summary">
                      <span>{plan.audit_objective.substring(0, 120)}{plan.audit_objective.length > 120 ? "..." : ""}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
