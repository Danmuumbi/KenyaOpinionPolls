import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getPublicPolls,
} from "../api/public";

import type {
  PublicPoll,
} from "../api/public";

import {
  getLocationContext,
} from "../utils/locationContext";

export default function Polls() {
  const [polls, setPolls] =
    useState<PublicPoll[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        const location =
          getLocationContext();

        const data =
          await getPublicPolls(
            location
          );

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

    load();
  }, []);

  if (loading) {
    return (
      <main>
        <p>
          Loading general polls...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <h1>
          General & Public Opinion
        </h1>

        <p>{error}</p>

        <Link to="/">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <main>
      <Link to="/">
        ← Home
      </Link>

      <h1>
        General & Public Opinion
      </h1>

      <p>
        Explore active public opinion,
        research and general polls.
      </p>

      {polls.length === 0 ? (
        <p>
          There are currently no
          general public polls available.
        </p>
      ) : (
        <section>
          {polls.map((poll) => (
            <article key={poll.id}>
              <h2>
                {poll.title}
              </h2>

              {poll.description && (
                <p>
                  {poll.description}
                </p>
              )}

              <p>
                Responses:{" "}
                {poll._count
                  ?.responses ?? 0}
              </p>

              <Link
                to={`/polls/${poll.id}`}
              >
                View Poll & Statistics
              </Link>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}