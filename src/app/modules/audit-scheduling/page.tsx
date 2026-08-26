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

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function AuditScheduling() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectingRange, setSelectingRange] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(null);

  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [objective, setObjective] = useState("");

  const [editAudit, setEditAudit] = useState<Audit | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");
  const [editDepts, setEditDepts] = useState<string[]>([]);
  const [editBranch, setEditBranch] = useState("");
  const [editObjective, setEditObjective] = useState("");

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await Promise.all([fetchBranches(), fetchDepartments(), fetchAudits()]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchBranches = async () => {
    const { data } = await supabase.from("branches").select("*").order("name");
    if (data) setBranches(data);
  };

  const fetchDepartments = async () => {
    const { data } = await supabase.from("departments").select("*").order("name");
    if (data) setDepartments(data);
  };

  const fetchAudits = async () => {
    const { data } = await supabase
      .from("audits")
      .select("*, branches(id, name, code), departments(id, name, code)")
      .order("start_date", { ascending: true });
    if (data) setAudits(data as Audit[]);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const filteredDepts = useMemo(
    () => departments.filter((d) => d.branch_id === selectedBranch),
    [departments, selectedBranch]
  );

  const editFilteredDepts = useMemo(
    () => departments.filter((d) => d.branch_id === editBranch),
    [departments, editBranch]
  );

  const toggleDept = (deptId: string) => {
    setSelectedDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const toggleEditDept = (deptId: string) => {
    setEditDepts((prev) =>
      prev.includes(deptId) ? prev.filter((id) => id !== deptId) : [...prev, deptId]
    );
  };

  const getRelatedAudits = (audit: Audit): Audit[] => {
    return audits.filter(
      (a) =>
        a.branch_id === audit.branch_id &&
        a.start_date === audit.start_date &&
        a.end_date === audit.end_date
    );
  };

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const formatDate = (y: number, m: number, d: number) => {
    return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };

  const isInRange = (dateStr: string) => {
    if (!rangeStart || !rangeEnd) return false;
    return dateStr >= rangeStart && dateStr <= rangeEnd;
  };

  const hasAuditOnDate = (dateStr: string) => {
    return audits.some((a) => dateStr >= a.start_date && dateStr <= a.end_date);
  };

  const handleDayClick = (dateStr: string) => {
    if (!selectingRange) {
      setSelectingRange(true);
      setRangeStart(dateStr);
      setRangeEnd(null);
    } else {
      if (dateStr < rangeStart!) { setRangeEnd(rangeStart); setRangeStart(dateStr); }
      else { setRangeEnd(dateStr); }
      setSelectingRange(false);
    }
  };

  const submitAudit = async () => {
    setError("");
    if (!rangeStart || !rangeEnd) { setError("Please enter start and end dates"); return; }
    if (rangeEnd < rangeStart) { setError("End date must be after start date"); return; }
    if (!selectedBranch) { setError("Please select a branch"); return; }
    if (selectedDepts.length === 0) { setError("Please select at least one department"); return; }
    if (!objective.trim()) { setError("Please enter an audit objective"); return; }

    const inserts = selectedDepts.map((deptId) => ({
      branch_id: selectedBranch,
      department_id: deptId,
      objective: objective.trim(),
      start_date: rangeStart,
      end_date: rangeEnd,
    }));

    const { error: err } = await supabase.from("audits").insert(inserts);
    if (err) { setError(err.message); return; }

    setSuccess(`${selectedDepts.length} audit(s) scheduled successfully!`);
    setRangeStart(null); setRangeEnd(null); setSelectingRange(false);
    setSelectedBranch(""); setSelectedDepts([]); setObjective("");
    fetchAudits();
    setTimeout(() => setSuccess(""), 2000);
  };

  const startEditAudit = (audit: Audit) => {
    const related = getRelatedAudits(audit);
    setEditAudit(audit);
    setEditStartDate(audit.start_date);
    setEditEndDate(audit.end_date);
    setEditBranch(audit.branch_id);
    setEditDepts(related.map((a) => a.department_id));
    setEditObjective(audit.objective);
    setError("");
  };

  const saveEditAudit = async () => {
    if (!editAudit) return;
    setError("");
    if (!editStartDate || !editEndDate) { setError("Both dates are required"); return; }
    if (editEndDate < editStartDate) { setError("End date must be after start date"); return; }
    if (editDepts.length === 0) { setError("Select at least one department"); return; }
    if (!editObjective.trim()) { setError("Objective is required"); return; }

    const oldRelated = getRelatedAudits(editAudit);
    const oldDeptIds = oldRelated.map((a) => a.department_id);

    const toAdd = editDepts.filter((id) => !oldDeptIds.includes(id));
    const toRemove = oldRelated.filter((a) => !editDepts.includes(a.department_id));
    const toUpdate = oldRelated.filter((a) => editDepts.includes(a.department_id));

    for (const a of toUpdate) {
      await supabase.from("audits").update({
        start_date: editStartDate,
        end_date: editEndDate,
        objective: editObjective.trim(),
      }).eq("id", a.id);
    }

    for (const a of toRemove) {
      await supabase.from("audits").delete().eq("id", a.id);
    }

    if (toAdd.length > 0) {
      const inserts = toAdd.map((deptId) => ({
        branch_id: editBranch,
        department_id: deptId,
        objective: editObjective.trim(),
        start_date: editStartDate,
        end_date: editEndDate,
      }));
      await supabase.from("audits").insert(inserts);
    }

    setSuccess("Audit updated successfully!");
    setEditAudit(null);
    fetchAudits();
    setTimeout(() => setSuccess(""), 2000);
  };

  const deleteAudit = async (id: string) => {
    if (!confirm("Delete this scheduled audit?")) return;
    await supabase.from("audits").delete().eq("id", id);
    fetchAudits();
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  interface AuditGroup {
    key: string;
    branch_id: string;
    branchCode: string;
    branchName: string;
    objective: string;
    start_date: string;
    end_date: string;
    audits: Audit[];
  }

  const auditGroups: AuditGroup[] = useMemo(() => {
    const map = new Map<string, AuditGroup>();
    for (const a of audits) {
      const gKey = `${a.branch_id}|${a.start_date}|${a.end_date}`;
      if (!map.has(gKey)) {
        map.set(gKey, {
          key: gKey,
          branch_id: a.branch_id,
          branchCode: a.branches?.code || "—",
          branchName: a.branches?.name || "—",
          objective: a.objective,
          start_date: a.start_date,
          end_date: a.end_date,
          audits: [],
        });
      }
      map.get(gKey)!.audits.push(a);
    }
    return Array.from(map.values());
  }, [audits]);

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: { date: string; day: number; isToday: boolean; inRange: boolean; hasAudit: boolean }[] = [];
    for (let i = 0; i < firstDay; i++) days.push({ date: "", day: 0, isToday: false, inRange: false, hasAudit: false });
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d);
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      days.push({ date: dateStr, day: d, isToday, inRange: isInRange(dateStr), hasAudit: hasAuditOnDate(dateStr) });
    }
    return days;
  }, [currentDate, rangeStart, rangeEnd, audits]);

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
        <h1>Audit Scheduling</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        {!editAudit && (
          <div className="sap-schedule-layout">
            <div className="sap-calendar-card">
              <div className="sap-cal-header">
                <button className="sap-cal-nav" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}>&#8249;</button>
                <h3>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                <button className="sap-cal-nav" onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}>&#8250;</button>
              </div>
              <div className="sap-cal-days-row">
                {DAYS.map((d) => <div key={d} className="sap-cal-day-label">{d}</div>)}
              </div>
              <div className="sap-cal-grid">
                {calendarDays.map((cell, i) => (
                  <div key={i} className={`sap-cal-day ${!cell.date ? "empty" : ""} ${cell.isToday ? "today" : ""} ${cell.inRange ? "in-range" : ""} ${cell.hasAudit ? "has-audit" : ""}`}
                    onClick={() => cell.date && handleDayClick(cell.date)}>
                    {cell.day > 0 && cell.day}
                  </div>
                ))}
              </div>
              <div className="sap-cal-legend">
                <span><span className="sap-legend-dot today"></span> Today</span>
                <span><span className="sap-legend-dot selected"></span> Selected</span>
                <span><span className="sap-legend-dot audit"></span> Audit</span>
              </div>
              {rangeStart && (
                <div className="sap-cal-selection">
                  <strong>Selected:</strong> {rangeStart}{rangeEnd ? ` → ${rangeEnd}` : " → (click end date)"}
                </div>
              )}
            </div>

            <div className="sap-schedule-form-card">
              <h3>Schedule Audit</h3>
              <div className="sap-field-group">
                <label className="sap-field-label">Audit Duration</label>
                <div className="sap-date-row">
                  <input type="date" className="sap-field-input" value={rangeStart || ""}
                    onChange={(e) => { setRangeStart(e.target.value); setSelectingRange(false); }} />
                  <span className="sap-date-sep">to</span>
                  <input type="date" className="sap-field-input" value={rangeEnd || ""}
                    onChange={(e) => setRangeEnd(e.target.value)} min={rangeStart || ""} />
                </div>
              </div>
              <div className="sap-field-group">
                <label className="sap-field-label">Branch</label>
                <select className="sap-field-input" value={selectedBranch}
                  onChange={(e) => { setSelectedBranch(e.target.value); setSelectedDepts([]); }}>
                  <option value="">Select branch...</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
                </select>
              </div>
              <div className="sap-field-group">
                <label className="sap-field-label">
                  Departments
                  {filteredDepts.length > 0 && (
                    <span className="sap-dept-select-actions">
                      <button type="button" onClick={() => setSelectedDepts(filteredDepts.map((d) => d.id))}>Select All</button>
                      <button type="button" onClick={() => setSelectedDepts([])}>Clear</button>
                    </span>
                  )}
                </label>
                <div className="sap-dept-checkboxes">
                  {filteredDepts.length === 0 && <p className="sap-empty-msg" style={{ padding: "0.5rem" }}>{selectedBranch ? "No departments" : "Select a branch first"}</p>}
                  {filteredDepts.map((d) => (
                    <label key={d.id} className="sap-checkbox-item">
                      <input type="checkbox" checked={selectedDepts.includes(d.id)} onChange={() => toggleDept(d.id)} />
                      <span className="sap-checkbox-label">{d.code} — {d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="sap-field-group">
                <label className="sap-field-label">Audit Objective</label>
                <textarea className="sap-field-input sap-textarea" value={objective}
                  onChange={(e) => setObjective(e.target.value)} placeholder="Enter the objective of this audit..." rows={3} />
              </div>
              <button className="sap-login-button" onClick={submitAudit}>
                Schedule Audit {selectedDepts.length > 0 && `(${selectedDepts.length})`}
              </button>
            </div>
          </div>
        )}

        {editAudit && (
          <div className="sap-plan-form-section">
            <div className="sap-plan-form-header">
              <h3>Edit Audit Schedule</h3>
            </div>
            <div className="sap-edit-form-grid">
              <div className="sap-field-group">
                <label className="sap-field-label">Audit Duration</label>
                <div className="sap-date-row">
                  <input type="date" className="sap-field-input" value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)} />
                  <span className="sap-date-sep">to</span>
                  <input type="date" className="sap-field-input" value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)} min={editStartDate} />
                </div>
              </div>
              <div className="sap-field-group">
                <label className="sap-field-label">Branch</label>
                <select className="sap-field-input" value={editBranch} disabled>
                  <option value="">{branches.find((b) => b.id === editBranch)?.code} — {branches.find((b) => b.id === editBranch)?.name}</option>
                </select>
              </div>
              <div className="sap-field-group" style={{ gridColumn: "1 / -1" }}>
                <label className="sap-field-label">
                  Departments
                  {editFilteredDepts.length > 0 && (
                    <span className="sap-dept-select-actions">
                      <button type="button" onClick={() => setEditDepts(editFilteredDepts.map((d) => d.id))}>Select All</button>
                      <button type="button" onClick={() => setEditDepts([])}>Clear</button>
                    </span>
                  )}
                </label>
                <div className="sap-dept-checkboxes">
                  {editFilteredDepts.map((d) => (
                    <label key={d.id} className="sap-checkbox-item">
                      <input type="checkbox" checked={editDepts.includes(d.id)} onChange={() => toggleEditDept(d.id)} />
                      <span className="sap-checkbox-label">{d.code} — {d.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="sap-field-group" style={{ gridColumn: "1 / -1" }}>
                <label className="sap-field-label">Audit Objective</label>
                <textarea className="sap-field-input sap-textarea" value={editObjective}
                  onChange={(e) => setEditObjective(e.target.value)} rows={3} />
              </div>
            </div>
            <div className="sap-form-actions">
              <button className="sap-login-button" onClick={saveEditAudit}>Save Changes</button>
              <button className="sap-cancel-btn" onClick={() => setEditAudit(null)}>Cancel</button>
            </div>
          </div>
        )}

        <div className="sap-audits-table-section">
          <h3>Scheduled Audits ({audits.length})</h3>
          {audits.length === 0 ? (
            <p className="sap-empty-msg">No audits scheduled yet.</p>
          ) : (
            <div className="sap-table-wrap">
              <table className="sap-table">
                <thead>
                  <tr><th></th><th>Branch Code</th><th>Branch</th><th>Departments</th><th>Objective</th><th>Duration</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {auditGroups.map((group) => (
                    <React.Fragment key={group.key}>
                      <tr className="sap-group-row">
                        <td>
                          <button className="sap-expand-btn" onClick={() => toggleGroup(group.key)}>
                            {expandedGroups.has(group.key) ? "▼" : "▶"}
                          </button>
                        </td>
                        <td><span className="sap-branch-code-tag">{group.branchCode}</span></td>
                        <td>{group.branchName}</td>
                        <td>{group.audits.length} dept{group.audits.length > 1 ? "s" : ""}</td>
                        <td>{group.objective}</td>
                        <td>{group.start_date} → {group.end_date}</td>
                        <td>
                          <div className="sap-inline-actions">
                            <button className="sap-action-btn" onClick={() => startEditAudit(group.audits[0])}>Edit</button>
                            <button className="sap-action-btn sap-action-delete" onClick={() => { for (const a of group.audits) deleteAudit(a.id); }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                      {expandedGroups.has(group.key) && group.audits.map((audit) => (
                        <tr key={audit.id} className="sap-sub-row">
                          <td></td>
                          <td></td>
                          <td></td>
                          <td><span className="sap-dept-tag">{audit.departments?.code || "—"} — {audit.departments?.name || "—"}</span></td>
                          <td colSpan={2}></td>
                          <td>
                            <button className="sap-action-btn sap-action-delete" onClick={() => deleteAudit(audit.id)}>Remove</button>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
