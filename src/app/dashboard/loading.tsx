export default function DashboardLoading() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a2540", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "0 2rem", height: 56, display: "flex", alignItems: "center", background: "rgba(0,0,0,0.2)" }}>
        <svg viewBox="0 0 200 40" style={{ height: 32 }} xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="5" width="30" height="30" rx="4" fill="#fff" />
          <text x="8" y="27" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#0070f3">Q</text>
          <text x="40" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#fff">QAC</text>
        </svg>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2rem", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 200, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.15)", margin: "0 auto 8px", animation: "sap-pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: 140, height: 14, borderRadius: 4, background: "rgba(255,255,255,0.1)", margin: "0 auto", animation: "sap-pulse 1.5s ease-in-out infinite 0.2s" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", maxWidth: 600, width: "100%" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 120, borderRadius: 10, background: "rgba(255,255,255,0.08)", animation: "sap-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
