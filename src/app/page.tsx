import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="container">
      <nav>
        <h1>SAP</h1>
        <div>
          {user ? (
            <>
              <span style={{ marginRight: "1rem" }}>{user.email}</span>
              <Link href="/dashboard">Dashboard</Link>
            </>
          ) : (
            <>
              <Link href="/login" style={{ marginRight: "1rem" }}>
                Login
              </Link>
              <Link href="/signup">Sign Up</Link>
            </>
          )}
        </div>
      </nav>

      <main>
        <h2>Welcome to SAP</h2>
        <p>A full stack application built with Next.js and Supabase.</p>

        {user ? (
          <div className="card" style={{ marginTop: "2rem" }}>
            <h3>You are logged in!</h3>
            <p>Email: {user.email}</p>
            <Link href="/dashboard">
              <button className="btn" style={{ marginTop: "1rem" }}>
                Go to Dashboard
              </button>
            </Link>
          </div>
        ) : (
          <div className="card" style={{ marginTop: "2rem" }}>
            <h3>Get Started</h3>
            <p>Sign up or login to access your dashboard.</p>
            <Link href="/signup">
              <button className="btn" style={{ marginTop: "1rem" }}>
                Get Started
              </button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}