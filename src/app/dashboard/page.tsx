"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "@supabase/supabase-js";

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="container">
      <nav>
        <h1>SAP</h1>
        <div>
          <Link href="/" style={{ marginRight: "1rem" }}>
            Home
          </Link>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </nav>

      <main>
        <h2>Dashboard</h2>
        <div className="card">
          <h3>Welcome, {user.email}</h3>
          <p>User ID: {user.id}</p>
          <p>Last Sign In: {new Date(user.last_sign_in_at!).toLocaleString()}</p>
        </div>

        <div className="card" style={{ marginTop: "2rem" }}>
          <h3>Quick Actions</h3>
          <p>Connect your Supabase database to start managing data.</p>
          <p style={{ marginTop: "1rem", color: "#666" }}>
            The Supabase MCP server is now connected. You can query your database,
            manage tables, and more through AI-assisted commands.
          </p>
        </div>
      </main>
    </div>
  );
}