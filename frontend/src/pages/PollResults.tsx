
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

import "./PollResults.css";

export default function PollResults() {
  const { pollId } = useParams();

  const [
    results,
    setResults,
  ] = useState<PollResultsData | null>(null);

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
      <main className="poll-results-page">
        <div className="results-state-card">
          <div className="results-spinner" />

          <h2>
            Loading results
          </h2>

          <p>
            Please wait while we load
            the response distribution.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="poll-results-page">
        <div className="results-state-card error-state">
          <div className="state-icon">
            !
          </div>

          <h1>
            Results unavailable
          </h1>

          <p>
            {error}
          </p>

          <Link
            to="/"
            className="results-primary-button"
          >
            Back home
          </Link>
        </div>
      </main>
    );
  }

  if (!results) {
    return null;
  }

  return (
    <main className="poll-results-page">

      {/* Hero */}
      <section className="results-hero">

        <div className="results-hero-content">

          <div className="results-success-badge">
            <span className="success-check">
              ✓
            </span>

            Response recorded
          </div>

          <h1>
            Thank you for participating
          </h1>

          <p className="results-hero-text">
            Your response has been
            successfully recorded.
            Here is the current response
            distribution for this poll.
          </p>

          <div className="poll-title-card">

            <span className="poll-title-label">
              POLL
            </span>

            <h2>
              {results.poll.title}
            </h2>

          </div>

        </div>

      </section>


      {/* Main content */}
      <div className="results-container">

        {/* Summary */}
        <section className="results-summary">

          <div className="summary-card">

            <div className="summary-icon">
              ◉
            </div>

            <div>
              <span>
                Recorded responses
              </span>

              <strong>
                {results.totalResponses}
              </strong>
            </div>

          </div>

          <div className="summary-card">

            <div className="summary-icon">
              %
            </div>

            <div>
              <span>
                Result format
              </span>

              <strong>
                Percentage
              </strong>
            </div>

          </div>

        </section>


        {/* Questions */}
        <section className="results-list">

          {results.questions.map(
            (question, questionIndex) => (
              <article
                key={question.id}
                className="question-card"
              >

                <div className="question-header">

                  <span className="question-number">
                    {String(
                      questionIndex + 1
                    ).padStart(2, "0")}
                  </span>

                  <div>
                    <span className="question-label">
                      QUESTION
                    </span>

                    <h2>
                      {question.question}
                    </h2>
                  </div>

                </div>


                <div className="options-list">

                  {question.options.map(
                    (option) => {

                      const percentage =
                        Number(
                          option.percentage
                        );

                      return (
                        <div
                          key={option.id}
                          className="result-option"
                        >

                          <div className="option-top">

                            <div className="option-name">

                              <strong>
                                {
                                  option
                                    .candidate
                                    ?.name ||
                                  option.label
                                }
                              </strong>

                              {option
                                .candidate
                                ?.party && (
                                <span className="party-name">
                                  {
                                    option
                                      .candidate
                                      .party
                                  }
                                </span>
                              )}

                            </div>

                            <div className="option-percentage">
                              {percentage}%
                            </div>

                          </div>


                          <div className="progress-track">

                            <div
                              className="progress-fill"
                              style={{
                                width: `${Math.min(
                                  Math.max(
                                    percentage,
                                    0
                                  ),
                                  100
                                )}%`,
                              }}
                            />

                          </div>


                          <div className="option-bottom">

                            <span>
                              {option.count}{" "}
                              responses
                            </span>

                            <span>
                              {percentage}%
                            </span>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </article>
            )
          )}

        </section>


        {/* Explore */}
        <section className="explore-card">

          <div className="explore-content">

            <span className="section-eyebrow">
              KEEP PARTICIPATING
            </span>

            <h2>
              Explore more polls
            </h2>

            <p>
              Your participation in this
              poll does not prevent you
              from participating in other
              available polls.
            </p>

            <p>
              You may participate in
              another available poll,
              such as an MCA poll after
              participating in a Governor
              poll.
            </p>

          </div>

          <Link
            to="/"
            className="results-primary-button"
          >
            Explore other polls
            <span>→</span>
          </Link>

        </section>


        {/* Methodology */}
        <section className="about-results">

          <div className="about-results-icon">
            i
          </div>

          <div>

            <span className="section-eyebrow">
              ABOUT THESE RESULTS
            </span>

            <h2>
              Understanding the figures
            </h2>

            <p>
              These figures represent
              responses submitted through
              this online polling platform.
            </p>

            <p>
              They are not official election
              results and should not be
              treated as a statistically
              representative survey unless
              an appropriate sampling
              methodology has been used.
            </p>

          </div>

        </section>

      </div>

    </main>
  );
}

