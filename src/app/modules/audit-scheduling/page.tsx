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
  const [selectedDept, setSelectedDept] = useState("");
  const [objective, setObjective] = useState("");

  const [editAudit, setEditAudit] = useState<Audit | null>(null);
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

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
      fetchAudits();
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

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
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
      if (dateStr < rangeStart!) {
        setRangeEnd(rangeStart);
        setRangeStart(dateStr);
      } else {
        setRangeEnd(dateStr);
      }
      setSelectingRange(false);
    }
  };

  const submitAudit = async () => {
    setError("");
    if (!rangeStart || !rangeEnd) {
      setError("Please enter start and end dates");
      return;
    }
    if (rangeEnd < rangeStart) {
      setError("End date must be after start date");
      return;
    }
    if (!selectedBranch) {
      setError("Please select a branch");
      return;
    }
    if (!selectedDept) {
      setError("Please select a department");
      return;
    }
    if (!objective.trim()) {
      setError("Please enter an audit objective");
      return;
    }

    const { error: err } = await supabase.from("audits").insert({
      branch_id: selectedBranch,
      department_id: selectedDept,
      objective: objective.trim(),
      start_date: rangeStart,
      end_date: rangeEnd,
    });

    if (err) { setError(err.message); return; }

    setSuccess("Audit scheduled successfully!");
    setRangeStart(null);
    setRangeEnd(null);
    setSelectingRange(false);
    setSelectedBranch("");
    setSelectedDept("");
    setObjective("");
    fetchAudits();
    setTimeout(() => setSuccess(""), 2000);
  };

  const deleteAudit = async (id: string) => {
    if (!confirm("Delete this scheduled audit?")) return;
    await supabase.from("audits").delete().eq("id", id);
    fetchAudits();
  };

  const startEditAudit = (audit: Audit) => {
    setEditAudit(audit);
    setEditStartDate(audit.start_date);
    setEditEndDate(audit.end_date);
  };

  const saveEditAudit = async () => {
    if (!editAudit) return;
    setError("");
    if (!editStartDate || !editEndDate) {
      setError("Both dates are required");
      return;
    }
    const { error: err } = await supabase
      .from("audits")
      .update({ start_date: editStartDate, end_date: editEndDate })
      .eq("id", editAudit.id);
    if (err) { setError(err.message); return; }
    setSuccess("Audit dates updated");
    setEditAudit(null);
    fetchAudits();
    setTimeout(() => setSuccess(""), 2000);
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days: { date: string; day: number; isToday: boolean; inRange: boolean; hasAudit: boolean }[] = [];

    for (let i = 0; i < firstDay; i++) {
      days.push({ date: "", day: 0, isToday: false, inRange: false, hasAudit: false });
    }

    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = formatDate(year, month, d);
      const isToday =
        d === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear();
      days.push({
        date: dateStr,
        day: d,
        isToday,
        inRange: isInRange(dateStr),
        hasAudit: hasAuditOnDate(dateStr),
      });
    }
    return days;
  }, [currentDate, rangeStart, rangeEnd, audits]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getBranchName = (audit: Audit) => {
    if (audit.branches) return `${audit.branches.code} - ${audit.branches.name}`;
    return audit.branch_id;
  };

  const getDeptName = (audit: Audit) => {
    if (audit.departments) return `${audit.departments.code} - ${audit.departments.name}`;
    return audit.department_id;
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
        <h1>Audit Scheduling</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        <div className="sap-schedule-layout">
          {/* Calendar */}
          <div className="sap-calendar-card">
            <div className="sap-cal-header">
              <button className="sap-cal-nav" onClick={prevMonth}>&#8249;</button>
              <h3>{MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
              <button className="sap-cal-nav" onClick={nextMonth}>&#8250;</button>
            </div>
            <div className="sap-cal-days-row">
              {DAYS.map((d) => <div key={d} className="sap-cal-day-label">{d}</div>)}
            </div>
            <div className="sap-cal-grid">
              {calendarDays.map((cell, i) => (
                <div
                  key={i}
                  className={
                    `sap-cal-day ${!cell.date ? "empty" : ""} ${cell.isToday ? "today" : ""} ${cell.inRange ? "in-range" : ""} ${cell.hasAudit ? "has-audit" : ""}`
                  }
                  onClick={() => cell.date && handleDayClick(cell.date)}
                >
                  {cell.day > 0 && cell.day}
                </div>
              ))}
            </div>
            <div className="sap-cal-legend">
              <span><span className="sap-legend-dot today"></span> Today</span>
              <span><span className="sap-legend-dot selected"></span> Selected Range</span>
              <span><span className="sap-legend-dot audit"></span> Scheduled Audit</span>
            </div>
            {rangeStart && (
              <div className="sap-cal-selection">
                <strong>Selected:</strong> {rangeStart}{rangeEnd ? ` → ${rangeEnd}` : " → (click end date)"}
              </div>
            )}
          </div>

          {/* Schedule Form */}
          <div className="sap-schedule-form-card">
            <h3>Schedule Audit</h3>
            <div className="sap-field-group">
              <label className="sap-field-label">Audit Duration</label>
              <div className="sap-date-row">
                <input
                  type="date"
                  className="sap-field-input"
                  value={rangeStart || ""}
                  onChange={(e) => { setRangeStart(e.target.value); setSelectingRange(false); }}
                />
                <span className="sap-date-sep">to</span>
                <input
                  type="date"
                  className="sap-field-input"
                  value={rangeEnd || ""}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  min={rangeStart || ""}
                />
              </div>
            </div>
            <div className="sap-field-group">
              <label className="sap-field-label">Branch</label>
              <select
                className="sap-field-input"
                value={selectedBranch}
                onChange={(e) => { setSelectedBranch(e.target.value); setSelectedDept(""); }}
              >
                <option value="">Select branch...</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                ))}
              </select>
            </div>
            <div className="sap-field-group">
              <label className="sap-field-label">Department</label>
              <select
                className="sap-field-input"
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                disabled={!selectedBranch}
              >
                <option value="">Select department...</option>
                {filteredDepts.map((d) => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>
            <div className="sap-field-group">
              <label className="sap-field-label">Audit Objective</label>
              <textarea
                className="sap-field-input sap-textarea"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Enter the objective of this audit..."
                rows={3}
              />
            </div>
            <button className="sap-login-button" onClick={submitAudit}>
              Schedule Audit
            </button>
          </div>
        </div>

        {/* Scheduled Audits Table */}
        <div className="sap-audits-table-section">
          <h3>Scheduled Audits ({audits.length})</h3>
          {audits.length === 0 ? (
            <p className="sap-empty-msg">No audits scheduled yet. Select dates on the calendar and fill the form above.</p>
          ) : (
            <div className="sap-table-wrap">
              <table className="sap-table">
                <thead>
                  <tr>
                    <th>Branch Code</th>
                    <th>Branch</th>
                    <th>Department</th>
                    <th>Objective</th>
                    <th>Duration</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr key={audit.id}>
                      <td><span className="sap-branch-code-tag">{audit.branches?.code || "—"}</span></td>
                      <td>{audit.branches?.name || "—"}</td>
                      <td>{audit.departments?.name || "—"}</td>
                      <td>{audit.objective}</td>
                      <td>
                        {editAudit?.id === audit.id ? (
                          <div className="sap-inline-edit">
                            <input type="date" className="sap-field-input sap-date-input" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} />
                            <span>→</span>
                            <input type="date" className="sap-field-input sap-date-input" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} />
                          </div>
                        ) : (
                          <span>{audit.start_date} → {audit.end_date}</span>
                        )}
                      </td>
                      <td>
                        {editAudit?.id === audit.id ? (
                          <div className="sap-inline-actions">
                            <button className="sap-action-btn sap-action-save" onClick={saveEditAudit}>Save</button>
                            <button className="sap-action-btn sap-action-cancel" onClick={() => setEditAudit(null)}>Cancel</button>
                          </div>
                        ) : (
                          <div className="sap-inline-actions">
                            <button className="sap-action-btn" onClick={() => startEditAudit(audit)}>Edit Dates</button>
                            <button className="sap-action-btn sap-action-delete" onClick={() => deleteAudit(audit.id)}>Delete</button>
                          </div>
                        )}
                      </td>
                    </tr>
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
