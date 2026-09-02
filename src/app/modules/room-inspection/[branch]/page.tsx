"use client";

import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface Branch { id: string; name: string; code: string; }
interface Room { id: string; branch_id: string; name: string; room_type: string; floor: string; status: string; created_at: string; }

export default function BranchRooms() {
  const params = useParams<{ branch: string }>();
  const branchId = params.branch;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<Branch | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState("Room");
  const [roomFloor, setRoomFloor] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      await Promise.all([fetchBranch(), fetchRooms()]);
      setLoading(false);
    };
    init();
  }, [branchId]);

  const fetchBranch = async () => {
    const { data } = await supabase.from("branches").select("id,name,code").eq("id", branchId).single();
    if (data) setBranch(data as Branch);
  };

  const fetchRooms = async () => {
    const { data } = await supabase.from("rooms").select("*").eq("branch_id", branchId).order("name");
    setRooms((data || []) as Room[]);
  };

  const addRoom = async () => {
    if (!roomName.trim()) { setError("Room name is required."); return; }
    setError("");
    const { error: insErr } = await supabase.from("rooms").insert({
      branch_id: branchId,
      name: roomName.trim(),
      room_type: roomType,
      floor: roomFloor.trim(),
      status: "Clear",
    });
    if (insErr) { setError(`Failed to add room: ${insErr.message}`); return; }
    setRoomName(""); setRoomFloor(""); setShowForm(false);
    setSuccess("Room added!");
    setTimeout(() => setSuccess(""), 2000);
    await fetchRooms();
  };

  const deleteRoom = async (id: string) => {
    setError("");
    const { error: delErr } = await supabase.from("rooms").delete().eq("id", id);
    if (delErr) { setError(`Delete failed: ${delErr.message}`); return; }
    setRooms((prev) => prev.filter((r) => r.id !== id));
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
        <Link href="/modules/room-inspection" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Branches
        </Link>
        <h1>Rooms — <span style={{ color: "var(--sap-blue)" }}>{branch?.code}</span> {branch?.name}</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap", justifyContent: "space-between" }}>
          <p style={{ fontSize: "0.85rem", color: "#666", margin: 0 }}>
            Click a room to assign areas &amp; items and create its inspection report.
          </p>
          <button
            className="sap-add-btn"
            onClick={() => { setShowForm((v) => !v); setError(""); }}
          >
            {showForm ? "Cancel" : "+ Add Room"}
          </button>
        </div>

        {showForm && (
          <div className="sap-form-card" style={{ marginBottom: "1.25rem" }}>
            <h3>New Room</h3>
            <div className="sap-field-group">
              <label className="sap-field-label">Room Name / Number</label>
              <input className="sap-field-input" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="e.g. 101, Suite A" />
            </div>
            <div className="sap-field-group">
              <label className="sap-field-label">Room Type</label>
              <select className="sap-field-input" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                <option value="Room">Room</option>
                <option value="Suite">Suite</option>
                <option value="Conference Hall">Conference Hall</option>
                <option value="Restaurant">Restaurant</option>
                <option value="Kitchen">Kitchen</option>
                <option value="Lobby">Lobby</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="sap-field-group">
              <label className="sap-field-label">Floor / Level</label>
              <input className="sap-field-input" value={roomFloor} onChange={(e) => setRoomFloor(e.target.value)} placeholder="e.g. G, 1, 2, -1" />
            </div>
            <div className="sap-form-actions">
              <button className="sap-login-button" onClick={addRoom}>Add Room</button>
              <button className="sap-cancel-btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        )}

        {rooms.length === 0 ? (
          <p className="sap-empty-msg">No rooms set up for this branch yet. Add a room above.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "0.75rem" }}>
            {rooms.map((room) => (
              <div key={room.id} style={{ border: "1px solid var(--sap-border)", borderRadius: "12px", padding: "0.85rem 0.95rem", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)", position: "relative" }}>
                <Link href={`/modules/room-inspection/${branchId}/${room.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0a2540" }}>{room.name}</div>
                  <div style={{ fontSize: "0.72rem", color: "#888" }}>
                    {room.room_type}{room.floor ? ` · Floor ${room.floor}` : ""}
                  </div>
                  <div style={{ marginTop: "0.5rem", fontSize: "0.72rem", color: "#0070f3", fontWeight: 600 }}>Open →</div>
                </Link>
                <button onClick={() => deleteRoom(room.id)} title="Delete"
                  style={{ position: "absolute", top: 6, right: 6, background: "none", border: "none", cursor: "pointer", color: "#cc0000", fontSize: "0.8rem" }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
