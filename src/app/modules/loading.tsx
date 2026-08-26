export default function ModuleLoading() {
  return (
    <div className="sap-dashboard" style={{ minHeight: "100vh" }}>
      <div className="sap-top-bar" style={{ justifyContent: "space-between" }}>
        <div className="sap-top-bar-left">
          <svg className="sap-logo" viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg">
            <rect x="0" y="5" width="30" height="30" rx="4" fill="#fff" />
            <text x="8" y="27" fontFamily="Arial, sans-serif" fontSize="18" fontWeight="bold" fill="#0070f3">Q</text>
            <text x="40" y="28" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="bold" fill="#fff">QAC</text>
          </svg>
        </div>
      </div>
      <div className="sap-module-header">
        <div style={{ width: 140, height: 16, borderRadius: 4, background: "#e5e5e5" }} />
        <div style={{ width: 280, height: 24, borderRadius: 4, background: "#e5e5e5", marginTop: 8 }} />
      </div>
      <div className="sap-dashboard-content">
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ width: 120, height: 60, borderRadius: 8, background: "#f0f0f0", animation: "sap-pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: 120, height: 60, borderRadius: 8, background: "#f0f0f0", animation: "sap-pulse 1.5s ease-in-out infinite 0.2s" }} />
          <div style={{ width: 120, height: 60, borderRadius: 8, background: "#f0f0f0", animation: "sap-pulse 1.5s ease-in-out infinite 0.4s" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: "1rem", borderRadius: 8, border: "1px solid #e5e5e5", background: "#fff", animation: "sap-pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.15}s` }}>
              <div style={{ width: "60%", height: 14, borderRadius: 4, background: "#e5e5e5", marginBottom: 8 }} />
              <div style={{ width: "40%", height: 12, borderRadius: 4, background: "#f0f0f0" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
