"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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

const DEPT_OPTIONS = [
  { name: "General Management", code: "GM", standards: "ISO 9001 — Quality Management Systems" },
  { name: "Front Desk", code: "FD", standards: "ISO 9001, ISO 22483 — Quality Management Systems; Tourism and related services — Hotels — Service requirements" },
  { name: "Reservations", code: "RES", standards: "ISO 9001, ISO 22483 — Quality Management Systems; Tourism and related services — Hotels — Service requirements" },
  { name: "Guest Relations", code: "GR", standards: "ISO 9001, ISO 22483 — Quality Management Systems; Tourism and related services — Hotels — Service requirements" },
  { name: "Housekeeping", code: "HK", standards: "ISO 9001, ISO 22483, ISO 45001 — Quality Management Systems; Hotels — Service requirements; Occupational Health & Safety Management Systems" },
  { name: "Laundry", code: "LND", standards: "ISO 9001, ISO 45001 — Quality Management Systems; Occupational Health & Safety Management Systems" },
  { name: "Restaurant / F&B", code: "FNB", standards: "ISO 9001, ISO 22000, ISO 22483 — Quality Management Systems; Food Safety Management Systems; Hotels — Service requirements" },
  { name: "Kitchen", code: "KIT", standards: "ISO 22000, ISO 9001, ISO 45001 — Food Safety Management Systems; Quality Management Systems; Occupational Health & Safety Management Systems" },
  { name: "Café", code: "CAF", standards: "ISO 22000, ISO 9001 — Food Safety Management Systems; Quality Management Systems" },
  { name: "Banquet & Events", code: "BNE", standards: "ISO 9001, ISO 22000, ISO 22483 — Quality Management Systems; Food Safety Management Systems; Hotels — Service requirements" },
  { name: "Room Service", code: "RS", standards: "ISO 22000, ISO 9001, ISO 22483 — Food Safety Management Systems; Quality Management Systems; Hotels — Service requirements" },
  { name: "Stewarding", code: "STE", standards: "ISO 22000, ISO 45001 — Food Safety Management Systems; Occupational Health & Safety Management Systems" },
  { name: "Sales & Marketing", code: "SM", standards: "ISO 9001 — Quality Management Systems" },
  { name: "Finance & Accounts", code: "FA", standards: "ISO 9001 — Quality Management Systems" },
  { name: "Human Resources", code: "HR", standards: "ISO 9001, ISO 45001 — Quality Management Systems; Occupational Health & Safety Management Systems" },
  { name: "Procurement / Purchasing", code: "PROC", standards: "ISO 9001, ISO 22000 — Quality Management Systems; Food Safety Management Systems" },
  { name: "Supply Chain", code: "SC", standards: "ISO 9001, ISO 22000 — Quality Management Systems; Food Safety Management Systems" },
  { name: "Stores / Warehouse", code: "STR", standards: "ISO 9001, ISO 22000, ISO 45001 — Quality Management Systems; Food Safety Management Systems; Occupational Health & Safety Management Systems" },
  { name: "Engineering / Maintenance", code: "ENG", standards: "ISO 9001, ISO 45001 — Quality Management Systems; Occupational Health & Safety Management Systems" },
  { name: "IT", code: "IT", standards: "ISO 9001, ISO 27001 — Quality Management Systems; Information Security Management Systems" },
  { name: "Security", code: "SEC", standards: "ISO 45001, ISO 9001 — Occupational Health & Safety Management Systems; Quality Management Systems" },
  { name: "HSE", code: "HSE", standards: "ISO 45001, ISO 14001 — Occupational Health & Safety Management Systems; Environmental Management Systems" },
  { name: "Quality Assurance", code: "QA", standards: "ISO 9001 — Quality Management Systems" },
  { name: "Compliance", code: "CMP", standards: "ISO 9001, ISO 45001, ISO 22000 — Quality Management Systems; Occupational Health & Safety Management Systems; Food Safety Management Systems" },
  { name: "Food Safety", code: "FS", standards: "ISO 22000 — Food Safety Management Systems" },
  { name: "Training & Development", code: "TD", standards: "ISO 9001, ISO 45001, ISO 22000 — Quality Management Systems; Occupational Health & Safety Management Systems; Food Safety Management Systems" },
  { name: "Spa / Wellness", code: "SPA", standards: "ISO 9001, ISO 45001 — Quality Management Systems; Occupational Health & Safety Management Systems" },
  { name: "Transportation / Parking", code: "TP", standards: "ISO 9001, ISO 45001 — Quality Management Systems; Occupational Health & Safety Management Systems" },
  { name: "Gardening / Landscaping", code: "GL", standards: "ISO 14001, ISO 45001 — Environmental Management Systems; Occupational Health & Safety Management Systems" },
  { name: "Waste Management", code: "WM", standards: "ISO 14001, ISO 45001 — Environmental Management Systems; Occupational Health & Safety Management Systems" },
];

export default function BranchesModule() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const [showBranchForm, setShowBranchForm] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");

  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deptSelect, setDeptSelect] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptStandards, setDeptStandards] = useState("");

  const [showDupForm, setShowDupForm] = useState(false);
  const [dupSource, setDupSource] = useState<Branch | null>(null);
  const [dupName, setDupName] = useState("");
  const [dupCode, setDupCode] = useState("");
  const [dupLoading, setDupLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    if (user) {
      fetchBranches();
      fetchDepartments();
    }
  }, [user]);

  const fetchBranches = async () => {
    const { data } = await supabase.from("branches").select("*").order("name");
    if (data) setBranches(data);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    if (data) setDepartments(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const resetBranchForm = () => {
    setBranchName("");
    setBranchCode("");
    setEditBranch(null);
    setShowBranchForm(false);
    setError("");
  };

  const resetDeptForm = () => {
    setDeptSelect("");
    setDeptName("");
    setDeptCode("");
    setDeptStandards("");
    setEditDept(null);
    setShowDeptForm(false);
    setError("");
  };

  const resetDupForm = () => {
    setDupSource(null);
    setDupName("");
    setDupCode("");
    setShowDupForm(false);
    setDupLoading(false);
    setError("");
  };

  const startDuplicate = (branch: Branch) => {
    setDupSource(branch);
    setDupName(branch.name + " (Copy)");
    setDupCode("");
    setShowDupForm(true);
  };

  const duplicateBranch = async () => {
    if (!dupSource) return;
    setError("");
    if (!dupName.trim() || !dupCode.trim()) {
      setError("New branch name and code are required");
      return;
    }

    setDupLoading(true);

    const { data: newBranch, error: branchErr } = await supabase
      .from("branches")
      .insert({ name: dupName.trim(), code: dupCode.trim().toUpperCase() })
      .select()
      .single();

    if (branchErr) { setError(branchErr.message); setDupLoading(false); return; }

    const srcDepts = getDeptsForBranch(dupSource.id);
    if (srcDepts.length > 0) {
      const newDepts = srcDepts.map((d) => ({
        branch_id: newBranch.id,
        name: d.name,
        code: d.code,
        standards: d.standards || "",
      }));
      const { error: deptErr } = await supabase.from("departments").insert(newDepts);
      if (deptErr) { setError(deptErr.message); setDupLoading(false); return; }
    }

    setSuccess(`Branch "${dupName.trim()}" created with ${srcDepts.length} departments`);
    resetDupForm();
    fetchBranches();
    fetchDepartments();
    setTimeout(() => setSuccess(""), 2000);
  };

  const handleDeptSelectChange = (value: string) => {
    setDeptSelect(value);
    if (value) {
      const opt = DEPT_OPTIONS.find((o) => o.name === value);
      if (opt) {
        setDeptName(opt.name);
        setDeptCode(opt.code);
        setDeptStandards(opt.standards);
      }
    } else {
      setDeptName("");
      setDeptCode("");
      setDeptStandards("");
    }
  };

  const saveBranch = async () => {
    setError("");
    if (!branchName.trim() || !branchCode.trim()) {
      setError("Branch name and code are required");
      return;
    }

    if (editBranch) {
      const { error: err } = await supabase
        .from("branches")
        .update({ name: branchName.trim(), code: branchCode.trim().toUpperCase() })
        .eq("id", editBranch.id);
      if (err) { setError(err.message); return; }
      setSuccess("Branch updated");
    } else {
      const { error: err } = await supabase
        .from("branches")
        .insert({ name: branchName.trim(), code: branchCode.trim().toUpperCase() });
      if (err) { setError(err.message); return; }
      setSuccess("Branch created");
    }
    resetBranchForm();
    fetchBranches();
    setTimeout(() => setSuccess(""), 2000);
  };

  const deleteBranch = async (id: string) => {
    if (!confirm("Delete this branch and all its departments?")) return;
    await supabase.from("branches").delete().eq("id", id);
    if (selectedBranch?.id === id) setSelectedBranch(null);
    fetchBranches();
    fetchDepartments();
  };

  const startEditBranch = (branch: Branch) => {
    setEditBranch(branch);
    setBranchName(branch.name);
    setBranchCode(branch.code);
    setShowBranchForm(true);
  };

  const saveDept = async () => {
    setError("");
    if (!selectedBranch) return;
    if (!deptName.trim() || !deptCode.trim()) {
      setError("Department name and code are required");
      return;
    }

    if (editDept) {
      const { error: err } = await supabase
        .from("departments")
        .update({ name: deptName.trim(), code: deptCode.trim().toUpperCase(), standards: deptStandards.trim() })
        .eq("id", editDept.id);
      if (err) { setError(err.message); return; }
      setSuccess("Department updated");
    } else {
      const { error: err } = await supabase
        .from("departments")
        .insert({ branch_id: selectedBranch.id, name: deptName.trim(), code: deptCode.trim().toUpperCase(), standards: deptStandards.trim() });
      if (err) { setError(err.message); return; }
      setSuccess("Department created");
    }
    resetDeptForm();
    fetchDepartments();
    setTimeout(() => setSuccess(""), 2000);
  };

  const deleteDept = async (id: string) => {
    if (!confirm("Delete this department?")) return;
    await supabase.from("departments").delete().eq("id", id);
    fetchDepartments();
  };

  const startEditDept = (dept: Department) => {
    setEditDept(dept);
    const matchOpt = DEPT_OPTIONS.find((o) => o.name === dept.name);
    setDeptSelect(matchOpt ? dept.name : "");
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setDeptStandards(dept.standards || "");
    setShowDeptForm(true);
  };

  const getDeptsForBranch = (branchId: string) =>
    departments.filter((d) => d.branch_id === branchId);

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
        <Link href="/dashboard" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </Link>
        <h1>Branches &amp; Departments</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        <div className="sap-branches-layout">
          {/* Left: Branches */}
          <div className="sap-branches-panel">
            <div className="sap-panel-header">
              <h2>Branches</h2>
              <button
                className="sap-add-btn"
                onClick={() => { resetBranchForm(); setShowBranchForm(true); }}
              >
                + Add Branch
              </button>
            </div>

            {showBranchForm && (
              <div className="sap-form-card">
                <h3>{editBranch ? "Edit Branch" : "New Branch"}</h3>
                <div className="sap-field-group">
                  <label className="sap-field-label">Branch Name</label>
                  <input
                    className="sap-field-input"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="e.g. Main Office"
                  />
                </div>
                <div className="sap-field-group">
                  <label className="sap-field-label">Branch Code</label>
                  <input
                    className="sap-field-input"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    placeholder="e.g. BR01"
                    maxLength={10}
                  />
                </div>
                <div className="sap-form-actions">
                  <button className="sap-login-button" onClick={saveBranch}>
                    {editBranch ? "Update" : "Create"}
                  </button>
                  <button className="sap-cancel-btn" onClick={resetBranchForm}>Cancel</button>
                </div>
              </div>
            )}

            {showDupForm && (
              <div className="sap-form-card sap-dup-form">
                <h3>Duplicate Branch — {dupSource?.code}</h3>
                <p className="sap-dup-hint">All {getDeptsForBranch(dupSource?.id || "").length} departments will be copied</p>
                <div className="sap-field-group">
                  <label className="sap-field-label">New Branch Name</label>
                  <input
                    className="sap-field-input"
                    value={dupName}
                    onChange={(e) => setDupName(e.target.value)}
                    placeholder="e.g. Resort North"
                  />
                </div>
                <div className="sap-field-group">
                  <label className="sap-field-label">New Branch Code</label>
                  <input
                    className="sap-field-input"
                    value={dupCode}
                    onChange={(e) => setDupCode(e.target.value)}
                    placeholder="e.g. BR02"
                    maxLength={10}
                  />
                </div>
                <div className="sap-form-actions">
                  <button className="sap-login-button" onClick={duplicateBranch} disabled={dupLoading}>
                    {dupLoading ? "Duplicating..." : "Duplicate"}
                  </button>
                  <button className="sap-cancel-btn" onClick={resetDupForm} disabled={dupLoading}>Cancel</button>
                </div>
              </div>
            )}

            <div className="sap-branch-list">
              {branches.length === 0 && (
                <p className="sap-empty-msg">No branches yet. Add one to get started.</p>
              )}
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className={`sap-branch-item ${selectedBranch?.id === branch.id ? "active" : ""}`}
                  onClick={() => setSelectedBranch(branch)}
                >
                  <div className="sap-branch-info">
                    <span className="sap-branch-code">{branch.code}</span>
                    <span className="sap-branch-name">{branch.name}</span>
                    <span className="sap-branch-dept-count">{getDeptsForBranch(branch.id).length} depts</span>
                  </div>
                  <div className="sap-branch-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="sap-icon-btn" onClick={() => startDuplicate(branch)} title="Duplicate">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="#0070f3" strokeWidth="1.5" fill="none"/><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="#0070f3" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </button>
                    <button className="sap-icon-btn" onClick={() => startEditBranch(branch)} title="Edit">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="#0070f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    <button className="sap-icon-btn sap-icon-btn-danger" onClick={() => deleteBranch(branch.id)} title="Delete">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="#cc0000" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Departments */}
          <div className="sap-departments-panel">
            {selectedBranch ? (
              <>
                <div className="sap-panel-header">
                  <h2>Departments — <span style={{ color: "var(--sap-blue)" }}>{selectedBranch.code}</span> {selectedBranch.name}</h2>
                  <button
                    className="sap-add-btn"
                    onClick={() => { resetDeptForm(); setShowDeptForm(true); }}
                  >
                    + Add Department
                  </button>
                </div>

                {showDeptForm && (
                  <div className="sap-form-card">
                    <h3>{editDept ? "Edit Department" : "New Department"}</h3>
                    <div className="sap-field-group">
                      <label className="sap-field-label">Department</label>
                      <select
                        className="sap-field-input"
                        value={deptSelect}
                        onChange={(e) => handleDeptSelectChange(e.target.value)}
                      >
                        <option value="">Select department...</option>
                        {DEPT_OPTIONS.map((opt) => (
                          <option key={opt.name} value={opt.name}>{opt.name}</option>
                        ))}
                      </select>
                    </div>
                    {deptStandards && (
                      <div className="sap-field-group">
                        <label className="sap-field-label">Applicable Standards</label>
                        <div className="sap-standards-display">{deptStandards}</div>
                      </div>
                    )}
                    <div className="sap-field-group">
                      <label className="sap-field-label">Department Code</label>
                      <input
                        className="sap-field-input"
                        value={deptCode}
                        onChange={(e) => setDeptCode(e.target.value)}
                        placeholder="Auto-filled or custom"
                        maxLength={10}
                      />
                    </div>
                    <div className="sap-form-actions">
                      <button className="sap-login-button" onClick={saveDept}>
                        {editDept ? "Update" : "Create"}
                      </button>
                      <button className="sap-cancel-btn" onClick={resetDeptForm}>Cancel</button>
                    </div>
                  </div>
                )}

                <div className="sap-dept-list">
                  {getDeptsForBranch(selectedBranch.id).length === 0 && (
                    <p className="sap-empty-msg">No departments in this branch yet.</p>
                  )}
                  {getDeptsForBranch(selectedBranch.id).map((dept) => (
                    <div key={dept.id} className="sap-dept-item">
                      <div className="sap-dept-info">
                        <span className="sap-dept-code">{dept.code}</span>
                        <div className="sap-dept-details">
                          <span className="sap-dept-name">{dept.name}</span>
                          {dept.standards && (
                            <span className="sap-dept-standards">{dept.standards}</span>
                          )}
                        </div>
                      </div>
                      <div className="sap-dept-actions">
                        <button className="sap-icon-btn" onClick={() => startEditDept(dept)} title="Edit">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M11.5 1.5l3 3-9 9H2.5v-3l9-9z" stroke="#0070f3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                        <button className="sap-icon-btn sap-icon-btn-danger" onClick={() => deleteDept(dept.id)} title="Delete">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z" stroke="#cc0000" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="sap-empty-state">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect x="8" y="8" width="32" height="32" rx="4" stroke="#ccc" strokeWidth="2" fill="none"/>
                  <path d="M18 20h12M18 28h8" stroke="#ccc" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <p>Select a branch to view its departments</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
