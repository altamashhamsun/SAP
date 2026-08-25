"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Check your email for the confirmation link!");
    setLoading(false);
  };

  return (
    <div className="container">
      <nav>
        <h1>SAP</h1>
        <div>
          <Link href="/" style={{ marginRight: "1rem" }}>
            Home
          </Link>
          <Link href="/login">Login</Link>
        </div>
      </nav>

      <main>
        <h2>Sign Up</h2>
        <form onSubmit={handleSignup} className="card" style={{ maxWidth: "400px" }}>
          {error && <p className="error">{error}</p>}
          {success && <p className="success">{success}</p>}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
      </main>
    </div>
  );
}