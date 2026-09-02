"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Room { id: string; branch_id: string; }
interface Area { id: string; name: string; }
interface Item { id: string; name: string; }

interface AreaCatalogStat { area_id: string; count: number; }

export default function RoomInspection() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"branches" | "areas" | "items">("branches");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [roomCounts, setRoomCounts] = useState<Record<string, number>>({});

  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [newArea, setNewArea] = useState("");
  const [newItem, setNewItem] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await Promise.all([fetchBranches(), fetchAreas(), fetchItems()]);
      setLoading(false);
    };
    init();
  }, []);

  const fetchBranches = async () => {
    const { data: bRes } = await supabase.from("branches").select("id,name,code").order("name");
    if (bRes) setBranches(bRes as Branch[]);
    const { data: rRes } = await supabase.from("rooms").select("id,branch_id");
    if (rRes) {
      const counts: Record<string, number> = {};
      (rRes as Room[]).forEach((r) => { counts[r.branch_id] = (counts[r.branch_id] || 0) + 1; });
      setRoomCounts(counts);
    }
  };

  const fetchAreas = async () => {
    const { data } = await supabase.from("room_areas").select("id,name").order("name");
    if (data) setAreas(data as Area[]);
  };

  const fetchItems = async () => {
    const { data } = await supabase.from("room_items").select("id,name").order("name");
    if (data) setItems(data as Item[]);
  };

  const addArea = async () => {
    if (!newArea.trim()) return;
    setError("");
    const { error: e } = await supabase.from("room_areas").insert({ name: newArea.trim() });
    if (e) { setError(e.message); return; }
    setNewArea("");
    setSuccess("Area added!");
    setTimeout(() => setSuccess(""), 2000);
    await fetchAreas();
  };

  const deleteArea = async (id: string, name: string) => {
    setError("");
    const { count } = await supabase.from("room_assignments").select("id", { count: "exact", head: true }).eq("area_id", id);
    if (count && count > 0) {
      setError(`Cannot delete "${name}" — it is assigned to ${count} room(s). Remove it from those rooms first.`);
      return;
    }
    const { error: e } = await supabase.from("room_areas").delete().eq("id", id);
    if (e) { setError(e.message); return; }
    await fetchAreas();
  };

  const addItem = async () => {
    if (!newItem.trim()) return;
    setError("");
    const { error: e } = await supabase.from("room_items").insert({ name: newItem.trim() });
    if (e) { setError(e.message); return; }
    setNewItem("");
    setSuccess("Item added!");
    setTimeout(() => setSuccess(""), 2000);
    await fetchItems();
  };

  const deleteItem = async (id: string, name: string) => {
    setError("");
    const { count } = await supabase.from("room_assignments").select("id", { count: "exact", head: true }).eq("item_id", id);
    if (count && count > 0) {
      setError(`Cannot delete "${name}" — it is assigned to ${count} room(s). Remove it from those rooms first.`);
      return;
    }
    const { error: e } = await supabase.from("room_items").delete().eq("id", id);
    if (e) { setError(e.message); return; }
    await fetchItems();
  };

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

  const tabBtn = (t: "branches" | "areas" | "items", label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: "0.6rem 1.4rem", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer", border: "1px solid #d9d9d9",
        background: tab === t ? "#0070f3" : "#fff", color: tab === t ? "#fff" : "#444", borderRadius: "8px 8px 0 0",
      }}
    >
      {label}
    </button>
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
        <Link href="/dashboard" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </Link>
        <h1>Room Inspection</h1>
      </div>

      <div style={{ display: "flex", gap: "0.25rem", borderBottom: "2px solid #0070f3", padding: "0 1rem" }}>
        {tabBtn("branches", "Branches")}
        {tabBtn("areas", "Areas")}
        {tabBtn("items", "Items")}
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        {tab === "branches" && (
          <>
            <p style={{ fontSize: "0.86rem", color: "#666", marginBottom: "1.25rem" }}>
              Select a branch to manage its rooms, assign areas &amp; items, and create inspection reports.
            </p>
            {branches.length === 0 ? (
              <p className="sap-empty-msg">No branches configured yet. Add branches in Branches &amp; Departments first.</p>
            ) : (
              <div className="sap-tiles-grid">
                {branches.map((b) => (
                  <Link key={b.id} href={`/modules/room-inspection/${b.id}`} className="sap-tile">
                    <div className="sap-tile-icon">
                      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                        <rect x="3" y="5" width="22" height="18" rx="2" stroke="#0070f3" strokeWidth="2" fill="#fff"/>
                        <line x1="3" y1="9" x2="25" y2="9" stroke="#0070f3" strokeWidth="1.5"/>
                        <line x1="11" y1="9" x2="11" y2="23" stroke="#0070f3" strokeWidth="1.5"/>
                        <rect x="14" y="12" width="2.5" height="2.5" fill="#0070f3" opacity="0.6"/>
                        <rect x="19" y="17" width="3" height="6" rx="0.5" stroke="#0070f3" strokeWidth="1.2" fill="none"/>
                      </svg>
                    </div>
                    <div className="sap-tile-body">
                      <h3>{b.name}</h3>
                      <span style={{ fontSize: "0.72rem", color: "#0070f3", fontWeight: 700 }}>{b.code}</span>
                      <div style={{ fontSize: "0.78rem", color: "#666", marginTop: "0.3rem" }}>
                        {roomCounts[b.id] || 0} rooms
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {tab === "areas" && (
          <div style={{ maxWidth: "700px" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem", color: "#0a2540" }}>Areas</h2>
            <p style={{ fontSize: "0.82rem", color: "#666", marginBottom: "1rem" }}>
              Add areas you will assign to rooms (e.g. Bathroom, Lounge, Balcony, Window). You can delete an area only if it is not assigned to any room.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <input
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addArea(); }}
                placeholder="New area name..."
                style={{ flex: 1, padding: "0.55rem 0.7rem", fontSize: "0.85rem", border: "1px solid #d9d9d9", borderRadius: "6px" }}
              />
              <button className="sap-action-btn" onClick={addArea} style={{ fontWeight: 700 }}>+ Add Area</button>
            </div>
            {areas.length === 0 ? (
              <p className="sap-empty-msg">No areas yet. Add the first one above.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {areas.map((a) => (
                  <div key={a.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", border: "1px solid var(--sap-border)", borderRadius: "8px", padding: "0.55rem 0.85rem", background: "#fff" }}>
                    <span style={{ fontWeight: 600, color: "#0a2540", flex: 1 }}>{a.name}</span>
                    <button onClick={() => deleteArea(a.id, a.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "#cc0000", fontWeight: 700 }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "items" && (
          <div style={{ maxWidth: "700px" }}>
            <h2 style={{ fontSize: "1.1rem", margin: "0 0 0.75rem", color: "#0a2540" }}>Items</h2>
            <p style={{ fontSize: "0.82rem", color: "#666", marginBottom: "1rem" }}>
              Add items you will assign to rooms (e.g. Dental kit, Shaving kit, amenities). You can delete an item only if it is not assigned to any room.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
                placeholder="New item name..."
                style={{ flex: 1, padding: "0.55rem 0.7rem", fontSize: "0.85rem", border: "1px solid #d9d9d9", borderRadius: "6px" }}
              />
              <button className="sap-action-btn" onClick={addItem} style={{ fontWeight: 700 }}>+ Add Item</button>
            </div>
            {items.length === 0 ? (
              <p className="sap-empty-msg">No items yet. Add the first one above.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {items.map((i) => (
                  <div key={i.id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", border: "1px solid var(--sap-border)", borderRadius: "8px", padding: "0.55rem 0.85rem", background: "#fff" }}>
                    <span style={{ fontWeight: 600, color: "#0a2540", flex: 1 }}>{i.name}</span>
                    <button onClick={() => deleteItem(i.id, i.name)} style={{ background: "none", border: "none", cursor: "pointer", color: "#cc0000", fontWeight: 700 }}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
