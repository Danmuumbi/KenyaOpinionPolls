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

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();

  const [admin, setAdmin] =
    useState<Admin | null>(null);

  const [polls, setPolls] =
    useState<AdminPoll[]>([]);

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
      <div className="dashboard-loading">
        <div className="dashboard-loading__line" />
        <p>Loading dashboard...</p>
      </div>
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
        (poll._count?.responses || 0),
      0
    );

  const recentPolls =
    polls.slice(0, 5);

  return (
    <div className="dashboard-page">
      <Navbar />

      <main className="dashboard-main">

        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <section className="dashboard-intro">
          <div>
            <div className="dashboard-kicker">
              SFD INSIGHTS / ADMIN
            </div>

            <h1>
              Dashboard
            </h1>

            <p>
              Manage polls, monitor activity,
              and access your platform statistics.
            </p>
          </div>

          <div className="dashboard-intro__right">
            <div className="dashboard-user">
              <span className="dashboard-user__label">
                Signed in as
              </span>

              <strong>
                {admin.name}
              </strong>
            </div>

            <button
              type="button"
              className="dashboard-logout"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </section>


        {/* =====================================================
            ERROR
        ===================================================== */}

        {error && (
          <div className="dashboard-error">
            <strong>
              Error
            </strong>

            <span>
              {error}
            </span>
          </div>
        )}


        {/* =====================================================
            OVERVIEW
        ===================================================== */}

        <section className="dashboard-section">

          <div className="dashboard-section__heading">
            <div>
              <span className="dashboard-section__number">
                01
              </span>

              <div>
                <h2>
                  Overview
                </h2>

                <p>
                  Current polling activity across the platform.
                </p>
              </div>
            </div>
          </div>


          <div className="dashboard-stats">

            <article className="dashboard-stat dashboard-stat--primary">
              <div className="dashboard-stat__top">
                <span>
                  TOTAL POLLS
                </span>

                <span className="dashboard-stat__index">
                  01
                </span>
              </div>

              <strong>
                {polls.length}
              </strong>

              <p>
                Polls currently managed by the platform.
              </p>
            </article>


            <article className="dashboard-stat">
              <div className="dashboard-stat__top">
                <span>
                  ACTIVE
                </span>

                <span className="dashboard-stat__index">
                  02
                </span>
              </div>

              <strong>
                {activePolls}
              </strong>

              <p>
                Polls currently accepting responses.
              </p>
            </article>


            <article className="dashboard-stat">
              <div className="dashboard-stat__top">
                <span>
                  DRAFTS
                </span>

                <span className="dashboard-stat__index">
                  03
                </span>
              </div>

              <strong>
                {draftPolls}
              </strong>

              <p>
                Polls still being prepared.
              </p>
            </article>


            <article className="dashboard-stat dashboard-stat--responses">
              <div className="dashboard-stat__top">
                <span>
                  RESPONSES
                </span>

                <span className="dashboard-stat__index">
                  04
                </span>
              </div>

              <strong>
                {totalResponses.toLocaleString()}
              </strong>

              <p>
                Responses recorded across polls.
              </p>
            </article>

          </div>
        </section>


        {/* =====================================================
            MANAGEMENT
        ===================================================== */}

        <section className="dashboard-section">

          <div className="dashboard-section__heading">
            <div>
              <span className="dashboard-section__number">
                02
              </span>

              <div>
                <h2>
                  Poll management
                </h2>

                <p>
                  Create, organise and maintain your polling content.
                </p>
              </div>
            </div>
          </div>


          <div className="dashboard-management">

            <Link
              to="/admin/polls"
              className="dashboard-action"
            >
              <span className="dashboard-action__number">
                01
              </span>

              <span className="dashboard-action__content">
                <strong>
                  Manage Polls
                </strong>

                <small>
                  View and manage existing polls
                </small>
              </span>

              <span className="dashboard-action__arrow">
                →
              </span>
            </Link>


            <Link
              to="/admin/polls/create"
              className="dashboard-action dashboard-action--featured"
            >
              <span className="dashboard-action__number">
                02
              </span>

              <span className="dashboard-action__content">
                <strong>
                  Create New Poll
                </strong>

                <small>
                  Start a new public opinion poll
                </small>
              </span>

              <span className="dashboard-action__arrow">
                →
              </span>
            </Link>


            <Link
              to="/admin/candidates"
              className="dashboard-action"
            >
              <span className="dashboard-action__number">
                03
              </span>

              <span className="dashboard-action__content">
                <strong>
                  Manage Candidates
                </strong>

                <small>
                  Maintain candidate information
                </small>
              </span>

              <span className="dashboard-action__arrow">
                →
              </span>
            </Link>


            <Link
              to="/admin/featured-polls"
              className="dashboard-action"
            >
              <span className="dashboard-action__number">
                04
              </span>

              <span className="dashboard-action__content">
                <strong>
                  Featured Polls
                </strong>

                <small>
                  Control polls highlighted publicly
                </small>
              </span>

              <span className="dashboard-action__arrow">
                →
              </span>
            </Link>

          </div>
        </section>


        {/* =====================================================
            ANALYTICS
        ===================================================== */}

        <section className="dashboard-analytics">

          <div className="dashboard-analytics__copy">

            <span className="dashboard-analytics__label">
              DATA &amp; ANALYSIS
            </span>

            <h2>
              Analytics &amp;
              <br />
              Statistics
            </h2>

            <p>
              Review detailed poll responses,
              participant information, geographic
              data, candidate results and statistical
              analysis.
            </p>

            <Link
              to="/admin/statistics"
              className="dashboard-analytics__button"
            >
              View Statistics
              <span>→</span>
            </Link>

          </div>


          <div className="dashboard-analytics__visual">

            <div className="dashboard-analytics__grid" />

            <div className="dashboard-analytics__bars">

              <span style={{ height: "38%" }} />
              <span style={{ height: "56%" }} />
              <span style={{ height: "46%" }} />
              <span style={{ height: "72%" }} />
              <span style={{ height: "64%" }} />
              <span style={{ height: "86%" }} />

            </div>

            <div className="dashboard-analytics__caption">
              POLL DATA
            </div>

          </div>

        </section>


        {/* =====================================================
            RECENT POLLS
        ===================================================== */}

        <section className="dashboard-section dashboard-recent">

          <div className="dashboard-section__heading">
            <div>
              <span className="dashboard-section__number">
                03
              </span>

              <div>
                <h2>
                  Recent polls
                </h2>

                <p>
                  The latest polls available in the admin system.
                </p>
              </div>
            </div>

            <Link
              to="/admin/polls"
              className="dashboard-section__link"
            >
              View all polls →
            </Link>
          </div>


          {recentPolls.length === 0 ? (

            <div className="dashboard-empty">
              <span>
                NO POLLS
              </span>

              <h3>
                No polls have been created yet.
              </h3>

              <p>
                Create your first poll to begin collecting responses.
              </p>

              <Link
                to="/admin/polls/create"
                className="dashboard-empty__button"
              >
                Create a poll →
              </Link>
            </div>

          ) : (

            <div className="dashboard-poll-list">

              {recentPolls.map((poll, index) => (

                <article
                  className="dashboard-poll"
                  key={poll.id}
                >

                  <span className="dashboard-poll__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>


                  <div className="dashboard-poll__main">

                    <h3>
                      {poll.title}
                    </h3>

                    <span>
                      {poll._count?.responses || 0}{" "}
                      responses
                    </span>

                  </div>


                  <span
                    className={`dashboard-status dashboard-status--${poll.status.toLowerCase()}`}
                  >
                    {poll.status}
                  </span>


                  <Link
                    to={`/admin/polls`}
                    className="dashboard-poll__arrow"
                    aria-label={`Manage ${poll.title}`}
                  >
                    →
                  </Link>

                </article>

              ))}

            </div>

          )}

        </section>

      </main>

      <Footer />
    </div>
  );
}