import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  getCurrentAdmin,
  logout,
} from "../api/auth";

import type {
  Admin,
} from "../api/auth";

import {
  getAdminPolls,
} from "../api/admin";

import type {
  AdminPoll,
} from "../api/admin";

export default function Dashboard() {
  const navigate =
    useNavigate();

  const [admin, setAdmin] =
    useState<Admin | null>(
      null
    );

  const [polls, setPolls] =
    useState<AdminPoll[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [
          currentAdmin,
          pollData,
        ] = await Promise.all([
          getCurrentAdmin(),
          getAdminPolls(),
        ]);

        setAdmin(currentAdmin);
        setPolls(pollData);
      } catch (error) {
        logout();

        navigate("/login");

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [navigate]);

  function handleLogout() {
    logout();

    navigate("/login");
  }

  if (loading) {
    return (
      <main>
        <p>
          Loading dashboard...
        </p>
      </main>
    );
  }

  if (!admin) {
    return null;
  }

  const activePolls =
    polls.filter(
      (poll) =>
        poll.status === "ACTIVE"
    ).length;

  const draftPolls =
    polls.filter(
      (poll) =>
        poll.status === "DRAFT"
    ).length;

  const totalResponses =
    polls.reduce(
      (total, poll) =>
        total +
        (poll._count?.responses ||
          0),
      0
    );

  return (
    <main>
      <header>
        <h1>
          Kenya Opinion Polls
        </h1>

        <p>
          Admin Dashboard
        </p>

        <p>
          Welcome,{" "}
          <strong>
            {admin.name}
          </strong>
        </p>

        <button
          onClick={
            handleLogout
          }
        >
          Logout
        </button>
      </header>

      <hr />

      {error && (
        <p>
          <strong>Error:</strong>{" "}
          {error}
        </p>
      )}

      <section>
        <h2>
          Overview
        </h2>

        <div>
          <article>
            <h3>
              Total Polls
            </h3>

            <p>
              {polls.length}
            </p>
          </article>

          <article>
            <h3>
              Active Polls
            </h3>

            <p>
              {activePolls}
            </p>
          </article>

          <article>
            <h3>
              Draft Polls
            </h3>

            <p>
              {draftPolls}
            </p>
          </article>

          <article>
            <h3>
              Total Responses
            </h3>

            <p>
              {totalResponses}
            </p>
          </article>
        </div>
      </section>

      <hr />

      <section>
        <h2>
          Poll Management
        </h2>

        <p>
          <Link to="/admin/polls">
            Manage Polls
          </Link>
        </p>

        <p>
          <Link to="/admin/polls/create">
            Create New Poll
          </Link>
        </p>

        <p>
          <Link to="/admin/candidates">
            Manage Candidates
          </Link>
        </p>
      </section>

      <hr />

      <section>
  <h2>
    Analytics & Statistics
  </h2>

  <p>
    View detailed poll responses,
    participants, geographic data,
    candidate results and statistical
    analysis.
  </p>

  <Link to="/admin/statistics">
    <button type="button">
      View Statistics
    </button>
  </Link>
</section>

      <section>
        <h2>
          Recent Polls
        </h2>

        {polls.length ===
        0 ? (
          <p>
            No polls have been
            created yet.
          </p>
        ) : (
          <ul>
            {polls
              .slice(0, 5)
              .map((poll) => (
                <li
                  key={poll.id}
                >
                  <strong>
                    {poll.title}
                  </strong>

                  {" — "}

                  {poll.status}

                  {" — "}

                  {poll._count
                    ?.responses ||
                    0}{" "}
                  responses
                </li>
              ))}
          </ul>
        )}
      </section>
    </main>
  );
}