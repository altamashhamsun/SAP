"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Room { id: string; branch_id: string; name: string; room_type: string; floor: string; }
interface Area { id: string; name: string; }
interface Item { id: string; name: string; }
interface Assignment { id: string; kind: "area" | "item"; area_id: string | null; item_id: string | null; }
interface Inspection {
  id: string;
  room_id: string;
  inspection_date: string;
  property_name: string;
  coordination_with: string;
  room_type: string;
  overall_rating: string;
  major_issues: string;
  action_required: string;
  action_other: string;
  inspected_by: string;
  finalized: boolean;
  pdf_url: string;
}
interface Finding {
  id: string;
  inspection_id: string;
  kind: "area" | "item";
  area_id: string | null;
  item_id: string | null;
  note: string;
}
interface FindingImage { id: string; finding_id: string; url: string; }

const ROOM_TYPES = ["Single", "Double", "Suite", "Other"];
const RATINGS = ["Excellent", "Good", "Average", "Poor", "Needs Immediate Attention"];
const ACTIONS = ["Housekeeping", "Maintenance", "Front Office", "Other"];

export default function RoomDetail() {
  const params = useParams<{ branch: string; room: string }>();
  const branchId = params.branch;
  const roomId = params.room;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [profileName, setProfileName] = useState("");

  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [images, setImages] = useState<Record<string, FindingImage[]>>({});

  const [pendingArea, setPendingArea] = useState("");
  const [pendingItem, setPendingItem] = useState("");
  const [selectedInspectionId, setSelectedInspectionId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [showDateForm, setShowDateForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [finalizing, setFinalizing] = useState(false);
  const [uploadingFindingId, setUploadingFindingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      const { data: prof } = await supabase.from("user_profiles").select("name").eq("user_id", user.id).maybeSingle();
      if (prof) setProfileName((prof as { name: string }).name || "");
      await Promise.all([
        fetchBranch(), fetchRoom(), fetchAreas(), fetchItems(), fetchAssignments(), fetchInspections(),
      ]);
      const q = new URLSearchParams(window.location.search);
      const wantedDate = q.get("date");
      if (wantedDate) await openInspectionForDate(wantedDate, (prof as { name: string } | null)?.name || user.email || "");
      setLoading(false);
    };
    init();
  }, [roomId]);

  const fetchBranch = async () => {
    const { data } = await supabase.from("branches").select("id,name,code").eq("id", branchId).single();
    if (data) setBranch(data as Branch);
  };
  const fetchRoom = async () => {
    const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
    if (data) setRoom(data as Room);
  };
  const fetchAreas = async () => {
    const { data } = await supabase.from("room_areas").select("id,name").order("name");
    if (data) setAreas(data as Area[]);
  };
  const fetchItems = async () => {
    const { data } = await supabase.from("room_items").select("id,name").order("name");
    if (data) setItems(data as Item[]);
  };
  const fetchAssignments = async () => {
    const { data } = await supabase.from("room_assignments").select("id,kind,area_id,item_id").eq("room_id", roomId);
    setAssignments((data || []) as Assignment[]);
  };
  const fetchInspections = async () => {
    const { data } = await supabase.from("room_inspections").select("*").eq("room_id", roomId).order("inspection_date", { ascending: false });
    setInspections((data || []) as Inspection[]);
  };

  const selectInspection = async (id: string) => {
    setSelectedInspectionId(id);
    await Promise.all([fetchFindings(id), fetchImages(id)]);
  };

  const fetchFindings = async (inspectionId: string) => {
    const { data } = await supabase.from("room_findings").select("*").eq("inspection_id", inspectionId);
    setFindings((data || []) as Finding[]);
  };

  const fetchImages = async (inspectionId: string) => {
    const { data: findings } = await supabase.from("room_findings").select("id").eq("inspection_id", inspectionId);
    const fids = (findings || []).map((f) => f.id as string);
    if (fids.length === 0) { setImages({}); return; }
    const { data } = await supabase.from("room_finding_images").select("*").in("finding_id", fids);
    const map: Record<string, FindingImage[]> = {};
    (data || []).forEach((img) => {
      const fid = img.finding_id;
      if (!map[fid]) map[fid] = [];
      map[fid].push(img as FindingImage);
    });
    setImages(map);
  };

  const addAssignment = async (kind: "area" | "item", refId: string) => {
    if (!refId) return;
    setError("");
    const payload = { room_id: roomId, kind: kind as "area" | "item", area_id: kind === "area" ? refId : null, item_id: kind === "item" ? refId : null };
    const { error: e } = await supabase.from("room_assignments").insert(payload);
    if (e) { setError(e.message); return; }
    kind === "area" ? setPendingArea("") : setPendingItem("");
    await fetchAssignments();
  };
  const removeAssignment = async (id: string) => {
    setError("");
    const { error: e } = await supabase.from("room_assignments").delete().eq("id", id);
    if (e) { setError(e.message); return; }
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const createInspection = async () => {
    if (!newDate) { setError("Pick a date first."); return; }
    setError("");
    const { data, error: e } = await supabase.from("room_inspections").insert({
      room_id: roomId,
      inspection_date: newDate,
      inspected_by: profileName || user?.email || "",
      property_name: branch?.name || "",
    }).select().maybeSingle();
    if (e) { setError(e.message); return; }
    if (data) {
      await fetchInspections();
      setSelectedInspectionId(data.id);
      setNewDate("");
      setShowDateForm(false);
      await Promise.all([fetchFindings(data.id), fetchImages(data.id)]);
    }
  };

  const openInspectionForDate = async (date: string, inspectorName: string) => {
    const existing = inspections.find((i) => i.inspection_date === date);
    if (existing) {
      setSelectedInspectionId(existing.id);
      await Promise.all([fetchFindings(existing.id), fetchImages(existing.id)]);
      return;
    }
    const { data, error: e } = await supabase.from("room_inspections").insert({
      room_id: roomId,
      inspection_date: date,
      inspected_by: inspectorName,
      property_name: branch?.name || "",
    }).select().maybeSingle();
    if (e) { setError(e.message); return; }
    if (data) {
      await fetchInspections();
      setSelectedInspectionId(data.id);
      await Promise.all([fetchFindings(data.id), fetchImages(data.id)]);
    }
  };

  const saveFinding = async (kind: "area" | "item", refId: string | null, note: string) => {
    if (!selectedInspectionId) return;
    setError("");
    const payload = { inspection_id: selectedInspectionId, kind, area_id: kind === "area" ? refId : null, item_id: kind === "item" ? refId : null, note };
    const { data: existing } = await supabase.from("room_findings").select("id").eq("inspection_id", selectedInspectionId).eq("kind", kind)
      .eq(kind === "area" ? "area_id" : "item_id", refId || "");
    const current = (existing || []).find((f) => {
      const fid = (f as Finding).area_id ?? (f as Finding).item_id;
      return fid === refId;
    });
    if (current) {
      const { error: e } = await supabase.from("room_findings").update({ note }).eq("id", (current as Finding).id);
      if (e) { setError(e.message); return; }
    } else {
      const { error: e } = await supabase.from("room_findings").insert(payload);
      if (e) { setError(e.message); return; }
    }
    await fetchFindings(selectedInspectionId);
  };

  const updateReportField = async (field: string, value: string) => {
    if (!selectedInspectionId) return;
    setError("");
    const { error: e } = await supabase.from("room_inspections").update({ [field]: value }).eq("id", selectedInspectionId);
    if (e) setError(e.message);
    setInspections((prev) => prev.map((ins) => ins.id === selectedInspectionId ? { ...ins, [field]: value } as Inspection : ins));
  };

  const currentInspection = inspections.find((i) => i.id === selectedInspectionId) || null;

  const uploadFindingImage = async (findingId: string, file: File) => {
    setUploadingFindingId(findingId);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/cloudinary", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) { setError(`Upload failed: ${data.error}`); setUploadingFindingId(null); return; }
      const { error: e } = await supabase.from("room_finding_images").insert({ finding_id: findingId, url: data.url });
      if (e) { setError(e.message); setUploadingFindingId(null); return; }
      await fetchImages(selectedInspectionId);
      setUploadingFindingId(null);
      setSuccess("Evidence image added!");
      setTimeout(() => setSuccess(""), 1500);
    } catch (err) {
      setError(`Error: ${String(err)}`);
      setUploadingFindingId(null);
    }
  };

  const removeFindingImage = async (imgId: string) => {
    setError("");
    const { error: e } = await supabase.from("room_finding_images").delete().eq("id", imgId);
    if (e) { setError(e.message); return; }
    await fetchImages(selectedInspectionId);
  };

  const finalizeReport = async () => {
    if (!selectedInspectionId || !currentInspection) return;
    setFinalizing(true);
    setError("");
    try {
      const ins = currentInspection;
      const list = reportList.map((a) => ({ kind: a.kind, name: a.kind === "area" ? areaName(a) : itemName(a), refId: a.kind === "area" ? a.area_id : a.item_id }));
      const pdf = await buildPdf(ins, list);
      const blob = pdf.output("blob") as Blob;
      const path = `${roomId}/${ins.inspection_date}.pdf`;
      const { error: upErr } = await supabase.storage.from("room-reports").upload(path, blob, { contentType: "application/pdf", upsert: true });
      if (upErr) throw new Error(upErr.message);
      const url = `/api/qa/report-pdf?path=${encodeURIComponent(path)}`;
      await supabase.from("room_inspections").update({ finalized: true, pdf_url: url }).eq("id", ins.id);
      setInspections((prev) => prev.map((x) => x.id === ins.id ? { ...x, finalized: true, pdf_url: url } as Inspection : x));
      setSuccess("Report finalized. PDF generated!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(`Finalize failed: ${String(err)}`);
    } finally {
      setFinalizing(false);
    }
  };

  const deleteReport = async () => {
    if (!selectedInspectionId) return;
    if (!window.confirm("Delete this inspection report? This cannot be undone.")) return;
    setError("");
    const ins = inspections.find((x) => x.id === selectedInspectionId);
    if (ins?.pdf_url) {
      const path = `${roomId}/${ins.inspection_date}.pdf`;
      await supabase.storage.from("room-reports").remove([path]);
    }
    const { error: e } = await supabase.from("room_inspections").delete().eq("id", selectedInspectionId);
    if (e) { setError(e.message); return; }
    setSelectedInspectionId("");
    setFindings([]);
    setImages({});
    await fetchInspections();
  };

  const buildPdf = async (ins: Inspection, list: { kind: "area" | "item"; name: string; refId: string | null }[]) => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const W = 210;
    let y = 14;
    const line = (h = 0.6) => { y += h; };
    const type = (t: string) => { doc.setFont("helvetica", t); };

    doc.setFontSize(14); type("bold");
    doc.text("Hotel Room Audit / Inspection Report", W / 2, y, { align: "center" });
    doc.setLineWidth(0.5); doc.line(14, y + 2, W - 14, y + 2);
    line(8);

    doc.setFontSize(10); type("normal");
    doc.text(`Property Name: ${ins.property_name || "________________"}` + `        |        Branch: ${branch?.name || ins.property_name || "________________"}`, 14, y);
    line(7);
    const fmtDate = ins.inspection_date ? new Date(ins.inspection_date + "T00:00:00").toLocaleDateString("en-GB") : "____/____/______";
    const now = new Date();
    const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
    doc.text(`Date: ${fmtDate}        |        Time: ${time}`, 14, y);
    line(7);
    doc.text(`Inspected by: ${ins.inspected_by || "________________"}`, 14, y);
    doc.text(`Coordination with: ${ins.coordination_with || "________________"}`, 105, y);
    line(7);
    doc.text(`Room Number: ${room?.name || "________"}        |        Floor: ${room?.floor || "________"}        |        Room Type: ${ins.room_type || "________"}`, 14, y);
    line(9);

    doc.setFontSize(11); type("bold");
    doc.text("1. Report Objective", 14, y); line(6);
    doc.setFontSize(9); type("normal");
    const obj = doc.splitTextToSize("To inspect the assigned guest room(s) for cleanliness, hygiene standards, condition of furniture & fixtures, availability of amenities, and overall readiness for guest occupancy. Any deficiencies found will be recorded for corrective action.", W - 28);
    doc.text(obj, 14, y); line(obj.length * 4 + 3);

    doc.setFontSize(11); type("bold");
    doc.text("2. Scope of Inspection", 14, y); line(6);
    doc.setFontSize(9); type("normal");
    const scope = [
      "Overall room cleanliness & maintenance",
      "Bed & linen condition",
      "Bathroom hygiene & functionality",
      "Availability of standard amenities",
      "Hygiene, safety & pest control",
      "Functionality of electrical & electronic items (AC, lights, TV, etc.)",
    ];
    scope.forEach((s) => { doc.text(`\u2022 ${s}`, 16, y); line(5); });
    doc.setFontSize(8); type("italic");
    const note = doc.splitTextToSize("Note: This inspection is not limited to the physical condition and readiness of the room only. It may cover guest feedback, billing, or front-office processes.", W - 28);
    doc.text(note, 14, y); line(note.length * 3.5 + 4);

    doc.setFontSize(11); type("bold");
    doc.text("3. Findings", 14, y); line(6);
    if (list.length === 0) {
      doc.setFontSize(9); type("normal"); doc.text("No areas/items assigned.", 14, y); line(6);
    } else {
      doc.setFontSize(8.5); type("bold");
      doc.setFillColor(0, 112, 243); doc.setTextColor(255);
      doc.rect(14, y, W - 28, 6, "F");
      doc.text("Type", 16, y + 4);
      doc.text("Area / Item", 40, y + 4);
      doc.text("Finding / Remark", 90, y + 4);
      line(7); doc.setTextColor(0); type("normal");
      list.forEach((it) => {
        const fi = findings.find((f) => f.kind === it.kind && f[it.kind === "area" ? "area_id" : "item_id"] === it.refId);
        const noteText = fi && fi.note ? fi.note : "";
        const lines = doc.splitTextToSize(noteText || "-", 100);
        const hgt = Math.max(6, lines.length * 3.6);
        if (y + hgt > 285) { doc.addPage(); y = 14; }
        doc.text(it.kind === "area" ? "Area" : "Item", 16, y + 4);
        doc.text(it.name, 40, y + 4);
        doc.text(lines, 90, y + 4);
        y += hgt + 3;
      });
    }
    line(3);

    doc.setFontSize(11); type("bold");
    doc.text("Overall Rating", 14, y); line(6);
    doc.setFontSize(9); type("normal");
    const ratingStr = RATINGS.map((r) => `\u25A1 ${r}`).join("    ");
    doc.text(ratingStr, 14, y); line(7);
    doc.text(`Selected: ${ins.overall_rating || "Not set"}`, 14, y); line(8);

    doc.setFontSize(11); type("bold");
    doc.text("Major Issues Found", 14, y); line(6);
    doc.setFontSize(9); type("normal");
    const mi = doc.splitTextToSize(ins.major_issues || "________________", W - 28);
    doc.text(mi, 14, y); line(mi.length * 4 + 4);

    doc.setFontSize(11); type("bold");
    doc.text("Action Required", 14, y); line(6);
    doc.setFontSize(9); type("normal");
    const actionStr = ACTIONS.map((a) => `\u25A1 ${a}`).join("    ");
    doc.text(actionStr, 14, y); line(7);
    doc.text(`Selected: ${ins.action_required || "Not set"}${ins.action_other ? ` | Other: ${ins.action_other}` : ""}`, 14, y); line(10);

    doc.text(`Inspector Signature: ____________________        Date: ${fmtDate}`, 14, y);
    return doc;
  };

  const assignedAreas = () => assignments.filter((a) => a.kind === "area");
  const assignedItems = () => assignments.filter((a) => a.kind === "item");
  const areaName = (a: Assignment) => areas.find((x) => x.id === a.area_id)?.name || "";
  const itemName = (a: Assignment) => items.find((x) => x.id === a.item_id)?.name || "";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
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

  const reportList = [...assignedAreas(), ...assignedItems()];

  const fieldLabel = (t: string) => (
    <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: "0.03em", display: "block", marginBottom: "0.25rem" }}>{t}</label>
  );

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
        <Link href={`/modules/room-inspection/${branchId}`} className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Rooms
        </Link>
        <h1>{room?.name} — <span style={{ color: "var(--sap-blue)" }}>{branch?.code}</span> {branch?.name}</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        {/* Assign Areas & Items */}
        <div style={{ border: "1px solid var(--sap-border)", borderRadius: "12px", padding: "1.1rem 1.25rem", background: "#fff", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.5rem", color: "#0a2540" }}>Assign Areas &amp; Items to this Room</h2>
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <h3 style={{ fontSize: "0.85rem", margin: "0 0 0.5rem", color: "#1d4ed8" }}>Areas</h3>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <select value={pendingArea} onChange={(e) => setPendingArea(e.target.value)} style={{ flex: 1, padding: "0.45rem 0.5rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px" }}>
                  <option value="">— Select area —</option>
                  {areas.filter((a) => !assignedAreas().some((x) => x.area_id === a.id)).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <button className="sap-action-btn" onClick={() => addAssignment("area", pendingArea)} style={{ fontWeight: 700, whiteSpace: "nowrap" }}>+ Add</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {assignedAreas().length === 0 && <span style={{ fontSize: "0.78rem", color: "#bbb" }}>No areas assigned.</span>}
                {assignedAreas().map((a) => (
                  <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#eff6ff", border: "1px solid #2563eb", color: "#1d4ed8", borderRadius: "20px", padding: "0.25rem 0.7rem", fontSize: "0.78rem", fontWeight: 600 }}>
                    {areaName(a)}
                    <button onClick={() => removeAssignment(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8", fontWeight: 700 }}>✕</button>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ flex: "1 1 300px" }}>
              <h3 style={{ fontSize: "0.85rem", margin: "0 0 0.5rem", color: "#166534" }}>Items</h3>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <select value={pendingItem} onChange={(e) => setPendingItem(e.target.value)} style={{ flex: 1, padding: "0.45rem 0.5rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px" }}>
                  <option value="">— Select item —</option>
                  {items.filter((i) => !assignedItems().some((x) => x.item_id === i.id)).map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
                <button className="sap-action-btn" onClick={() => addAssignment("item", pendingItem)} style={{ fontWeight: 700, whiteSpace: "nowrap" }}>+ Add</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {assignedItems().length === 0 && <span style={{ fontSize: "0.78rem", color: "#bbb" }}>No items assigned.</span>}
                {assignedItems().map((a) => (
                  <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#f0fdf4", border: "1px solid #16a34a", color: "#166534", borderRadius: "20px", padding: "0.25rem 0.7rem", fontSize: "0.78rem", fontWeight: 600 }}>
                    {itemName(a)}
                    <button onClick={() => removeAssignment(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", fontWeight: 700 }}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inspection Report */}
        <div style={{ border: "1px solid var(--sap-border)", borderRadius: "12px", padding: "1.1rem 1.25rem", background: "#fff" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem", color: "#0a2540" }}>Inspection Report</h2>
          <p style={{ fontSize: "0.8rem", color: "#888", margin: "0 0 1rem" }}>Select a report date to open it, or create a new one. Findings auto-save; press Finalize when done to generate the PDF.</p>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#666", display: "block", marginBottom: "0.25rem" }}>Report Date</label>
              <select value={selectedInspectionId} onChange={(e) => selectInspection(e.target.value)} style={{ padding: "0.45rem 0.6rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px", minWidth: "180px" }}>
                <option value="">— Select / New —</option>
                {inspections.map((ins) => (
                  <option key={ins.id} value={ins.id}>{ins.inspection_date}{ins.finalized ? " (PDF)" : ""}</option>
                ))}
              </select>
            </div>
            <button className="sap-action-btn" onClick={() => setShowDateForm((v) => !v)} style={{ fontWeight: 700 }}>{showDateForm ? "Cancel" : "+ New Date"}</button>
            {showDateForm && (
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#666", display: "block", marginBottom: "0.25rem" }}>Pick Date</label>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: "0.45rem 0.6rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px" }} />
                </div>
                <button className="sap-action-btn" onClick={createInspection} style={{ fontWeight: 700 }}>Create</button>
              </div>
            )}
            {selectedInspectionId && currentInspection && (
              <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
                {currentInspection.pdf_url && (
                  <a href={currentInspection.pdf_url} target="_blank" rel="noopener noreferrer" className="sap-action-btn" style={{ textDecoration: "none", fontWeight: 700, display: "inline-block" }}>View PDF</a>
                )}
                <button className="sap-action-btn" onClick={finalizeReport} disabled={finalizing} style={{ fontWeight: 700, background: currentInspection.finalized ? "#16a34a" : undefined }}>
                  {finalizing ? "Generating…" : currentInspection.finalized ? "Regenerate PDF" : "Finalize & Make PDF"}
                </button>
                <button onClick={deleteReport} style={{ fontWeight: 700, padding: "0.5rem 0.9rem", background: "#fff", color: "#cc0000", border: "1px solid #cc0000", borderRadius: "6px", cursor: "pointer" }}>Delete Report</button>
              </div>
            )}
          </div>

          {!selectedInspectionId ? (
            <p className="sap-empty-msg">Select or create a report date to open the Hotel Room Audit / Inspection Report.</p>
          ) : currentInspection ? (
            <div style={{ border: "1px solid var(--sap-border)", borderRadius: "10px", padding: "1.5rem", background: "#fcfcfc" }}>
              <h3 style={{ margin: "0 0 1.25rem", fontSize: "1.15rem", textAlign: "center", color: "#0a2540" }}>Hotel Room Audit / Inspection Report</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem 2rem", marginBottom: "1.25rem" }}>
                <div>
                  {fieldLabel("Property Name")}
                  <input className="sap-field-input" value={currentInspection.property_name} onChange={(e) => updateReportField("property_name", e.target.value)} style={{ fontSize: "0.85rem" }} />
                </div>
                <div>
                  {fieldLabel("Branch Name")}
                  <input className="sap-field-input" value={branch?.name || ""} readOnly style={{ fontSize: "0.85rem", background: "#f5f5f5" }} />
                </div>
                <div>
                  {fieldLabel("Date (dd/mm/yyyy)")}
                  <input className="sap-field-input" value={currentInspection.inspection_date ? new Date(currentInspection.inspection_date + "T00:00:00").toLocaleDateString("en-GB") : ""} readOnly style={{ fontSize: "0.85rem", background: "#f5f5f5" }} />
                </div>
                <div>
                  {fieldLabel("Time (24-hour)")}
                  <input className="sap-field-input" value={new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })} readOnly style={{ fontSize: "0.85rem", background: "#f5f5f5" }} />
                </div>
                <div>
                  {fieldLabel("Inspected by")}
                  <input className="sap-field-input" value={currentInspection.inspected_by} readOnly style={{ fontSize: "0.85rem", background: "#f5f5f5" }} />
                </div>
                <div>
                  {fieldLabel("Coordination with")}
                  <input className="sap-field-input" value={currentInspection.coordination_with} onChange={(e) => updateReportField("coordination_with", e.target.value)} style={{ fontSize: "0.85rem" }} />
                </div>
                <div>
                  {fieldLabel("Room Number")}
                  <input className="sap-field-input" value={room?.name || ""} readOnly style={{ fontSize: "0.85rem", background: "#f5f5f5" }} />
                </div>
                <div>
                  {fieldLabel("Floor")}
                  <input className="sap-field-input" value={room?.floor || ""} readOnly style={{ fontSize: "0.85rem", background: "#f5f5f5" }} />
                </div>
              </div>

              <div style={{ marginBottom: "1rem" }}>
                {fieldLabel("Room Type")}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {ROOM_TYPES.map((o) => (
                    <label key={o} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", cursor: "pointer" }}>
                      <input type="radio" checked={currentInspection.room_type === o} onChange={() => updateReportField("room_type", o)} /> {o}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "#333", lineHeight: "1.5" }}>
                <p style={{ fontWeight: 700, margin: "0 0 0.25rem" }}>1. Report Objective</p>
                <p style={{ margin: 0 }}>To inspect the assigned guest room(s) for cleanliness, hygiene standards, condition of furniture &amp; fixtures, availability of amenities, and overall readiness for guest occupancy. Any deficiencies found will be recorded for corrective action.</p>
              </div>

              <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "#333", lineHeight: "1.5" }}>
                <p style={{ fontWeight: 700, margin: "0 0 0.25rem" }}>2. Scope of Inspection</p>
                <p style={{ margin: "0 0 0.25rem" }}>This audit covers the following areas of the room:</p>
                <ul style={{ margin: "0 0 0.25rem", paddingLeft: "1.2rem" }}>
                  <li>Overall room cleanliness &amp; maintenance</li>
                  <li>Bed &amp; linen condition</li>
                  <li>Bathroom hygiene &amp; functionality</li>
                  <li>Availability of standard amenities</li>
                  <li>Hygiene, safety &amp; pest control</li>
                  <li>Functionality of electrical &amp; electronic items (AC, lights, TV, etc.)</li>
                </ul>
                <p style={{ margin: 0, fontStyle: "italic", fontSize: "0.78rem" }}>Note: This inspection is not limited to the physical condition and readiness of the room only. It may cover guest feedback, billing, or front-office processes.</p>
              </div>

              {/* Findings */}
              <div style={{ marginBottom: "1.25rem" }}>
                <p style={{ fontWeight: 700, margin: "0 0 0.5rem", fontSize: "0.9rem" }}>3. Findings</p>
                {reportList.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "#999" }}>Assign areas/items above to build the findings checklist.</p>
                ) : (
                  <div style={{ overflowX: "auto", border: "1px solid var(--sap-border)", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Type</th>
                          <th style={{ ...thStyle, minWidth: "140px" }}>Area / Item</th>
                          <th style={{ ...thStyle, minWidth: "280px" }}>Finding / Remark</th>
                          <th style={{ ...thStyle, minWidth: "160px" }}>Evidence Pictures</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportList.map((a) => {
                          const isArea = a.kind === "area";
                          const fid = isArea ? a.area_id : a.item_id;
                          const key = `${selectedInspectionId}-${isArea ? "area" : "item"}-${a.id}`;
                          const finding = findings.find((f) => f.kind === a.kind && f[isArea ? "area_id" : "item_id"] === fid);
                          const imgs = images[finding?.id || ""] || [];
                          return (
                            <React.Fragment key={a.id}>
                              <tr>
                                <td style={{ ...tdStyle, fontWeight: 700, color: isArea ? "#1d4ed8" : "#166534" }}>{isArea ? "Area" : "Item"}</td>
                                <td style={{ ...tdStyle, fontWeight: 600 }}>{isArea ? areaName(a) : itemName(a)}</td>
                                <td style={{ ...tdStyle, padding: "0.4rem 0.75rem" }}>
                                  <textarea key={key} defaultValue={finding?.note || ""} onBlur={(e) => saveFinding(a.kind, fid, e.target.value)}
                                    placeholder="Type finding... (auto-saves on blur)" style={{ width: "100%", minHeight: "42px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.5rem", resize: "vertical", background: "#fff" }} />
                                </td>
                                <td style={{ ...tdStyle }}>
                                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                                    {finding && (
                                      <>
                                        {imgs.map((img) => (
                                          <div key={img.id} style={{ position: "relative" }}>
                                            <a href={img.url} target="_blank" rel="noopener noreferrer" title="View evidence">
                                              <img src={img.url} alt="evidence" loading="lazy" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: "4px", border: "1px solid #ddd" }} />
                                            </a>
                                            <button onClick={() => removeFindingImage(img.id)} style={{ position: "absolute", top: -5, right: -5, background: "#dc2626", border: "none", color: "#fff", width: 15, height: 15, borderRadius: "50%", fontSize: "0.6rem", lineHeight: 1, cursor: "pointer" }}>✕</button>
                                          </div>
                                        ))}
                                        <label style={{ cursor: "pointer", background: uploadingFindingId === finding.id ? "#e5e7eb" : "#f5f5f5", border: "1px dashed #d9d9d9", borderRadius: "4px", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", color: "#0070f3" }}>
                                          {uploadingFindingId === finding.id ? "⏳" : "+"}
                                          <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f && finding) uploadFindingImage(finding.id, f); e.target.value = ""; }} />
                                        </label>
                                      </>
                                    )}
                                    {!finding && (
                                      <span style={{ fontSize: "0.72rem", color: "#bbb" }}>Save a finding first to attach pictures.</span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Rating / Major Issues / Action / Signature */}
              <div style={{ marginBottom: "1.25rem" }}>
                {fieldLabel("Overall Rating")}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {RATINGS.map((o) => (
                    <label key={o} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", cursor: "pointer" }}>
                      <input type="radio" checked={currentInspection.overall_rating === o} onChange={() => updateReportField("overall_rating", o)} /> {o}
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                {fieldLabel("Major Issues Found")}
                <textarea className="sap-field-input" value={currentInspection.major_issues} onChange={(e) => updateReportField("major_issues", e.target.value)} style={{ minHeight: "60px", fontSize: "0.85rem", resize: "vertical" }} />
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                {fieldLabel("Action Required")}
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                  {ACTIONS.map((o) => (
                    <label key={o} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.82rem", cursor: "pointer" }}>
                      <input type="radio" checked={currentInspection.action_required === o} onChange={() => updateReportField("action_required", o)} /> {o}
                    </label>
                  ))}
                </div>
                {currentInspection.action_required === "Other" && (
                  <input className="sap-field-input" value={currentInspection.action_other} onChange={(e) => updateReportField("action_other", e.target.value)} placeholder="Specify other action..."
                    style={{ fontSize: "0.85rem", maxWidth: "320px" }} />
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap", paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
                <span style={{ fontSize: "0.85rem" }}>Inspector Signature: <span style={{ borderBottom: "1px solid #999", display: "inline-block", minWidth: "150px", padding: "0 0.25rem" }}>&nbsp;</span></span>
                <span style={{ fontSize: "0.85rem" }}>Date: <span style={{ borderBottom: "1px solid #999", display: "inline-block", minWidth: "100px" }}>&nbsp;</span></span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
  color: "#fff", background: "#0070f3", border: "1px solid #0060d0", whiteSpace: "nowrap",
};
const tdStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem", fontSize: "0.8rem", border: "1px solid var(--sap-border)", verticalAlign: "top", background: "#fff",
};
