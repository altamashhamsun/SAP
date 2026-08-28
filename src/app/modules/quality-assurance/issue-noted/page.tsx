"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Department { id: string; name: string; code: string; branch_id: string; }

const categories = ["Process", "Documentation", "Product", "Service", "Safety", "Equipment", "Other"] as const;
const severities = ["Critical", "Major", "Minor"] as const;

export default function IssueNoted() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [title, setTitle] = useState("");
  const [branchId, setBranchId] = useState("");
  const [deptId, setDeptId] = useState("");
  const [category, setCategory] = useState<string>(categories[0]);
  const [severity, setSeverity] = useState<string>(severities[0]);
  const [description, setDescription] = useState("");
  const [notedDate, setNotedDate] = useState(new Date().toISOString().split("T")[0]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const [bRes, dRes] = await Promise.all([
        supabase.from("branches").select("id,name,code").order("code"),
        supabase.from("departments").select("id,name,code,branch_id").order("code"),
      ]);
      if (bRes.data) setBranches(bRes.data);
      if (dRes.data) setDepartments(dRes.data);
      setLoading(false);
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError("Title is required"); return; }
    if (!description.trim()) { setError("Description is required"); return; }
    setSubmitting(true);
    setError("");
    setSuccess("");

    const { count: countRes } = await supabase
      .from("quality_issues")
      .select("id", { count: "exact", head: true });
    const nextNum = (countRes || 0) + 1;
    const issueNumber = `QA-${String(nextNum).padStart(3, "0")}`;

    const { error: dbErr } = await supabase.from("quality_issues").insert({
      issue_number: issueNumber,
      title: title.trim(),
      description: description.trim(),
      source: "Internal",
      category,
      severity,
      status: "Noted",
      branch_id: branchId || null,
      department_id: deptId || null,
      noted_date: notedDate,
    });

    if (dbErr) {
      setError(`Failed to save issue: ${dbErr.message}`);
      setSubmitting(false);
      return;
    }

    setSuccess(`${issueNumber} saved successfully!`);
    setTitle("");
    setDescription("");
    setSubmitting(false);
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

  const labelStyle: React.CSSProperties = { fontSize: "0.75rem", fontWeight: 600, color: "#444", marginBottom: "0.25rem", display: "block" };
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.5rem 0.65rem", fontSize: "0.85rem",
    border: "1px solid #d9d9d9", borderRadius: "6px", background: "#fff",
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
        <Link href="/modules/quality-assurance" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Quality Assurance
        </Link>
        <h1>Issue Noted</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span><button onClick={() => setError("")} style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        <form onSubmit={handleSubmit} style={{
          background: "#fff", border: "1px solid var(--sap-border)", borderRadius: "12px",
          padding: "1.5rem 2rem", maxWidth: "700px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          display: "flex", flexDirection: "column", gap: "1rem",
        }}>
          <div>
            <label style={labelStyle}>Issue Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Missing calibration records" style={inputStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Noted Date</label>
              <input type="date" value={notedDate} onChange={(e) => setNotedDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value)} style={inputStyle}>
                {severities.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Branch</label>
              <select value={branchId} onChange={(e) => { setBranchId(e.target.value); setDeptId(""); }} style={inputStyle}>
                <option value="">— Select —</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.code} · {b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Department</label>
            <select value={deptId} onChange={(e) => setDeptId(e.target.value)} disabled={!branchId} style={{ ...inputStyle, opacity: branchId ? 1 : 0.5 }}>
              <option value="">{branchId ? "— Select —" : "Select a branch first"}</option>
              {departments.filter((d) => !branchId || d.branch_id === branchId).map((d) => <option key={d.id} value={d.id}>{d.code} · {d.name}</option>)}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Issue Description *</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
              placeholder="Describe the issue observed..." style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <div>
            <button type="submit" disabled={submitting} className="sap-action-btn" style={{ fontWeight: 700 }}>
              {submitting ? "Saving..." : "Save Issue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}