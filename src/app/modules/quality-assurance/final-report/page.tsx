"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Entry {
  id: string;
  date: string;
  issue_number: string;
  branch_code: string;
  department: string;
  category: string;
  severity: string;
  status: string;
  repeated: boolean;
  description: string;
  images: string[];
}
interface Report {
  branch_code: string;
  date: string;
  url: string;
  public_id: string;
  created_by: string | null;
  created_at: string;
}

export default function FinalReport() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [pendingReport, setPendingReport] = useState<{ code: string; name: string; date: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profileName, setProfileName] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data: prof } = await supabase.from("user_profiles").select("name").eq("user_id", user.id).maybeSingle();
      if (prof) setProfileName((prof as { name: string }).name || "");
      const [bRes, qRes, rRes] = await Promise.all([
        supabase.from("branches").select("id,name,code").order("code"),
        supabase.from("qa_issue_entries").select("*").order("issue_number"),
        supabase.from("qa_reports").select("*"),
      ]);
      if (bRes.data) setBranches(bRes.data as Branch[]);
      if (qRes.data) setEntries(qRes.data as Entry[]);
      if (rRes.data) setReports(rRes.data as Report[]);
      setLoading(false);
    };
    init();
  }, []);

  const isDone = (status: string) => status === "Resolved" || status === "Closed";
  const isPending = (status: string) => status === "Open" || status === "In Progress";

  const filtered = useMemo(() => {
    if (!dateFrom && !dateTo) return entries;
    return entries.filter((e) => {
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    });
  }, [entries, dateFrom, dateTo]);

  const unknownCodes = Array.from(new Set(filtered.map((e) => e.branch_code)))
    .filter((c) => c && !branches.some((b) => b.code === c))
    .sort() as string[];

  const branchRows = [
    ...branches.map((b) => ({ code: b.code, name: b.name })),
    ...unknownCodes.map((c) => ({ code: c, name: c })),
  ];

  const reportFor = (code: string, date: string) =>
    reports.find((r) => r.branch_code === code && r.date === date);

  const datesForBranch = (code: string) => {
    const map = new Map<string, Entry[]>();
    for (const e of filtered) {
      if (e.branch_code !== code) continue;
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return Array.from(map.entries())
      .map(([date, list]) => ({
        date,
        count: list.length,
        done: list.filter((x) => isDone(x.status)).length,
        pending: list.filter((x) => isPending(x.status)).length,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  };

  const toggleBranch = (code: string) => {
    const next = new Set(expandedBranches);
    if (next.has(code)) next.delete(code); else next.add(code);
    setExpandedBranches(next);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const toDataUrl = (url: string) =>
    new Promise<string | null>((resolve) => {
      fetch(url)
        .then((r) => r.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        })
        .catch(() => resolve(null));
    });

  const normalizeImage = (url: string) =>
    new Promise<{ data: string; iw: number; ih: number } | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (!w || !h) { resolve(null); return; }
        const max = 700;
        if (w > max || h > max) {
          const s = Math.min(max / w, max / h);
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve({ data: canvas.toDataURL("image/jpeg", 0.85), iw: w, ih: h });
      };
      img.onerror = () => {
        toDataUrl(url).then((data) => resolve(data ? { data, iw: 1, ih: 1 } : null));
      };
      img.src = url;
    });

  const generatePdf = async (code: string, name: string, date: string) => {
    setGenerating(true);
    setError("");
    setSuccess("");
    try {
      const list = filtered.filter((e) => e.branch_code === code && e.date === date);
      const done = list.filter((x) => isDone(x.status)).length;
      const pending = list.filter((x) => isPending(x.status)).length;
      const major = list.filter((x) => x.severity === "Major").length;
      const minor = list.filter((x) => x.severity === "Minor").length;

      const cats = new Map<string, number>();
      for (const x of list) cats.set(x.category, (cats.get(x.category) || 0) + 1);
      const catText = Array.from(cats.entries()).map(([c, n]) => `${c}: ${n}`).join("  •  ");

      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFillColor(0, 112, 243);
      doc.rect(0, 0, 210, 4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(0, 112, 243);
      doc.text("QAC — Quality Assurance", 14, 22);
      doc.setFontSize(14);
      doc.setTextColor(10, 37, 64);
      doc.text(`Final Report — ${name} (${code})`, 14, 29);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(`Issues marked on: ${date}    •    Generated: ${new Date().toLocaleString()}    •    ${list.length} issues`, 14, 35);

      const cards: Array<[string, string, number[]]> = [
        [String(list.length), "Total Issues", [0, 112, 243]],
        [String(done), "Done", [22, 163, 74]],
        [String(pending), "Pending", [220, 38, 38]],
        [String(major), "Major", [220, 38, 38]],
        [String(minor), "Minor", [180, 83, 9]],
      ];
      cards.forEach((c, i) => {
        const x = 14 + i * 40;
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, 40, 36, 20, 2, 2, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(15);
        doc.setTextColor(c[2][0], c[2][1], c[2][2]);
        doc.text(c[0], x + 18, 51, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(107, 114, 128);
        doc.text(c[1].toUpperCase(), x + 18, 56, { align: "center" });
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      let y = 68;
      doc.text("Category breakdown: ", 14, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      if (catText) {
        const lines = doc.splitTextToSize(catText, 150);
        doc.text(lines, 45, y);
        y += (lines.length - 1) * 4.2;
      }
      y += 6;

      const head = [["Issue #", "Issue Description", "Department", "Category", "Severity", "Status", "Done / Pending"]];
      const body = list.map((x) => [
        x.issue_number,
        x.description,
        x.department || "—",
        x.category,
        x.severity || "—",
        x.status,
        isDone(x.status) ? "Done" : "Pending",
      ]);

      autoTable(doc, {
        startY: y,
        head,
        body,
        styles: { fontSize: 8, cellPadding: 1.6 },
        headStyles: { fillColor: [0, 112, 243], fontSize: 8 },
        columnStyles: { 0: { cellWidth: 16 }, 2: { cellWidth: 28 } },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.section === "body") {
            if (data.column.index === 3) {
              const v = String(data.cell.raw);
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = v === "Performance" ? [185, 28, 28] : v === "Compliance" ? [22, 101, 52] : v === "Development" ? [29, 78, 216] : v === "FIR (MAINTENANCE)" ? [194, 65, 12] : [75, 85, 99];
            }
            if (data.column.index === 4) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = String(data.cell.raw) === "Major" ? [220, 38, 38] : [180, 83, 9];
            }
            if (data.column.index === 6) {
              data.cell.styles.fontStyle = "bold";
              data.cell.styles.textColor = String(data.cell.raw) === "Done" ? [22, 163, 74] : [220, 38, 38];
            }
          }
        },
      });

      const tableEnd = (doc as any).lastAutoTable?.finalY || y;
      let py = tableEnd + 10;

      for (const x of list) {
        const imgs = x.images || [];
        if (!imgs.length) continue;
        const norms: { data: string; iw: number; ih: number }[] = [];
        for (const img of imgs) {
          const norm = await normalizeImage(img);
          if (norm) norms.push(norm);
        }
        if (!norms.length) continue;

        if (py + 16 > 290) {
          doc.addPage();
          py = 16;
        }
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(10, 37, 64);
        doc.text(`Issue ${x.issue_number} — Evidence`, 14, py);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        const dDesc = doc.splitTextToSize(x.description || "", 180);
        doc.text(dDesc, 22, py + 5);
        py += 5 + dDesc.length * 4 + 4;

        let col = 0;
        const cellW = 56;
        const gap = 8;
        const maxH = 42;
        for (const n of norms) {
          const px = 14 + col * (cellW + gap);
          const r = Math.min(cellW / n.iw, maxH / n.ih);
          const w = n.iw * r;
          const h = n.ih * r;
          if (py + maxH + 4 > 290) {
            doc.addPage();
            py = 16;
          }
          try {
            doc.addImage(n.data, "JPEG", px, py, w, h);
          } catch {
            /* skip unreadable image */
          }
          col += 1;
          if (col === 3) {
            py += maxH + 6;
            col = 0;
          }
        }
        if (col > 0) py += maxH + 6;
        py += 6;
      }

      let contentEndY = py;

      const signatureData = await toDataUrl("/qa-signature.png");
      if (contentEndY + 36 > 290) {
        doc.addPage();
        contentEndY = 16;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      doc.text(`Reported by: ${profileName || user?.email || ""}`, 14, contentEndY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(71, 85, 105);
      doc.text("Department: Quality Assurance and Compliance.", 14, contentEndY + 6);
      if (signatureData) {
        try {
          doc.addImage(signatureData, "PNG", 14, contentEndY + 9, 42, 16);
        } catch {
          /* signature could not be embedded */
        }
      }
      doc.setFontSize(9);
      doc.setTextColor(156, 163, 175);
      doc.text(`Prepared by QAC • ${new Date().toLocaleString()}`, 14, contentEndY + 32);

      setSuccess("PDF generated — uploading…");
      const blob = doc.output("blob") as Blob;
      const path = `${code}/${date}.pdf`;
      const { error: upErr } = await supabase.storage
        .from("qa-reports")
        .upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (upErr) throw upErr;
      const url = `/api/qa/report-pdf?path=${encodeURIComponent(path)}`;

      const { error: insErr } = await supabase.from("qa_reports").upsert(
        { branch_code: code, date, url, public_id: path, created_by: user?.email || null },
        { onConflict: "branch_code,date" }
      );
      if (insErr) throw insErr;

      setReports((prev) => [
        ...prev.filter((r) => !(r.branch_code === code && r.date === date)),
        { branch_code: code, date, url, public_id: path, created_by: user?.email || null, created_at: new Date().toISOString() },
      ]);
      setSuccess(`Report saved for ${code} on ${date}. It is now view-only — delete it first if you want to regenerate.`);
      setPendingReport(null);
    } catch (err) {
      setError(`Failed to generate report: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setGenerating(false);
    }
  };

  const deleteReport = async (code: string, date: string, publicId: string) => {
    if (!window.confirm(`Delete the saved PDF for ${code} (${date})? You can generate a new one afterwards.`)) return;
    setDeleting(true);
    setError("");
    setSuccess("");
    try {
      await supabase.storage.from("qa-reports").remove([publicId]);
      const { error: dbErr } = await supabase.from("qa_reports").delete().eq("branch_code", code).eq("date", date);
      if (dbErr) throw dbErr;
      setReports((prev) => prev.filter((r) => !(r.branch_code === code && r.date === date)));
      setSuccess("Report deleted — you can now generate a new one.");
      setPendingReport(null);
    } catch (err) {
      setError(`Failed to delete report: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setDeleting(false);
    }
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

  const totalDone = filtered.filter((e) => isDone(e.status)).length;
  const totalPending = filtered.filter((e) => isPending(e.status)).length;

  const thStyle: React.CSSProperties = {
    padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.05em", color: "#fff", background: "#0070f3", border: "1px solid #0060d0", whiteSpace: "nowrap",
  };
  const tdStyle: React.CSSProperties = {
    padding: "0.5rem 0.75rem", fontSize: "0.78rem", border: "1px solid var(--sap-border)", verticalAlign: "top",
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
        <h1>Final Report</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "0.75rem" }}><span>{error}</span><button onClick={() => setError("")} style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "0.75rem" }}><span>{success}</span><button onClick={() => setSuccess("")} style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0a2540" }}>Report Period:</span>
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
          <span style={{ fontSize: "0.78rem", color: "#888", marginLeft: "auto" }}>
            {filtered.length} issues in period · ✓ {totalDone} done · ⏳ {totalPending} pending
          </span>
        </div>

        {filtered.length === 0 ? (
          <p className="sap-empty-msg">
            No issues in this period. Mark issues in the Issues List first — every branch is shown below with its dates once issues exist.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {branchRows.map((b) => {
              const dates = datesForBranch(b.code);
              const open = expandedBranches.has(b.code);
              const total = dates.reduce((a, d) => a + d.count, 0);
              const done = dates.reduce((a, d) => a + d.done, 0);
              const pending = dates.reduce((a, d) => a + d.pending, 0);
              return (
                <div key={b.code} style={{ border: "1px solid var(--sap-border)", borderRadius: "12px", overflow: "hidden", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                  <div
                    onClick={() => toggleBranch(b.code)}
                    style={{ cursor: "pointer", padding: "0.85rem 1.1rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", background: open ? "#f0f7ff" : "#fff", borderBottom: open ? "1px solid var(--sap-border)" : "none" }}
                  >
                    <span style={{ color: "#0070f3", fontSize: "0.85rem", width: "1.1rem", textAlign: "center" }}>{open ? "▼" : "▶"}</span>
                    <span className="sap-branch-code-tag">{b.code}</span>
                    <span style={{ fontWeight: 700, color: "#0a2540", flex: 1, minWidth: "150px" }}>{b.name}</span>
                    <div style={{ display: "flex", gap: "1.3rem", alignItems: "center" }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0070f3" }}>{total}</div>
                        <div style={{ fontSize: "0.62rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Issues</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#16a34a" }}>✓ {done}</div>
                        <div style={{ fontSize: "0.62rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Done</div>
                      </div>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "1rem", fontWeight: 800, color: "#dc2626" }}>⏳ {pending}</div>
                        <div style={{ fontSize: "0.62rem", color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Pending</div>
                      </div>
                    </div>
                  </div>

                  {open && (
                    <div style={{ padding: "1rem 1.1rem", background: "#fafafa" }}>
                      {dates.length === 0 ? (
                        <p style={{ fontSize: "0.82rem", color: "#999", margin: "0.5rem 0" }}>No issues recorded for {b.code} in the selected period.</p>
                      ) : (
                        <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid var(--sap-border)", background: "#fff" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "560px" }}>
                            <thead>
                              <tr>
                                <th style={thStyle}>Date Marked</th>
                                <th style={thStyle}>Issues</th>
                                <th style={thStyle}>Done</th>
                                <th style={thStyle}>Pending</th>
                                <th style={thStyle}>PDF</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dates.map((d) => {
                                const rep = reportFor(b.code, d.date);
                                return (
                                  <tr key={d.date} onClick={() => setPendingReport({ code: b.code, name: b.name, date: d.date })}
                                    style={{ cursor: "pointer" }}>
                                    <td style={{ ...tdStyle, fontWeight: 700, whiteSpace: "nowrap", color: "#0a2540" }}>{d.date}</td>
                                    <td style={{ ...tdStyle, textAlign: "center", fontWeight: 600 }}>{d.count}</td>
                                    <td style={{ ...tdStyle, textAlign: "center", color: "#16a34a", fontWeight: 600 }}>{d.done}</td>
                                    <td style={{ ...tdStyle, textAlign: "center", color: "#dc2626", fontWeight: 600 }}>{d.pending}</td>
                                    <td style={tdStyle}>
                                      {rep ? (
                                        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", justifyContent: "center" }}>
                                          <a
                                            href={rep.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            style={{ fontWeight: 700, padding: "0.3rem 0.7rem", fontSize: "0.72rem", whiteSpace: "nowrap", borderRadius: "7px", background: "#16a34a", color: "#fff", textDecoration: "none", cursor: "pointer" }}
                                          >
                                            ✔ View PDF
                                          </a>
                                          <button
                                            title="Delete this report"
                                            onClick={(e) => { e.stopPropagation(); setPendingReport({ code: b.code, name: b.name, date: d.date }); }}
                                            style={{ padding: "0.3rem 0.55rem", fontSize: "0.78rem", borderRadius: "7px", border: "1px solid #dc2626", background: "#fff", color: "#dc2626", cursor: "pointer", lineHeight: 1 }}
                                          >
                                            🗑
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setPendingReport({ code: b.code, name: b.name, date: d.date }); }}
                                          className="sap-action-btn"
                                          style={{ fontWeight: 700, padding: "0.3rem 0.7rem", fontSize: "0.72rem", whiteSpace: "nowrap" }}
                                        >
                                          🖨 Make PDF
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {generating && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 110, padding: "1rem" }}>
            <div style={{ background: "#fff", borderRadius: "14px", padding: "1.75rem 2rem", maxWidth: "380px", width: "100%", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
              <div className="sap-loading-spinner" style={{ width: 36, height: 36, borderWidth: 3, margin: "0 auto 1rem" }}></div>
              <p style={{ fontSize: "0.9rem", color: "#0a2540", fontWeight: 700 }}>Generating report…</p>
              <p style={{ fontSize: "0.78rem", color: "#888", marginTop: "0.35rem" }}>Building the PDF and uploading it. This can take a few seconds.</p>
            </div>
          </div>
        )}

        {pendingReport && !generating && !deleting && (() => {
          const existing = reportFor(pendingReport.code, pendingReport.date);
          return (
            <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: "1rem" }}>
              <div style={{ background: "#fff", borderRadius: "14px", padding: "1.5rem 1.75rem", maxWidth: "440px", width: "100%", boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
                {existing ? (
                  <>
                    <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem", color: "#0a2540" }}>Report already generated</h3>
                    <p style={{ fontSize: "0.85rem", color: "#555", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
                      A PDF for <b>{pendingReport.name} ({pendingReport.code})</b> on <b>{pendingReport.date}</b> already exists. Reports are generated once — you can view it below, or delete it to generate it again.
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem", flexWrap: "wrap" }}>
                      <button onClick={() => setPendingReport(null)} style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", background: "#f5f5f5", border: "1px solid #d9d9d9", borderRadius: "8px", cursor: "pointer", color: "#555" }}>Close</button>
                      <button onClick={() => deleteReport(pendingReport.code, pendingReport.date, existing.public_id)} style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", background: "#fff", border: "1px solid #dc2626", borderRadius: "8px", cursor: "pointer", color: "#dc2626", fontWeight: 700 }}>🗑 Delete Report</button>
                      <a href={existing.url} target="_blank" rel="noreferrer" className="sap-action-btn" style={{ fontWeight: 700, textDecoration: "none" }}>Open PDF</a>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 style={{ margin: "0 0 0.75rem", fontSize: "1.05rem", color: "#0a2540" }}>Make PDF report?</h3>
                    <p style={{ fontSize: "0.85rem", color: "#555", margin: "0 0 1.25rem", lineHeight: 1.5 }}>
                      Generate the QA Final Report PDF for <b>{pendingReport.name} ({pendingReport.code})</b> covering issues marked on <b>{pendingReport.date}</b>? The report will be saved once — afterwards you can only view it or delete it to regenerate.
                    </p>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.6rem" }}>
                      <button onClick={() => setPendingReport(null)} style={{ padding: "0.45rem 1rem", fontSize: "0.82rem", background: "#f5f5f5", border: "1px solid #d9d9d9", borderRadius: "8px", cursor: "pointer", color: "#555" }}>Cancel</button>
                      <button onClick={() => generatePdf(pendingReport.code, pendingReport.name, pendingReport.date)} className="sap-action-btn" style={{ fontWeight: 700 }}>Generate PDF</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}