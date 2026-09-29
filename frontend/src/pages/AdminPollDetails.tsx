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

export default function AdminPollDetails() {
  const { pollId } =
    useParams();

  const [poll, setPoll] =
    useState<AdminPoll | null>(
      null
    );

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

      const data =
        await getAdminPoll(
          pollId
        );

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
      setChangingStatus(
        true
      );

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
      setChangingStatus(
        false
      );
    }
  }

  if (loading) {
    return (
      <main>
        <p>
          Loading poll...
        </p>
      </main>
    );
  }

  if (!poll) {
    return (
      <main>
        <h1>
          Poll not found
        </h1>

        <p>{error}</p>

        <Link to="/admin/polls">
          Back to polls
        </Link>
      </main>
    );
  }

  return (
    <main>
      <Link to="/admin/polls">
        ← Poll Management
      </Link>

      <h1>
        {poll.title}
      </h1>

      {error && (
        <p>
          <strong>Error:</strong>{" "}
          {error}
        </p>
      )}

      <p>
        <strong>Status:</strong>{" "}
        {poll.status}
      </p>

      <p>
        <strong>Position:</strong>{" "}
        {poll.position?.name ||
          "General"}
      </p>

      <p>
        <strong>Responses:</strong>{" "}
        {poll._count
          ?.responses || 0}
      </p>

      <p>
        <strong>Public:</strong>{" "}
        {poll.isPublic
          ? "Yes"
          : "No"}
      </p>

      <p>
        <strong>Public Results:</strong>{" "}
        {poll.allowResults
          ? "Yes"
          : "No"}
      </p>

      <hr />

      <section>
        <h2>
          Poll Controls
        </h2>

        {poll.status ===
          "DRAFT" && (
          <button
            disabled={
              changingStatus
            }
            onClick={() =>
              changeStatus(
                "ACTIVE"
              )
            }
          >
            Publish Poll
          </button>
        )}

        {poll.status ===
          "ACTIVE" && (
          <>
            <button
              disabled={
                changingStatus
              }
              onClick={() =>
                changeStatus(
                  "PAUSED"
                )
              }
            >
              Pause Poll
            </button>

            {" "}

            <button
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
              disabled={
                changingStatus
              }
              onClick={() =>
                changeStatus(
                  "ACTIVE"
                )
              }
            >
              Resume Poll
            </button>

            {" "}

            <button
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
            disabled={
              changingStatus
            }
            onClick={() =>
              changeStatus(
                "ARCHIVED"
              )
            }
          >
            Archive Poll
          </button>
        )}
      </section>

      <hr />

      <section>
        <h2>
          Questions
        </h2>

        {poll.questions.map(
          (
            question,
            index
          ) => (
            <article
              key={
                question.id
              }
              style={{
                border:
                  "1px solid #ddd",
                padding:
                  "20px",
                marginBottom:
                  "20px",
              }}
            >
              <h3>
                {index + 1}.{" "}
                {
                  question.question
                }
              </h3>

              {question.description && (
                <p>
                  {
                    question.description
                  }
                </p>
              )}

              <p>
                Required:{" "}
                {question.isRequired
                  ? "Yes"
                  : "No"}
              </p>

              <ul>
                {question.options.map(
                  (
                    option
                  ) => (
                    <li
                      key={
                        option.id
                      }
                    >
                      {
                        option.label
                      }

                      {option
                        .candidate && (
                        <>
                          {" "}
                          —{" "}
                          {
                            option
                              .candidate
                              .name
                          }
                        </>
                      )}
                    </li>
                  )
                )}
              </ul>
            </article>
          )
        )}
      </section>

      {poll.status ===
        "ACTIVE" && (
        <p>
          <strong>
            This poll is currently
            visible to the public.
          </strong>
        </p>
      )}
    </main>
  );
}