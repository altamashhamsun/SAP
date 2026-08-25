import Link from "next/link";

export default function AuthCodeError() {
  return (
    <div className="container">
      <nav>
        <h1>SAP</h1>
        <div>
          <Link href="/">Home</Link>
        </div>
      </nav>

      <main>
        <h2>Authentication Error</h2>
        <div className="card">
          <p>There was an error confirming your email address.</p>
          <p style={{ marginTop: "1rem" }}>
            Please try signing up again or contact support if the problem persists.
          </p>
          <Link href="/signup">
            <button className="btn" style={{ marginTop: "1rem" }}>
              Try Again
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}