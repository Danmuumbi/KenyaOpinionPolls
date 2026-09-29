import {
  useEffect,
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

  if (loading) {
    return (
      <main>
        <p>
          Loading polls...
        </p>
      </main>
    );
  }

  return (
    <main>
      <Link to="/dashboard">
        ← Dashboard
      </Link>

      <h1>
        Poll Management
      </h1>

      <p>
        Create, publish and manage
        public opinion polls.
      </p>

      <p>
        <Link to="/admin/polls/create">
          + Create New Poll
        </Link>
      </p>

      {error && (
        <p>
          <strong>Error:</strong>{" "}
          {error}
        </p>
      )}

      {polls.length ===
      0 ? (
        <section>
          <h2>
            No polls yet
          </h2>

          <p>
            Create your first poll
            to make it available
            to the public.
          </p>

          <Link to="/admin/polls/create">
            Create Poll
          </Link>
        </section>
      ) : (
        <section>
          {polls.map(
            (poll) => (
              <article
                key={poll.id}
                style={{
                  border:
                    "1px solid #ddd",
                  padding:
                    "20px",
                  marginBottom:
                    "20px",
                }}
              >
                <h2>
                  {poll.title}
                </h2>

                {poll.description && (
                  <p>
                    {
                      poll.description
                    }
                  </p>
                )}

                <p>
                  <strong>
                    Position:
                  </strong>{" "}
                  {poll.position
                    ?.name ||
                    "General"}
                </p>

                <p>
                  <strong>
                    Status:
                  </strong>{" "}
                  {poll.status}
                </p>

                <p>
                  <strong>
                    Questions:
                  </strong>{" "}
                  {
                    poll
                      .questions
                      .length
                  }
                </p>

                <p>
                  <strong>
                    Responses:
                  </strong>{" "}
                  {
                    poll._count
                      ?.responses ||
                    0
                  }
                </p>

                <p>
                  <strong>
                    Public:
                  </strong>{" "}
                  {poll.isPublic
                    ? "Yes"
                    : "No"}
                </p>

                <Link
                  to={`/admin/polls/${poll.id}`}
                >
                  Manage
                </Link>

                {" "}

                {poll.status ===
                  "DRAFT" && (
                  <button
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
                    Publish
                  </button>
                )}

                {poll.status ===
                  "ACTIVE" && (
                  <button
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
                    Pause
                  </button>
                )}

                {poll.status ===
                  "PAUSED" && (
                  <button
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
                    Resume
                  </button>
                )}

                {(poll.status ===
                  "ACTIVE" ||
                  poll.status ===
                    "PAUSED") && (
                  <button
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
                    Close
                  </button>
                )}

                {poll.status ===
                  "CLOSED" && (
                  <button
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
                    Archive
                  </button>
                )}
              </article>
            )
          )}
        </section>
      )}
    </main>
  );
}