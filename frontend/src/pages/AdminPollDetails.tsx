import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getAdminPoll,
  updatePollStatus,
} from "../api/admin";

import type {
  AdminPoll,
} from "../api/admin";

import "./AdminPollDetails.css";

export default function AdminPollDetails() {
  const { pollId } = useParams();

  const [poll, setPoll] =
    useState<AdminPoll | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [changingStatus, setChangingStatus] =
    useState(false);

  async function loadPoll() {
    if (!pollId) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data =
        await getAdminPoll(pollId);

      setPoll(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load poll"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPoll();
  }, [pollId]);

  async function changeStatus(
    status: string
  ) {
    if (!pollId) {
      return;
    }

    try {
      setChangingStatus(true);
      setError("");

      const updated =
        await updatePollStatus(
          pollId,
          status
        );

      setPoll(
        (current) =>
          current
            ? {
                ...current,
                status:
                  updated.status,
              }
            : current
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update status"
      );
    } finally {
      setChangingStatus(false);
    }
  }

  if (loading) {
    return (
      <main className="admin-poll-page">
        <div className="admin-poll-loading">
          <div className="admin-poll-spinner" />
          <p>Loading poll...</p>
        </div>
      </main>
    );
  }

  if (!poll) {
    return (
      <main className="admin-poll-page">
        <div className="admin-poll-not-found">
          <span className="admin-poll-not-found__eyebrow">
            POLL MANAGEMENT
          </span>

          <h1>Poll not found</h1>

          <p>
            {error ||
              "The requested poll could not be found."}
          </p>

          <Link
            to="/admin/polls"
            className="admin-poll-back-button"
          >
            ← Back to polls
          </Link>
        </div>
      </main>
    );
  }

  const responseCount =
    poll._count?.responses || 0;

  const statusClass =
    poll.status.toLowerCase();

  return (
    <main className="admin-poll-page">
      <div className="admin-poll-container">

        {/* Header */}
        <header className="admin-poll-header">
          <div>
            <Link
              to="/admin/polls"
              className="admin-poll-back"
            >
              ← Poll Management
            </Link>

            

            <div className="admin-poll-eyebrow">
              POLL DETAILS
            </div>

            <h1>{poll.title}</h1>

            {poll.description && (
              <p className="admin-poll-description">
                {poll.description}
              </p>
            )}
          </div>

          <span
            className={`admin-poll-status admin-poll-status--${statusClass}`}
          >
            <span className="admin-poll-status-dot" />
            {poll.status}
          </span>

                <Link
  to={`/admin/polls/${poll.id}/edit`}
>
  Edit Poll
</Link>
        </header>

        {/* Error */}
        {error && (
          <div className="admin-poll-alert">
            <strong>Something went wrong</strong>
            <span>{error}</span>
          </div>
        )}

        {/* Overview */}
        <section className="admin-poll-overview">
          <div className="admin-poll-stat">
            <span className="admin-poll-stat__label">
              Responses
            </span>

            <strong className="admin-poll-stat__value">
              {responseCount.toLocaleString()}
            </strong>

            <span className="admin-poll-stat__meta">
              Recorded responses
            </span>
          </div>

          <div className="admin-poll-stat">
            <span className="admin-poll-stat__label">
              Position
            </span>

            <strong className="admin-poll-stat__value admin-poll-stat__value--text">
              {poll.position?.name ||
                "General opinion"}
            </strong>

            <span className="admin-poll-stat__meta">
              Poll category
            </span>
          </div>

          <div className="admin-poll-stat">
            <span className="admin-poll-stat__label">
              Public access
            </span>

            <strong className="admin-poll-stat__value admin-poll-stat__value--text">
              {poll.isPublic
                ? "Visible"
                : "Hidden"}
            </strong>

            <span className="admin-poll-stat__meta">
              Current visibility
            </span>
          </div>

          <div className="admin-poll-stat">
            <span className="admin-poll-stat__label">
              Results
            </span>

            <strong className="admin-poll-stat__value admin-poll-stat__value--text">
              {poll.allowResults
                ? "Public"
                : "Private"}
            </strong>

            <span className="admin-poll-stat__meta">
              Result visibility
            </span>
          </div>
        </section>

        <div className="admin-poll-layout">

          {/* Main content */}
          <div className="admin-poll-main">

            {/* Poll controls */}
            <section className="admin-poll-section admin-poll-controls">
              <div className="admin-poll-section-header">
                <div>
                  <span className="admin-poll-section-number">
                    01
                  </span>

                  <div>
                    <h2>Poll controls</h2>
                    <p>
                      Manage the current lifecycle of this poll.
                    </p>
                  </div>
                </div>
              </div>

              <div className="admin-poll-control-body">
                <div className="admin-poll-control-status">
                  <span>
                    Current status
                  </span>

                  <strong>
                    {poll.status}
                  </strong>
                </div>

                <div className="admin-poll-actions">
                  {poll.status ===
                    "DRAFT" && (
                    <button
                      type="button"
                      className="admin-poll-button admin-poll-button--primary"
                      disabled={
                        changingStatus
                      }
                      onClick={() =>
                        changeStatus(
                          "ACTIVE"
                        )
                      }
                    >
                      {changingStatus
                        ? "Updating..."
                        : "Publish Poll"}
                    </button>
                  )}

                  {poll.status ===
                    "ACTIVE" && (
                    <>
                      <button
                        type="button"
                        className="admin-poll-button admin-poll-button--secondary"
                        disabled={
                          changingStatus
                        }
                        onClick={() =>
                          changeStatus(
                            "PAUSED"
                          )
                        }
                      >
                        {changingStatus
                          ? "Updating..."
                          : "Pause Poll"}
                      </button>

                      <button
                        type="button"
                        className="admin-poll-button admin-poll-button--danger"
                        disabled={
                          changingStatus
                        }
                        onClick={() =>
                          changeStatus(
                            "CLOSED"
                          )
                        }
                      >
                        Close Poll
                      </button>
                    </>
                  )}

                  {poll.status ===
                    "PAUSED" && (
                    <>
                      <button
                        type="button"
                        className="admin-poll-button admin-poll-button--primary"
                        disabled={
                          changingStatus
                        }
                        onClick={() =>
                          changeStatus(
                            "ACTIVE"
                          )
                        }
                      >
                        {changingStatus
                          ? "Updating..."
                          : "Resume Poll"}
                      </button>

                      <button
                        type="button"
                        className="admin-poll-button admin-poll-button--danger"
                        disabled={
                          changingStatus
                        }
                        onClick={() =>
                          changeStatus(
                            "CLOSED"
                          )
                        }
                      >
                        Close Poll
                      </button>
                    </>
                  )}

                  {poll.status ===
                    "CLOSED" && (
                    <button
                      type="button"
                      className="admin-poll-button admin-poll-button--secondary"
                      disabled={
                        changingStatus
                      }
                      onClick={() =>
                        changeStatus(
                          "ARCHIVED"
                        )
                      }
                    >
                      {changingStatus
                        ? "Updating..."
                        : "Archive Poll"}
                    </button>
                  )}

                  {poll.status ===
                    "ARCHIVED" && (
                    <span className="admin-poll-final-state">
                      This poll has been archived.
                    </span>
                  )}
                </div>
              </div>

              {poll.status ===
                "ACTIVE" && (
                <div className="admin-poll-live-note">
                  <span className="admin-poll-live-dot" />

                  <div>
                    <strong>
                      This poll is currently live
                    </strong>

                    <p>
                      The poll is currently visible
                      to the public and can receive
                      responses.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Questions */}
            <section className="admin-poll-section">
              <div className="admin-poll-section-header">
                <div>
                  <span className="admin-poll-section-number">
                    02
                  </span>

                  <div>
                    <h2>Questions</h2>
                    <p>
                      Questions and response options
                      configured for this poll.
                    </p>
                  </div>
                </div>

                <span className="admin-poll-question-count">
                  {poll.questions.length}{" "}
                  {poll.questions.length === 1
                    ? "question"
                    : "questions"}
                </span>
              </div>

              <div className="admin-poll-questions">
                {poll.questions.map(
                  (question, index) => (
                    <article
                      key={question.id}
                      className="admin-poll-question"
                    >
                      <div className="admin-poll-question-top">
                        <span className="admin-poll-question-number">
                          {String(
                            index + 1
                          ).padStart(2, "0")}
                        </span>

                        <div className="admin-poll-question-heading">
                          <span>
                            QUESTION{" "}
                            {index + 1}
                          </span>

                          <h3>
                            {question.question}
                          </h3>
                        </div>

                        <span
                          className={
                            question.isRequired
                              ? "admin-poll-required"
                              : "admin-poll-optional"
                          }
                        >
                          {question.isRequired
                            ? "Required"
                            : "Optional"}
                        </span>
                      </div>

                      {question.description && (
                        <p className="admin-poll-question-description">
                          {
                            question.description
                          }
                        </p>
                      )}

                      <div className="admin-poll-options">
                        <div className="admin-poll-options-label">
                          Response options
                        </div>

                        {question.options.map(
                          (
                            option,
                            optionIndex
                          ) => (
                            <div
                              key={
                                option.id
                              }
                              className="admin-poll-option"
                            >
                              <span className="admin-poll-option-index">
                                {String(
                                  optionIndex +
                                    1
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </span>

                              <div className="admin-poll-option-content">
                                <strong>
                                  {
                                    option.label
                                  }
                                </strong>

                                {option
                                  .candidate && (
                                  <span>
                                    Candidate:{" "}
                                    {
                                      option
                                        .candidate
                                        .name
                                    }
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <aside className="admin-poll-sidebar">

            <section className="admin-poll-side-card">
              <div className="admin-poll-side-card__header">
                <span>Poll information</span>
              </div>

              <div className="admin-poll-detail-list">
                <div className="admin-poll-detail-row">
                  <span>Position</span>
                  <strong>
                    {poll.position?.name ||
                      "General"}
                  </strong>
                </div>

                <div className="admin-poll-detail-row">
                  <span>Status</span>
                  <strong>
                    {poll.status}
                  </strong>
                </div>

                <div className="admin-poll-detail-row">
                  <span>Public</span>
                  <strong>
                    {poll.isPublic
                      ? "Yes"
                      : "No"}
                  </strong>
                </div>

                <div className="admin-poll-detail-row">
                  <span>Results visible</span>
                  <strong>
                    {poll.allowResults
                      ? "Yes"
                      : "No"}
                  </strong>
                </div>

                <div className="admin-poll-detail-row">
                  <span>Questions</span>
                  <strong>
                    {poll.questions.length}
                  </strong>
                </div>

                <div className="admin-poll-detail-row">
                  <span>Responses</span>
                  <strong>
                    {responseCount.toLocaleString()}
                  </strong>
                </div>
              </div>
            </section>

            <section className="admin-poll-side-card">
              <div className="admin-poll-side-card__header">
                <span>Visibility</span>
              </div>

              <div className="admin-poll-visibility">
                <div
                  className={
                    poll.isPublic
                      ? "admin-poll-visibility-icon admin-poll-visibility-icon--on"
                      : "admin-poll-visibility-icon"
                  }
                >
                  {poll.isPublic
                    ? "✓"
                    : "—"}
                </div>

                <div>
                  <strong>
                    {poll.isPublic
                      ? "Public poll"
                      : "Private poll"}
                  </strong>

                  <p>
                    {poll.isPublic
                      ? "This poll is configured to appear on the public platform."
                      : "This poll is currently hidden from the public platform."}
                  </p>
                </div>
              </div>

              <div className="admin-poll-visibility">
                <div
                  className={
                    poll.allowResults
                      ? "admin-poll-visibility-icon admin-poll-visibility-icon--on"
                      : "admin-poll-visibility-icon"
                  }
                >
                  {poll.allowResults
                    ? "✓"
                    : "—"}
                </div>

                <div>
                  <strong>
                    {poll.allowResults
                      ? "Public results"
                      : "Private results"}
                  </strong>

                  <p>
                    {poll.allowResults
                      ? "Participants can view the published results."
                      : "Results are not exposed publicly."}
                  </p>
                </div>
              </div>
            </section>

            <section className="admin-poll-side-card admin-poll-side-card--note">
              <span className="admin-poll-note-label">
                ADMIN NOTE
              </span>

              <p>
                Status changes affect how the poll
                is presented and whether it can
                receive public responses.
              </p>
            </section>

          </aside>
        </div>
      </div>
    </main>
  );
}