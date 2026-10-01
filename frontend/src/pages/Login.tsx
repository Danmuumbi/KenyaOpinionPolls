// import { FormEvent, useState } from "react";

import { useState } from "react";
import type { FormEvent } from "react"; 
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await login(email, password);

      if (!response.data) {
        throw new Error("Invalid login response");
      }

      localStorage.setItem("token", response.data.token);

      localStorage.setItem(
        "admin",
        JSON.stringify(response.data.admin)
      );

      navigate("/dashboard");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-shell">

        <section className="login-intro">
          <div className="login-brand">
            <div className="login-brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>

            <div>
              <strong>SFD</strong>
              <span>INSIGHTS</span>
            </div>
          </div>

          <div className="login-intro-content">
            <p className="login-eyebrow">
              ADMINISTRATION
            </p>

            <h1>
              Understand the
              <br />
              public voice.
            </h1>

            <p className="login-description">
              Manage polls, responses, candidates and
              public insight from one central workspace.
            </p>
          </div>

          <div className="login-intro-footer">
            <span className="login-status-dot" />
            <span>Independent polling platform</span>
          </div>
        </section>

        <section className="login-panel">
          <div className="login-panel-inner">

            <div className="login-heading">
              <p className="login-panel-label">
                SECURE ACCESS
              </p>

              <h2>Admin Login</h2>

              <p>
                Sign in to continue to the SFD Insights
                administration workspace.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={handleSubmit}
            >
              <div className="login-field">
                <label htmlFor="email">
                  Email address
                </label>

                <div className="login-input-wrap">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 6.5h16v11H4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="m5 7.5 7 5 7-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                  </svg>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="login-field">
                <label htmlFor="password">
                  Password
                </label>

                <div className="login-input-wrap">
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <rect
                      x="5"
                      y="10"
                      width="14"
                      height="10"
                      rx="2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <path
                      d="M8 10V7.5a4 4 0 0 1 8 0V10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />

                    <circle
                      cx="12"
                      cy="15"
                      r="1"
                      fill="currentColor"
                    />
                  </svg>

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div
                  className="login-error"
                  role="alert"
                >
                  <span className="login-error-icon">
                    !
                  </span>

                  <div>
                    <strong>Unable to sign in</strong>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                <span>
                  {loading
                    ? "Signing in..."
                    : "Sign in to dashboard"}
                </span>

                {!loading && (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M5 12h13M13 6l6 6-6 6"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            </form>

            <div className="login-security">
              <div className="login-security-icon">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M12 3 19 6v5c0 4.6-2.8 7.9-7 10-4.2-2.1-7-5.4-7-10V6l7-3Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />

                  <path
                    d="m9 12 2 2 4-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <div>
                <strong>Protected workspace</strong>
                <span>
                  Administrative access is restricted to
                  authorised users.
                </span>
              </div>
            </div>

            <div className="login-panel-footer">
              <span>SFD INSIGHTS</span>
              <span>KENYA</span>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}