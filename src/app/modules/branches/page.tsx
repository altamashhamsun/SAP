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
}

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
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");

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
    setDeptName("");
    setDeptCode("");
    setEditDept(null);
    setShowDeptForm(false);
    setError("");
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
        .update({ name: deptName.trim(), code: deptCode.trim().toUpperCase() })
        .eq("id", editDept.id);
      if (err) { setError(err.message); return; }
      setSuccess("Department updated");
    } else {
      const { error: err } = await supabase
        .from("departments")
        .insert({ branch_id: selectedBranch.id, name: deptName.trim(), code: deptCode.trim().toUpperCase() });
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
    setDeptName(dept.name);
    setDeptCode(dept.code);
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
                      <label className="sap-field-label">Department Name</label>
                      <input
                        className="sap-field-input"
                        value={deptName}
                        onChange={(e) => setDeptName(e.target.value)}
                        placeholder="e.g. Quality Control"
                      />
                    </div>
                    <div className="sap-field-group">
                      <label className="sap-field-label">Department Code</label>
                      <input
                        className="sap-field-input"
                        value={deptCode}
                        onChange={(e) => setDeptCode(e.target.value)}
                        placeholder="e.g. QC01"
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
                        <span className="sap-dept-name">{dept.name}</span>
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
