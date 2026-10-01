import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getAdminPolls,
  updatePollStatus,
} from "../api/admin";

import type {
  AdminPoll,
} from "../api/admin";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./AdminPolls.css";

export default function AdminPolls() {
  const [polls, setPolls] =
    useState<AdminPoll[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [
    changingStatus,
    setChangingStatus,
  ] = useState("");

  const [
    filter,
    setFilter,
  ] = useState("ALL");

  async function loadPolls() {
    try {
      setLoading(true);
      setError("");

      const data =
        await getAdminPolls();

      setPolls(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load polls"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolls();
  }, []);

  async function changeStatus(
    pollId: string,
    status: string
  ) {
    try {
      setChangingStatus(
        pollId
      );

      const updated =
        await updatePollStatus(
          pollId,
          status
        );

      setPolls(
        (current) =>
          current.map(
            (poll) =>
              poll.id === pollId
                ? {
                    ...poll,
                    status:
                      updated.status,
                  }
                : poll
          )
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update status"
      );
    } finally {
      setChangingStatus("");
    }
  }

  const filteredPolls =
    useMemo(() => {
      if (filter === "ALL") {
        return polls;
      }

      return polls.filter(
        (poll) =>
          poll.status === filter
      );
    }, [polls, filter]);

  const counts = {
    all: polls.length,

    active: polls.filter(
      (poll) =>
        poll.status === "ACTIVE"
    ).length,

    draft: polls.filter(
      (poll) =>
        poll.status === "DRAFT"
    ).length,

    paused: polls.filter(
      (poll) =>
        poll.status === "PAUSED"
    ).length,

    closed: polls.filter(
      (poll) =>
        poll.status === "CLOSED"
    ).length,
  };

  if (loading) {
    return (
      <div className="admin-polls-loading">
        <div className="admin-polls-loading__line" />

        <p>
          Loading polls...
        </p>
      </div>
    );
  }

  return (
    <div className="admin-polls-page">

      <Navbar />

      <main className="admin-polls-main">

        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <section className="admin-polls-header">

          <div className="admin-polls-header__top">

            <Link
              to="/dashboard"
              className="admin-polls-back"
            >
              ← Dashboard
            </Link>

            <span className="admin-polls-header__label">
              SFD INSIGHTS / POLL MANAGEMENT
            </span>

          </div>


          <div className="admin-polls-header__main">

            <div>
              <h1>
                Poll Management
              </h1>

              <p>
                Create, publish and manage
                public opinion polls.
              </p>
            </div>


            <Link
              to="/admin/polls/create"
              className="admin-polls-create"
            >
              <span>
                +
              </span>

              Create New Poll
            </Link>

          </div>

        </section>


        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="admin-polls-error">

            <strong>
              Error
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              Dismiss
            </button>

          </div>
        )}


        {/* ==================================================
            SUMMARY
        ================================================== */}

        <section className="admin-polls-summary">

          <div className="admin-polls-summary__item admin-polls-summary__item--active">
            <span>
              TOTAL
            </span>

            <strong>
              {counts.all}
            </strong>
          </div>


          <div className="admin-polls-summary__item">
            <span>
              ACTIVE
            </span>

            <strong>
              {counts.active}
            </strong>
          </div>


          <div className="admin-polls-summary__item">
            <span>
              DRAFTS
            </span>

            <strong>
              {counts.draft}
            </strong>
          </div>


          <div className="admin-polls-summary__item">
            <span>
              PAUSED
            </span>

            <strong>
              {counts.paused}
            </strong>
          </div>


          <div className="admin-polls-summary__item">
            <span>
              CLOSED
            </span>

            <strong>
              {counts.closed}
            </strong>
          </div>

        </section>


        {/* ==================================================
            FILTERS
        ================================================== */}

        <section className="admin-polls-toolbar">

          <div>
            <span className="admin-polls-toolbar__label">
              SHOWING
            </span>

            <strong>
              {filteredPolls.length}{" "}
              {filteredPolls.length === 1
                ? "poll"
                : "polls"}
            </strong>
          </div>


          <div className="admin-polls-filters">

            {[
              ["ALL", "All polls"],
              ["ACTIVE", "Active"],
              ["DRAFT", "Drafts"],
              ["PAUSED", "Paused"],
              ["CLOSED", "Closed"],
            ].map(
              ([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    filter === value
                      ? "admin-polls-filter admin-polls-filter--active"
                      : "admin-polls-filter"
                  }
                  onClick={() =>
                    setFilter(value)
                  }
                >
                  {label}
                </button>
              )
            )}

          </div>

        </section>


        {/* ==================================================
            POLLS
        ================================================== */}

        {polls.length === 0 ? (

          <section className="admin-polls-empty">

            <span>
              NO POLLS
            </span>

            <h2>
              No polls yet
            </h2>

            <p>
              Create your first poll to
              make it available to the public.
            </p>

            <Link
              to="/admin/polls/create"
              className="admin-polls-empty__button"
            >
              Create Poll
              <span>→</span>
            </Link>

          </section>

        ) : filteredPolls.length === 0 ? (

          <section className="admin-polls-empty">

            <span>
              NO MATCHES
            </span>

            <h2>
              No polls in this category
            </h2>

            <p>
              There are currently no polls
              matching the selected status.
            </p>

            <button
              type="button"
              className="admin-polls-empty__button"
              onClick={() =>
                setFilter("ALL")
              }
            >
              Show All Polls
              <span>→</span>
            </button>

          </section>

        ) : (

          <section className="admin-polls-list">

            <div className="admin-polls-list__heading">

              <span>
                POLL
              </span>

              <span>
                DETAILS
              </span>

              <span>
                STATUS
              </span>

              <span>
                ACTIONS
              </span>

            </div>


            {filteredPolls.map(
              (poll, index) => (

                <article
                  key={poll.id}
                  className="admin-poll-row"
                >

                  {/* NUMBER */}

                  <div className="admin-poll-row__number">
                    {String(
                      index + 1
                    ).padStart(2, "0")}
                  </div>


                  {/* MAIN */}

                  <div className="admin-poll-row__main">

                    <div className="admin-poll-row__title-wrap">

                      <h2>
                        {poll.title}
                      </h2>

                      <span
                        className={`admin-poll-status admin-poll-status--${poll.status.toLowerCase()}`}
                      >
                        {poll.status}
                      </span>

                    </div>


                    {poll.description && (
                      <p>
                        {poll.description}
                      </p>
                    )}


                    <div className="admin-poll-row__meta">

                      <span>
                        <strong>
                          Position
                        </strong>

                        {poll.position?.name ||
                          "General"}
                      </span>

                      <span>
                        <strong>
                          Questions
                        </strong>

                        {poll.questions.length}
                      </span>

                      <span>
                        <strong>
                          Responses
                        </strong>

                        {(
                          poll._count
                            ?.responses || 0
                        ).toLocaleString()}
                      </span>

                      <span>
                        <strong>
                          Public
                        </strong>

                        {poll.isPublic
                          ? "Yes"
                          : "No"}
                      </span>

                    </div>

                  </div>


                  {/* STATUS */}

                  <div className="admin-poll-row__status">

                    <span
                      className={`admin-poll-status admin-poll-status--${poll.status.toLowerCase()}`}
                    >
                      {poll.status}
                    </span>

                    {poll.status ===
                      "ACTIVE" && (
                      <small>
                        Accepting responses
                      </small>
                    )}

                    {poll.status ===
                      "DRAFT" && (
                      <small>
                        Not published
                      </small>
                    )}

                    {poll.status ===
                      "PAUSED" && (
                      <small>
                        Temporarily paused
                      </small>
                    )}

                    {poll.status ===
                      "CLOSED" && (
                      <small>
                        No longer accepting
                      </small>
                    )}

                    {poll.status ===
                      "ARCHIVED" && (
                      <small>
                        Archived
                      </small>
                    )}

                  </div>


                  {/* ACTIONS */}

                  <div className="admin-poll-row__actions">

                    <Link
                      to={`/admin/polls/${poll.id}`}
                      className="admin-poll-manage"
                    >
                      Manage
                      <span>
                        →
                      </span>
                    </Link>


                    <div className="admin-poll-status-actions">

                      {poll.status ===
                        "DRAFT" && (
                        <button
                          type="button"
                          disabled={
                            changingStatus ===
                            poll.id
                          }
                          onClick={() =>
                            changeStatus(
                              poll.id,
                              "ACTIVE"
                            )
                          }
                        >
                          {changingStatus ===
                          poll.id
                            ? "Updating..."
                            : "Publish"}
                        </button>
                      )}


                      {poll.status ===
                        "ACTIVE" && (
                        <button
                          type="button"
                          disabled={
                            changingStatus ===
                            poll.id
                          }
                          onClick={() =>
                            changeStatus(
                              poll.id,
                              "PAUSED"
                            )
                          }
                        >
                          {changingStatus ===
                          poll.id
                            ? "Updating..."
                            : "Pause"}
                        </button>
                      )}


                      {poll.status ===
                        "PAUSED" && (
                        <button
                          type="button"
                          disabled={
                            changingStatus ===
                            poll.id
                          }
                          onClick={() =>
                            changeStatus(
                              poll.id,
                              "ACTIVE"
                            )
                          }
                        >
                          {changingStatus ===
                          poll.id
                            ? "Updating..."
                            : "Resume"}
                        </button>
                      )}


                      {(poll.status ===
                        "ACTIVE" ||
                        poll.status ===
                          "PAUSED") && (
                        <button
                          type="button"
                          className="admin-poll-action--danger"
                          disabled={
                            changingStatus ===
                            poll.id
                          }
                          onClick={() =>
                            changeStatus(
                              poll.id,
                              "CLOSED"
                            )
                          }
                        >
                          {changingStatus ===
                          poll.id
                            ? "Updating..."
                            : "Close"}
                        </button>
                      )}


                      {poll.status ===
                        "CLOSED" && (
                        <button
                          type="button"
                          disabled={
                            changingStatus ===
                            poll.id
                          }
                          onClick={() =>
                            changeStatus(
                              poll.id,
                              "ARCHIVED"
                            )
                          }
                        >
                          {changingStatus ===
                          poll.id
                            ? "Updating..."
                            : "Archive"}
                        </button>
                      )}

                    </div>

                  </div>

                </article>

              )
            )}

          </section>

        )}

      </main>

      <Footer />

    </div>
  );
}