"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface AuditImage {
  findingId: string;
  imageUrl: string;
  branchName: string;
  deptName: string;
  auditDate: string;
}

interface StorageFile {
  name: string;
  id: string;
  bucket_id?: string;
  created_at: string;
  metadata?: { size?: number };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"audit-images" | "storage">("audit-images");

  const [auditImages, setAuditImages] = useState<AuditImage[]>([]);
  const [auditImagesLoading, setAuditImagesLoading] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);

  const [buckets, setBuckets] = useState<string[]>([]);
  const [storageFiles, setStorageFiles] = useState<Array<{name:string;id:string;created_at:string|null;metadata:{size?:number}|null}>>([]);
  const [storageLoading, setStorageLoading] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<string>("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);
      setProfileLoading(true);
      const { data: prof } = await supabase.from("user_profiles").select("name").eq("user_id", user.id).maybeSingle();
      if (prof) setProfileName((prof as { name: string }).name || "");
      setProfileLoading(false);
      if (activeTab === "audit-images") fetchAuditImages();
      if (activeTab === "storage") fetchStorageFiles();
      setLoading(false);
    };
    init();
  }, []);

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error: saveErr } = await supabase.from("user_profiles").upsert(
      { user_id: user.id, name: profileName.trim(), updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    setProfileSaving(false);
    if (saveErr) { setError(`Failed to save profile: ${saveErr.message}`); return; }
    setSuccess("Profile saved!");
    setTimeout(() => setSuccess(""), 2000);
  };

  const fetchAuditImages = async () => {
    setAuditImagesLoading(true);
    try {
      const [findingsRes, branchesRes, deptsRes] = await Promise.all([
        supabase.from("audit_findings").select("id, images, branch_id, department_id, audit_date").not("images", "is", null),
        supabase.from("branches").select("id, name"),
        supabase.from("departments").select("id, name"),
      ]);

      const branchMap = new Map((branchesRes.data || []).map((b: { id: string; name: string }) => [b.id, b.name]));
      const deptMap = new Map((deptsRes.data || []).map((d: { id: string; name: string }) => [d.id, d.name]));

      const images: AuditImage[] = [];
      for (const f of findingsRes.data || []) {
        const imgs = (f.images || []) as string[];
        for (const img of imgs) {
          if (!img) continue;
          images.push({
            findingId: f.id,
            imageUrl: img,
            branchName: branchMap.get(f.branch_id) || "—",
            deptName: deptMap.get(f.department_id) || "—",
            auditDate: f.audit_date || "—",
          });
        }
      }
      setAuditImages(images);
    } catch {
      setError("Failed to load audit images");
    }
    setAuditImagesLoading(false);
  };

  const deleteAuditImage = async (findingId: string, imageUrl: string) => {
    setDeletingImage(imageUrl);
    try {
      const { data: finding } = await supabase
        .from("audit_findings")
        .select("images")
        .eq("id", findingId)
        .single();

      if (!finding) return;

      const currentImages = (finding.images || []) as string[];
      const newImages = currentImages.filter((img) => img !== imageUrl);

      await supabase.from("audit_findings").update({ images: newImages }).eq("id", findingId);

      const parts = imageUrl.split("/");
      const filename = parts[parts.length - 1];
      const publicId = filename.split(".")[0];
      const folderParts = imageUrl.split("/upload/");
      const fullPublicId = folderParts.length > 1 ? folderParts[1].replace(/\.[^.]+$/, "").replace(/^[^/]+\//, "") : publicId;

      await fetch("/api/cloudinary", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ public_id: `qac-findings/${fullPublicId}` }),
      }).catch(() => {});

      setAuditImages((prev) => prev.filter((img) => !(img.findingId === findingId && img.imageUrl === imageUrl)));
      setSuccess("Image deleted!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(`Delete failed: ${err}`);
    }
    setDeletingFile(null);
  };

  const fetchStorageFiles = async () => {
    setStorageLoading(true);
    try {
      const { data: bucketList } = await supabase.storage.listBuckets();
      const bucketNames = (bucketList || []).map((b) => b.id);
      setBuckets(bucketNames);

      if (selectedBucket) {
        const { data: files } = await supabase.storage.from(selectedBucket).list("", { limit: 1000 });
        setStorageFiles((files || []).map((f) => ({ ...f, id: f.id || f.name })));
      } else if (bucketNames.length > 0) {
        setSelectedBucket(bucketNames[0]);
        return;
      } else {
        setStorageFiles([]);
      }
    } catch {
      setError("Failed to load storage files");
    }
    setStorageLoading(false);
  };

  const deleteStorageFile = async (bucketId: string, fileName: string) => {
    setDeletingFile(fileName);
    try {
      const { error: delErr } = await supabase.storage.from(bucketId).remove([fileName]);
      if (delErr) {
        setError(`Delete failed: ${delErr.message}`);
        setDeletingFile(null);
        return;
      }
      setStorageFiles((prev) => prev.filter((f) => f.name !== fileName));
      setSuccess("File deleted from storage!");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      setError(`Delete failed: ${err}`);
    }
    setDeletingFile(null);
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
          <button onClick={() => { supabase.auth.signOut(); router.push("/login"); }} className="sap-logout-btn">Sign Out</button>
        </div>
      </div>

      <div className="sap-module-header">
        <Link href="/dashboard" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </Link>
        <h1>Settings</h1>
      </div>

      <div className="sap-dashboard-content">
        {error && <div className="sap-error-message" style={{ marginBottom: "1rem" }}><span>{error}</span><button onClick={() => setError("")} style={{ marginLeft: "0.5rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button></div>}
        {success && <div className="sap-success-message" style={{ marginBottom: "1rem" }}><span>{success}</span></div>}

        <div style={{ border: "1px solid var(--sap-border)", borderRadius: "12px", background: "#fff", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
          <h3 style={{ margin: "0 0 0.35rem", fontSize: "1rem", color: "#0a2540" }}>My Profile</h3>
          <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "#888" }}>Set your user name — it identifies you for your actions in the app.</p>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0a2540" }}>User Name</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. Ahsan"
              disabled={profileLoading}
              style={{ padding: "0.45rem 0.7rem", fontSize: "0.85rem", border: "1px solid #d9d9d9", borderRadius: "6px", minWidth: "220px", background: "#fff" }}
            />
            <button onClick={saveProfile} disabled={profileSaving} className="sap-action-btn" style={{ fontWeight: 700 }}>
              {profileSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
          <button
            onClick={() => setActiveTab("audit-images")}
            style={{
              padding: "0.6rem 1.25rem",
              fontSize: "0.85rem",
              fontWeight: activeTab === "audit-images" ? 700 : 400,
              background: activeTab === "audit-images" ? "#0070f3" : "#f5f5f5",
              color: activeTab === "audit-images" ? "#fff" : "#333",
              border: "1px solid " + (activeTab === "audit-images" ? "#0070f3" : "#ddd"),
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Audit Images ({auditImages.length})
          </button>
          <button
            onClick={() => setActiveTab("storage")}
            style={{
              padding: "0.6rem 1.25rem",
              fontSize: "0.85rem",
              fontWeight: activeTab === "storage" ? 700 : 400,
              background: activeTab === "storage" ? "#0070f3" : "#f5f5f5",
              color: activeTab === "storage" ? "#fff" : "#333",
              border: "1px solid " + (activeTab === "storage" ? "#0070f3" : "#ddd"),
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Supabase Storage
          </button>
        </div>

        {activeTab === "audit-images" && (
          <div>
            <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "#666" }}>
              Images stored in the <code>audit_findings</code> table. Deleting here removes the DB reference and the Cloudinary file.
            </div>
            {auditImagesLoading ? (
              <div className="sap-loading-spinner" style={{ width: 30, height: 30, borderWidth: 2, margin: "2rem auto" }}></div>
            ) : auditImages.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px" }}>
                No audit images found in the database.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {auditImages.map((img, i) => (
                  <div key={i} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.75rem",
                    border: "1px solid var(--sap-border)",
                    borderRadius: "8px",
                    background: "#fff",
                  }}>
                    <img
                      src={img.imageUrl}
                      alt="Audit evidence"
                      style={{ width: 60, height: 60, objectFit: "cover", borderRadius: "6px", border: "1px solid #eee" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{img.branchName} — {img.deptName}</div>
                      <div style={{ fontSize: "0.75rem", color: "#999" }}>Date: {img.auditDate}</div>
                      <div style={{ fontSize: "0.7rem", color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "400px" }}>
                        {img.imageUrl}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteAuditImage(img.findingId, img.imageUrl)}
                      disabled={deletingImage === img.imageUrl}
                      style={{
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.75rem",
                        background: deletingImage === img.imageUrl ? "#ccc" : "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: deletingImage === img.imageUrl ? "wait" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {deletingImage === img.imageUrl ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "storage" && (
          <div>
            <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "#666" }}>
              Manage files in Supabase Storage buckets.
            </div>

            {buckets.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                {buckets.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBucket(b)}
                    style={{
                      padding: "0.4rem 1rem",
                      fontSize: "0.8rem",
                      fontWeight: selectedBucket === b ? 700 : 400,
                      background: selectedBucket === b ? "#0070f3" : "#f5f5f5",
                      color: selectedBucket === b ? "#fff" : "#333",
                      border: "1px solid " + (selectedBucket === b ? "#0070f3" : "#ddd"),
                      borderRadius: "4px",
                      cursor: "pointer",
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}

            {storageLoading ? (
              <div className="sap-loading-spinner" style={{ width: 30, height: 30, borderWidth: 2, margin: "2rem auto" }}></div>
            ) : buckets.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px" }}>
                No Supabase Storage buckets found. Create one in the Supabase dashboard first.
              </div>
            ) : storageFiles.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#999", background: "#fafafa", borderRadius: "8px" }}>
                No files in bucket <strong>{selectedBucket}</strong>.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {storageFiles.map((file) => (
                  <div key={file.id} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.6rem 0.75rem",
                    border: "1px solid var(--sap-border)",
                    borderRadius: "6px",
                    background: "#fff",
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                      <div style={{ fontSize: "0.7rem", color: "#999" }}>
                        {file.metadata?.size ? formatBytes(file.metadata.size) : "—"}
                        {" · "}
                        {file.created_at ? new Date(file.created_at).toLocaleDateString() : "—"}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteStorageFile(selectedBucket, file.name)}
                      disabled={deletingFile === file.name}
                      style={{
                        padding: "0.35rem 0.7rem",
                        fontSize: "0.75rem",
                        background: deletingFile === file.name ? "#ccc" : "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: deletingFile === file.name ? "wait" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {deletingFile === file.name ? "Deleting..." : "Delete"}
                    </button>
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
