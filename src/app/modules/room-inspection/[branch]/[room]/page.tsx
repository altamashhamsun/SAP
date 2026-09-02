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
interface Assignment {
  id: string;
  kind: "area" | "item";
  area_id: string | null;
  item_id: string | null;
}
interface Inspection { id: string; room_id: string; inspection_date: string; }
interface Finding {
  id: string;
  inspection_id: string;
  kind: "area" | "item";
  area_id: string | null;
  item_id: string | null;
  note: string;
}

export default function RoomDetail() {
  const params = useParams<{ branch: string; room: string }>();
  const branchId = params.branch;
  const roomId = params.room;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [room, setRoom] = useState<Room | null>(null);

  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);

  const [pendingArea, setPendingArea] = useState("");
  const [pendingItem, setPendingItem] = useState("");
  const [selectedInspectionId, setSelectedInspectionId] = useState("");
  const [newDate, setNewDate] = useState("");
  const [showDateForm, setShowDateForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await Promise.all([
        fetchBranch(),
        fetchRoom(),
        fetchAreas(),
        fetchItems(),
        fetchAssignments(),
        fetchInspections(),
      ]);
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
    const { data } = await supabase.from("room_inspections").select("id,room_id,inspection_date").eq("room_id", roomId).order("inspection_date", { ascending: false });
    setInspections((data || []) as Inspection[]);
  };

  const fetchFindings = async (inspectionId: string) => {
    const { data } = await supabase.from("room_findings").select("*").eq("inspection_id", inspectionId);
    setFindings((data || []) as Finding[]);
  };

  const addAssignment = async (kind: "area" | "item", refId: string) => {
    if (!refId) return;
    setError("");
    const payload = {
      room_id: roomId,
      kind: kind as "area" | "item",
      area_id: kind === "area" ? refId : null,
      item_id: kind === "item" ? refId : null,
    };
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
    const { data, error: e } = await supabase.from("room_inspections").insert({ room_id: roomId, inspection_date: newDate }).select().maybeSingle();
    if (e) { setError(e.message); return; }
    if (data) {
      await fetchInspections();
      setSelectedInspectionId(data.id);
      setNewDate("");
      setShowDateForm(false);
      await fetchFindings(data.id);
    }
  };

  const selectInspection = async (id: string) => {
    setSelectedInspectionId(id);
    await fetchFindings(id);
  };

  const saveFinding = async (kind: "area" | "item", refId: string | null, note: string) => {
    if (!selectedInspectionId) return;
    setSavingId(`${kind}-${refId}`);
    setError("");
    const payload = {
      inspection_id: selectedInspectionId,
      kind,
      area_id: kind === "area" ? refId : null,
      item_id: kind === "item" ? refId : null,
      note,
    };
    const { error: e } = await supabase.from("room_findings").upsert(payload, { onConflict: "inspection_id,kind,area_id,item_id" });
    if (e) { setError(e.message); setSavingId(null); return; }
    setSuccess("Saved!");
    setTimeout(() => setSuccess(""), 1500);
    setSavingId(null);
    await fetchFindings(selectedInspectionId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const assignedAreas = assignments.filter((a) => a.kind === "area");
  const assignedItems = assignments.filter((a) => a.kind === "item");

  const findingFor = (kind: "area" | "item", refId: string) =>
    findings.find((f) => f.kind === kind && f[refFor(kind)] === refId);

  const noteFor = (kind: "area" | "item", refId: string) => {
    const f = findingFor(kind, refId);
    return f ? f.note : "";
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
        <div style={{ border: "1px solid var(--sap-border)", borderRadius: "12px", padding: "1.1rem 1.25rem", background: "#fff", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem", color: "#0a2540" }}>Assign Areas &amp; Items to this Room</h2>
          <p style={{ fontSize: "0.8rem", color: "#888", margin: "0 0 1rem" }}>Add areas (Bathroom, Lounge...) and items (Dental kit, Shaving kit...) as tags. These will appear in the inspection report.</p>

          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 300px" }}>
              <h3 style={{ fontSize: "0.85rem", margin: "0 0 0.5rem", color: "#0070f3" }}>Areas</h3>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <select value={pendingArea} onChange={(e) => setPendingArea(e.target.value)} style={{ flex: 1, padding: "0.45rem 0.5rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px" }}>
                  <option value="">— Select area —</option>
                  {areas.filter((a) => !assignedAreas.some((x) => x.area_id === a.id)).map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <button className="sap-action-btn" onClick={() => addAssignment("area", pendingArea)} style={{ fontWeight: 700, whiteSpace: "nowrap" }}>+ Add</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {assignedAreas.length === 0 && <span style={{ fontSize: "0.78rem", color: "#bbb" }}>No areas assigned yet.</span>}
                {assignedAreas.map((a) => (
                  <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#eff6ff", border: "1px solid #2563eb", color: "#1d4ed8", borderRadius: "20px", padding: "0.25rem 0.7rem", fontSize: "0.78rem", fontWeight: 600 }}>
                    {areas.find((x) => x.id === a.area_id)?.name || a.area_id}
                    <button onClick={() => removeAssignment(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#1d4ed8", fontWeight: 700 }}>✕</button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ flex: "1 1 300px" }}>
              <h3 style={{ fontSize: "0.85rem", margin: "0 0 0.5rem", color: "#0070f3" }}>Items</h3>
              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
                <select value={pendingItem} onChange={(e) => setPendingItem(e.target.value)} style={{ flex: 1, padding: "0.45rem 0.5rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px" }}>
                  <option value="">— Select item —</option>
                  {items.filter((i) => !assignedItems.some((x) => x.item_id === i.id)).map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
                <button className="sap-action-btn" onClick={() => addAssignment("item", pendingItem)} style={{ fontWeight: 700, whiteSpace: "nowrap" }}>+ Add</button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {assignedItems.length === 0 && <span style={{ fontSize: "0.78rem", color: "#bbb" }}>No items assigned yet.</span>}
                {assignedItems.map((a) => (
                  <span key={a.id} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "#f0fdf4", border: "1px solid #16a34a", color: "#166534", borderRadius: "20px", padding: "0.25rem 0.7rem", fontSize: "0.78rem", fontWeight: 600 }}>
                    {items.find((x) => x.id === a.item_id)?.name || a.item_id}
                    <button onClick={() => removeAssignment(a.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#166534", fontWeight: 700 }}>✕</button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inspection Report */}
        <div style={{ border: "1px solid var(--sap-border)", borderRadius: "12px", padding: "1.1rem 1.25rem", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h2 style={{ fontSize: "1rem", margin: "0 0 0.25rem", color: "#0a2540" }}>Create Inspection Report</h2>
          <p style={{ fontSize: "0.8rem", color: "#888", margin: "0 0 1rem" }}>
            Select a saved date to view/edit its findings, or add a new report date. Then enter findings for each area and item.
          </p>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
            <div>
              <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#666", display: "block", marginBottom: "0.25rem" }}>Report Date</label>
              <select
                value={selectedInspectionId}
                onChange={(e) => selectInspection(e.target.value)}
                style={{ padding: "0.45rem 0.6rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px", minWidth: "180px" }}
              >
                <option value="">— Select a date —</option>
                {inspections.map((ins) => (
                  <option key={ins.id} value={ins.id}>{ins.inspection_date}</option>
                ))}
              </select>
            </div>
            <button className="sap-action-btn" onClick={() => setShowDateForm((v) => !v)} style={{ fontWeight: 700 }}>
              {showDateForm ? "Cancel" : "+ New Date"}
            </button>
            {showDateForm && (
              <div style={{ display: "flex", gap: "0.4rem", alignItems: "flex-end" }}>
                <div>
                  <label style={{ fontSize: "0.7rem", fontWeight: 600, color: "#666", display: "block", marginBottom: "0.25rem" }}>Pick Date</label>
                  <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{ padding: "0.45rem 0.6rem", fontSize: "0.8rem", border: "1px solid #d9d9d9", borderRadius: "6px" }} />
                </div>
                <button className="sap-action-btn" onClick={createInspection} style={{ fontWeight: 700 }}>Create</button>
              </div>
            )}
          </div>

          {!selectedInspectionId ? (
            <p className="sap-empty-msg">Select or create a report date to start recording findings.</p>
          ) : (
            <div style={{ overflowX: "auto", border: "1px solid var(--sap-border)", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "650px" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "#fff", background: "#0070f3", border: "1px solid #0060d0" }}>Type</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "#fff", background: "#0070f3", border: "1px solid #0060d0", minWidth: "160px" }}>Name</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "#fff", background: "#0070f3", border: "1px solid #0060d0", minWidth: "320px" }}>Finding / Remark</th>
                    <th style={{ padding: "0.6rem 0.75rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "#fff", background: "#0070f3", border: "1px solid #0060d0" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedAreas.map((a) => {
                    const name = areas.find((x) => x.id === a.area_id)?.name || a.area_id || "";
                    const val = noteFor("area", a.area_id || "");
                    return (
                      <tr key={a.id}>
                        <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", border: "1px solid var(--sap-border)", fontWeight: 700, color: "#1d4ed8" }}>Area</td>
                        <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", border: "1px solid var(--sap-border)", fontWeight: 600 }}>{name}</td>
                        <td style={{ padding: "0.4rem 0.75rem", border: "1px solid var(--sap-border)" }}>
                          <textarea
                            key={`area-${selectedInspectionId}-${a.id}`}
                            defaultValue={val}
                            onBlur={(e) => saveFinding("area", a.area_id, e.target.value)}
                            placeholder="Type finding... (auto-saves on blur)"
                            style={{ width: "100%", minHeight: "40px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.5rem", resize: "vertical" }} />
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--sap-border)", textAlign: "center", fontSize: "0.75rem", color: "#888" }}>
                          {savingId === `area-${a.area_id}` ? "saving…" : "💾"}
                        </td>
                      </tr>
                    );
                  })}
                  {assignedItems.map((a) => {
                    const name = items.find((x) => x.id === a.item_id)?.name || a.item_id || "";
                    const val = noteFor("item", a.item_id || "");
                    return (
                      <tr key={a.id}>
                        <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.75rem", border: "1px solid var(--sap-border)", fontWeight: 700, color: "#166534" }}>Item</td>
                        <td style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem", border: "1px solid var(--sap-border)", fontWeight: 600 }}>{name}</td>
                        <td style={{ padding: "0.4rem 0.75rem", border: "1px solid var(--sap-border)" }}>
                          <textarea
                            key={`item-${selectedInspectionId}-${a.id}`}
                            defaultValue={val}
                            onBlur={(e) => saveFinding("item", a.item_id, e.target.value)}
                            placeholder="Type finding... (auto-saves on blur)"
                            style={{ width: "100%", minHeight: "40px", fontSize: "0.8rem", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.4rem 0.5rem", resize: "vertical" }} />
                        </td>
                        <td style={{ padding: "0.5rem 0.75rem", border: "1px solid var(--sap-border)", textAlign: "center", fontSize: "0.75rem", color: "#888" }}>
                          {savingId === `item-${a.item_id}` ? "saving…" : "💾"}
                        </td>
                      </tr>
                    );
                  })}
                  {assignedAreas.length === 0 && assignedItems.length === 0 && (
                    <tr>
                      <td colSpan={4} style={{ padding: "1rem", textAlign: "center", fontSize: "0.8rem", color: "#999", border: "1px solid var(--sap-border)" }}>
                        No areas or items assigned to this room yet. Add some above to build the inspection checklist.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  function refFor(kind: "area" | "item"): "area_id" | "item_id" {
    return kind === "area" ? "area_id" : "item_id";
  }
}
