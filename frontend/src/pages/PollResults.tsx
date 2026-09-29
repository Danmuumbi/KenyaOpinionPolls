import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getPollResults,
} from "../api/public";

import type {
  PollResults as PollResultsData,
} from "../api/public";

export default function PollResults() {
  const { pollId } =
    useParams();

  const [
    results,
    setResults,
  ] = useState<PollResultsData | null>(
    null
  );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!pollId) {
          throw new Error(
            "Poll ID is missing"
          );
        }

        const data =
          await getPollResults(
            pollId
          );

        setResults(data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load results"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [pollId]);

  if (loading) {
    return (
      <main>
        <p>
          Loading response distribution...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <h1>
          Results unavailable
        </h1>

        <p>{error}</p>

        <Link to="/">
          Back home
        </Link>
      </main>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <main>
      <header>
        <h1>
          Response recorded
        </h1>

        <p>
          Thank you for participating.
          Your response has been
          recorded.
        </p>

        <h2>
          {results.poll.title}
        </h2>

        <p>
          Total recorded responses:{" "}
          <strong>
            {results.totalResponses}
          </strong>
        </p>
      </header>

      <hr />

      {results.questions.map(
        (question) => (
          <section
            key={question.id}
          >
            <h2>
              {question.question}
            </h2>

            {question.options.map(
              (option) => (
                <article
                  key={option.id}
                >
                  <p>
                    <strong>
                      {option
                        .candidate
                        ?.name ||
                        option.label}
                    </strong>

                    {option
                      .candidate
                      ?.party &&
                      ` (${option.candidate.party})`}
                  </p>

                  <progress
                    value={
                      option.percentage
                    }
                    max="100"
                  />

                  <span>
                    {" "}
                    {
                      option.percentage
                    }
                    % —{" "}
                    {option.count}{" "}
                    responses
                  </span>
                </article>
              )
            )}
          </section>
        )
      )}

      <hr />

      <section>
        <h2>
          Explore more
        </h2>

        <p>
          Your participation in this
          poll does not prevent you from
          participating in other available
          polls.
        </p>

        <p>
          For example, you may participate
          in an available MCA poll after
          participating in a Governor poll.
        </p>

        <Link to="/">
          Explore other polls
        </Link>
      </section>

      <hr />

      <section>
        <h2>
          About these results
        </h2>

        <p>
          These figures represent
          responses submitted through this
          online polling platform.
        </p>

        <p>
          They are not official election
          results and should not be treated
          as a statistically representative
          survey unless an appropriate
          sampling methodology has been
          used.
        </p>
      </section>
    </main>
  );
}