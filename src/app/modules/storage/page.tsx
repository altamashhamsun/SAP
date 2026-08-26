"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import React from "react";
import Link from "next/link";

interface CloudinaryUsage {
  storage: { used: number; limit: number };
  bandwidth: { used: number; limit: number };
  assets: { count: number };
}

interface SupabaseFile {
  name: string;
  metadata: { size?: number };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export default function StoragePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudinary, setCloudinary] = useState<CloudinaryUsage | null>(null);
  const [supabaseStorage, setSupabaseStorage] = useState({ used: 0, files: 0, buckets: 0, dbSize: 0 });
  const [cloudinaryError, setCloudinaryError] = useState("");

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
    if (!user) return;

    const fetchSupabaseStorage = async () => {
      try {
        const { data: buckets } = await supabase.storage.listBuckets();
        let totalSize = 0;
        let totalFiles = 0;
        const bucketCount = buckets?.length || 0;

        for (const bucket of buckets || []) {
          const { data: files } = await supabase.storage.from(bucket.id).list("", { limit: 1000 });
          if (files) {
            totalFiles += files.length;
            for (const f of files) {
              totalSize += (f as SupabaseFile).metadata?.size || 0;
            }
          }
        }

        const { data: dbSizeData } = await supabase.rpc("get_database_size");
        const dbSize = typeof dbSizeData === "number" ? dbSizeData : 0;

        setSupabaseStorage({ used: totalSize, files: totalFiles, buckets: bucketCount, dbSize });
      } catch {
        setSupabaseStorage({ used: 0, files: 0, buckets: 0, dbSize: 0 });
      }
    };

    const fetchCloudinary = async () => {
      try {
        const res = await fetch("/api/storage-usage");
        const data = await res.json();
        if (res.ok) {
          setCloudinary(data);
        } else {
          setCloudinaryError(data.error || "Failed to load Cloudinary stats");
        }
      } catch {
        setCloudinaryError("Failed to connect to Cloudinary API");
      }
    };

    fetchSupabaseStorage();
    fetchCloudinary();
  }, [user]);

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

  if (!user) { router.push("/login"); return null; }

  const supabaseLimit = 1024 * 1024 * 1024; // 1 GB free tier
  const supabaseDbLimit = 1024 * 1024 * 1024; // 1 GB database
  const supabaseFilePercent = Math.min((supabaseStorage.used / supabaseLimit) * 100, 100);
  const supabaseDbPercent = Math.min((supabaseStorage.dbSize / supabaseDbLimit) * 100, 100);
  const cloudinaryPercent = cloudinary?.storage.limit
    ? Math.min((cloudinary.storage.used / cloudinary.storage.limit) * 100, 100)
    : 0;

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
        <Link href="/" className="sap-back-link">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M13 4l-6 6 6 6" stroke="#0070f3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to Dashboard
        </Link>
        <h1>Storage Overview</h1>
      </div>

      <div className="sap-dashboard-content">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {/* Supabase Storage */}
          <div className="sap-plan-form-section">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <ellipse cx="14" cy="7" rx="10" ry="4" stroke="#3ECF8E" strokeWidth="2" fill="#fff"/>
                <path d="M4 7v14c0 2.2 4.5 4 10 4s10-1.8 10-4V7" stroke="#3ECF8E" strokeWidth="2" fill="none"/>
                <path d="M4 14c0 2.2 4.5 4 10 4s10-1.8 10-4" stroke="#3ECF8E" strokeWidth="2" fill="none"/>
              </svg>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Supabase Storage</h3>
                <span style={{ fontSize: "0.8rem", color: "#666" }}>Database & File Storage</span>
              </div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>File Storage</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{formatBytes(supabaseStorage.used)} / 1 GB</span>
              </div>
              <div style={{ width: "100%", height: 10, background: "#e5e7eb", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${supabaseFilePercent}%`, height: "100%", background: supabaseFilePercent > 80 ? "#dc2626" : "#3ECF8E", borderRadius: 5, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.25rem" }}>{formatBytes(supabaseLimit - supabaseStorage.used)} remaining</div>
            </div>

            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Database</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{formatBytes(supabaseStorage.dbSize)} / 1 GB</span>
              </div>
              <div style={{ width: "100%", height: 10, background: "#e5e7eb", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ width: `${supabaseDbPercent}%`, height: "100%", background: supabaseDbPercent > 80 ? "#dc2626" : "#3ECF8E", borderRadius: 5, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.25rem" }}>{formatBytes(supabaseDbLimit - supabaseStorage.dbSize)} remaining</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3ECF8E" }}>{supabaseStorage.buckets}</div>
                <div style={{ fontSize: "0.8rem", color: "#666" }}>Buckets</div>
              </div>
              <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", textAlign: "center" }}>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3ECF8E" }}>{supabaseStorage.files}</div>
                <div style={{ fontSize: "0.8rem", color: "#666" }}>Files</div>
              </div>
            </div>
          </div>

          {/* Cloudinary Storage */}
          <div className="sap-plan-form-section">
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M6 20l4-12h8l4 12" stroke="#3448C5" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 20h20" stroke="#3448C5" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="20" cy="8" r="4" stroke="#3448C5" strokeWidth="1.5" fill="#fff"/>
                <path d="M19 8h2M20 7v2" stroke="#3448C5" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Cloudinary</h3>
                <span style={{ fontSize: "0.8rem", color: "#666" }}>Image & Media Storage</span>
              </div>
            </div>

            {cloudinaryError ? (
              <div style={{ padding: "1.5rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                <p style={{ margin: 0, fontSize: "0.85rem", color: "#dc2626" }}>{cloudinaryError}</p>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem", color: "#999" }}>Add CLOUDINARY_API_SECRET to .env.local to enable</p>
              </div>
            ) : !cloudinary ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>
                <div className="sap-loading-spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 500 }}>Storage Used</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {formatBytes(cloudinary.storage.used)} / {cloudinary.storage.limit ? formatBytes(cloudinary.storage.limit) : "25 GB (Free Tier)"}
                    </span>
                  </div>
                  <div style={{ width: "100%", height: 10, background: "#e5e7eb", borderRadius: 5, overflow: "hidden" }}>
                    <div style={{ width: `${cloudinaryPercent}%`, height: "100%", background: cloudinaryPercent > 80 ? "#dc2626" : "#3448C5", borderRadius: 5, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#999", marginTop: "0.25rem" }}>
                    {cloudinary.storage.limit
                      ? `${formatBytes(cloudinary.storage.limit - cloudinary.storage.used)} remaining`
                      : `${formatBytes(25 * 1024 * 1024 * 1024 - cloudinary.storage.used)} remaining (estimated)`}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3448C5" }}>{cloudinary.assets.count}</div>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>Assets</div>
                  </div>
                  <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3448C5" }}>{formatBytes(cloudinary.bandwidth.used)}</div>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>Bandwidth</div>
                  </div>
                  <div style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3448C5" }}>{cloudinaryPercent.toFixed(1)}%</div>
                    <div style={{ fontSize: "0.8rem", color: "#666" }}>Used</div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
