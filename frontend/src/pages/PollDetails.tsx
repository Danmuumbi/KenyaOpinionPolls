import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getPollResults,
  getPublicPoll,
} from "../api/public";

import type {
  PollResults,
  PublicPollDetails,
} from "../api/public";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./PollDetails.css";


export default function PollDetails() {
  const {
    pollId,
  } = useParams<{
    pollId: string;
  }>();

  const [poll, setPoll] =
    useState<PublicPollDetails | null>(null);

  const [results, setResults] =
    useState<PollResults | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  useEffect(() => {
    if (!pollId) {
      return;
    }

    async function loadPoll() {
      try {
        setLoading(true);
        setError("");

        const pollData =
          await getPublicPoll(
            pollId
          );

        setPoll(pollData);

        if (pollData.allowResults) {
          const resultData =
            await getPollResults(
              pollId
            );

          setResults(resultData);
        } else {
          setResults(null);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this poll."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPoll();
  }, [pollId]);


  const summaries =
    useMemo(() => {
      if (!results) {
        return [];
      }

      return results.questions.map(
        (question) => {
          const options =
            [...question.options]
              .sort(
                (a, b) =>
                  b.percentage -
                  a.percentage
              );

          if (
            question.totalResponses === 0 ||
            options.length === 0
          ) {
            return {
              questionId:
                question.id,

              text:
                "There are not yet enough responses to describe the current distribution.",
            };
          }

          const first =
            options[0];

          const second =
            options[1];

          const firstName =
            first.candidate?.name ||
            first.label;

          const firstPercentage =
            first.percentage;

          if (
            firstPercentage <= 0
          ) {
            return {
              questionId:
                question.id,

              text:
                "No option currently has a measurable share of the recorded responses.",
            };
          }

          if (
            second &&
            Math.abs(
              first.percentage -
              second.percentage
            ) <= 5
          ) {
            const secondName =
              second.candidate?.name ||
              second.label;

            return {
              questionId:
                question.id,

              text:
                `${firstName} currently has the largest recorded share at ${firstPercentage.toFixed(1)}%, while ${secondName} is within five percentage points.`,
            };
          }

          return {
            questionId:
              question.id,

            text:
              `${firstName} currently has the largest recorded share of responses at ${firstPercentage.toFixed(1)}%.`,
          };
        }
      );
    }, [results]);


  if (loading) {
    return (
      <>
        <Navbar />

        <main className="poll-details-page">

          <section className="poll-details-loading">

            <div className="poll-details-loading__eyebrow">
              SFD / POLL
            </div>

            <div className="poll-details-loading__line" />

            <h1>
              Preparing
              <br />
              poll results.
            </h1>

            <p>
              Loading the poll and its
              available information.
            </p>

          </section>

        </main>

        <Footer />
      </>
    );
  }


  if (error || !poll) {
    return (
      <>
        <Navbar />

        <main className="poll-details-page">

          <section className="poll-details-error">

            <span>
              POLL / UNAVAILABLE
            </span>

            <div className="poll-details-error__mark">
              !
            </div>

            <h1>
              This poll could not
              be loaded.
            </h1>

            <p>
              {error ||
                "The requested poll could not be found."}
            </p>

            <Link to="/polls">
              ← Back to polls
            </Link>

          </section>

        </main>

        <Footer />
      </>
    );
  }


  return (
    <>
      <Navbar />

      <main className="poll-details-page">

        {/* =================================================
            POLL HEADER
            ================================================= */}

        <section className="poll-details-hero">

          <div className="poll-details-shell">

            <div className="poll-details-hero__top">

              <Link
                to="/polls"
                className="poll-details-back"
              >
                ← All polls
              </Link>

              <span>
                SFD / POLL
              </span>

            </div>


            <div className="poll-details-hero__content">

              <div className="poll-details-hero__label">
                PUBLIC OPINION POLL
              </div>

              <h1>
                {poll.title}
              </h1>

              {poll.description && (
                <p className="poll-details-hero__description">
                  {poll.description}
                </p>
              )}


              <div className="poll-details-scope">

                {poll.position?.name && (
                  <div>
                    <span>
                      POSITION
                    </span>

                    <strong>
                      {poll.position.name}
                    </strong>
                  </div>
                )}

                {poll.targetCounty?.name && (
                  <div>
                    <span>
                      COUNTY
                    </span>

                    <strong>
                      {poll.targetCounty.name}
                    </strong>
                  </div>
                )}

                {poll.targetConstituency?.name && (
                  <div>
                    <span>
                      CONSTITUENCY
                    </span>

                    <strong>
                      {poll.targetConstituency.name}
                    </strong>
                  </div>
                )}

                {poll.targetWard?.name && (
                  <div>
                    <span>
                      WARD
                    </span>

                    <strong>
                      {poll.targetWard.name}
                    </strong>
                  </div>
                )}

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
            RESULTS NOT PUBLIC
            ================================================= */}

        {!poll.allowResults ? (

          <section className="poll-details-shell">

            <div className="poll-results-private">

              <div className="poll-results-private__number">
                —
              </div>

              <div>

                <span>
                  RESULTS NOT PUBLIC
                </span>

                <h2>
                  Results are currently
                  unavailable.
                </h2>

                <p>
                  The administrator of this
                  poll has chosen not to
                  display public statistics
                  at this time.
                </p>

                <Link
                  to={`/polls/${poll.id}/participate`}
                >
                  Participate in this poll
                  <strong>
                    ↗
                  </strong>
                </Link>

              </div>

            </div>

          </section>

        ) : (

          <>

            {/* =============================================
                RESULTS INTRO
                ============================================= */}

            <section className="poll-results-section">

              <div className="poll-details-shell">

                <div className="poll-results-heading">

                  <div>

                    <span>
                      CURRENT DISTRIBUTION
                    </span>

                    <h2>
                      What the responses
                      show
                    </h2>

                  </div>

                  <div className="poll-results-status">
                    <i />
                    Results available
                  </div>

                </div>


                <p className="poll-results-heading__text">
                  Percentages represent the
                  distribution of responses
                  submitted through this poll.
                </p>


                {results &&
                results.questions.length > 0 ? (

                  <div className="poll-question-list">

                    {results.questions.map(
                      (
                        question,
                        questionIndex
                      ) => {

                        const summary =
                          summaries.find(
                            (item) =>
                              item.questionId ===
                              question.id
                          );

                        const sortedOptions =
                          [...question.options]
                            .sort(
                              (a, b) =>
                                b.percentage -
                                a.percentage
                            );

                        return (
                          <section
                            key={question.id}
                            className="poll-question"
                          >

                            <div className="poll-question__header">

                              <span>
                                {String(
                                  questionIndex + 1
                                ).padStart(
                                  2,
                                  "0"
                                )}
                              </span>

                              <h3>
                                {question.question}
                              </h3>

                            </div>


                            {summary && (
                              <div className="poll-summary">

                                <span>
                                  INSIGHT
                                </span>

                                <p>
                                  {summary.text}
                                </p>

                              </div>
                            )}


                            <div className="poll-options">

                              {sortedOptions.map(
                                (
                                  option,
                                  optionIndex
                                ) => {

                                  const candidate =
                                    option.candidate;

                                  const name =
                                    candidate?.name ||
                                    option.label;

                                  const percentage =
                                    Math.max(
                                      0,
                                      Math.min(
                                        100,
                                        option.percentage
                                      )
                                    );

                                  const largestShare =
                                    optionIndex === 0 &&
                                    percentage > 0;

                                  return (
                                    <article
                                      key={
                                        option.id
                                      }
                                      className={`poll-option ${
                                        largestShare
                                          ? "poll-option--largest"
                                          : ""
                                      }`}
                                    >

                                      <div className="poll-option__top">

                                        <div className="poll-option__identity">

                                          {candidate?.photoUrl ? (

                                            <img
                                              src={
                                                candidate.photoUrl
                                              }
                                              alt={
                                                candidate.name
                                              }
                                              className="poll-option__image"
                                            />

                                          ) : (

                                            <div className="poll-option__placeholder">
                                              {name
                                                .charAt(
                                                  0
                                                )
                                                .toUpperCase()}
                                            </div>

                                          )}


                                          <div>

                                            <div className="poll-option__name-row">

                                              <h4>
                                                {name}
                                              </h4>

                                              {largestShare && (
                                                <span>
                                                  Largest share
                                                </span>
                                              )}

                                            </div>

                                            {candidate?.party && (
                                              <p>
                                                {candidate.party}
                                              </p>
                                            )}

                                          </div>

                                        </div>


                                        <strong className="poll-option__percentage">
                                          {percentage.toFixed(
                                            1
                                          )}
                                          <small>
                                            %
                                          </small>
                                        </strong>

                                      </div>


                                      <div className="poll-option__bar">

                                        <span
                                          style={{
                                            width:
                                              `${percentage}%`,
                                          }}
                                        />

                                      </div>

                                    </article>
                                  );
                                }
                              )}

                            </div>

                          </section>
                        );
                      }
                    )}

                  </div>

                ) : (

                  <div className="poll-no-results">

                    <span>
                      00
                    </span>

                    <div>
                      <h2>
                        No responses yet.
                      </h2>

                      <p>
                        There are currently
                        no responses available
                        for this poll.
                      </p>
                    </div>

                  </div>

                )}

              </div>

            </section>


            {/* =============================================
                PARTICIPATION CTA
                ============================================= */}

            <section className="poll-participate">

              <div className="poll-details-shell">

                <div className="poll-participate__inner">

                  <div>

                    <span>
                      HAVE YOUR SAY
                    </span>

                    <h2>
                      Add your response.
                    </h2>

                    <p>
                      Your response contributes
                      to the distribution shown
                      above.
                    </p>

                  </div>

                  <Link
                    to={`/polls/${poll.id}/participate`}
                  >
                    Participate
                    <strong>
                      ↗
                    </strong>
                  </Link>

                </div>

              </div>

            </section>


            {/* =============================================
                METHODOLOGY / DISCLOSURE
                ============================================= */}

            {(poll.methodologyNote ||
              poll.disclosureNote) && (

              <section className="poll-information">

                <div className="poll-details-shell">

                  <div className="poll-information__heading">
                    <span>
                      POLL INFORMATION
                    </span>

                    <h2>
                      About this poll
                    </h2>
                  </div>


                  <div className="poll-information__grid">

                    {poll.methodologyNote && (
                      <div>

                        <span>
                          METHODOLOGY
                        </span>

                        <p>
                          {poll.methodologyNote}
                        </p>

                      </div>
                    )}


                    {poll.disclosureNote && (
                      <div>

                        <span>
                          DISCLOSURE
                        </span>

                        <p>
                          {poll.disclosureNote}
                        </p>

                      </div>
                    )}

                  </div>

                </div>

              </section>
            )}


            {/* =============================================
                NOTICE
                ============================================= */}

            <section className="poll-notice">

              <div className="poll-details-shell">

                <div className="poll-notice__inner">

                  <span>
                    i
                  </span>

                  <p>
                    These figures represent
                    responses submitted through
                    this online poll. They should
                    not be interpreted as official
                    election results or as a
                    scientifically representative
                    sample unless the poll
                    explicitly states otherwise.
                  </p>

                </div>

              </div>

            </section>

          </>
        )}

      </main>

      <Footer />
    </>
  );
}