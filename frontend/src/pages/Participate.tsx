import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  addOtherCandidate,
  getPublicPoll,
  submitPollResponses,
} from "../api/public";

import type {
  PublicPollDetails,
} from "../api/public";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./Participate.css";

export default function Participate() {
  const { pollId } = useParams();

  const navigate = useNavigate();

  const [poll, setPoll] =
    useState<PublicPollDetails | null>(null);

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [addingCandidate, setAddingCandidate] =
    useState(false);

  const [otherSelected, setOtherSelected] =
    useState<Record<string, boolean>>({});

  const [otherCandidateNames, setOtherCandidateNames] =
    useState<Record<string, string>>({});

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        if (!pollId) {
          throw new Error("Poll ID is missing");
        }

        const data =
          await getPublicPoll(pollId);

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

    load();
  }, [pollId]);

  function handleAnswer(
    questionId: string,
    optionId: string
  ) {
    setAnswers((current) => ({
      ...current,
      [questionId]: optionId,
    }));

    setOtherSelected((current) => ({
      ...current,
      [questionId]: false,
    }));

    setError("");
  }

  function handleOtherSelected(
    questionId: string
  ) {
    setOtherSelected((current) => ({
      ...current,
      [questionId]: true,
    }));

    setAnswers((current) => {
      const updated = {
        ...current,
      };

      delete updated[questionId];

      return updated;
    });

    setError("");
  }

  function handleOtherNameChange(
    questionId: string,
    value: string
  ) {
    setOtherCandidateNames(
      (current) => ({
        ...current,
        [questionId]: value,
      })
    );
  }

  async function addCandidateForQuestion(
    questionId: string
  ) {
    if (!pollId || !poll) {
      return;
    }

    const name =
      otherCandidateNames[
        questionId
      ]?.trim();

    if (!name) {
      setError(
        "Please enter the candidate's name."
      );

      return;
    }

    if (name.length < 2) {
      setError(
        "Candidate name must contain at least 2 characters."
      );

      return;
    }

    setError("");
    setAddingCandidate(true);

    try {
      const result =
        await addOtherCandidate(
          pollId,
          name
        );

      setPoll((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          questions:
            current.questions.map(
              (question) => {
                if (
                  question.id !==
                  questionId
                ) {
                  return question;
                }

                const alreadyExists =
                  question.options.some(
                    (option) =>
                      option.id ===
                      result.option.id
                  );

                if (alreadyExists) {
                  return question;
                }

                return {
                  ...question,
                  options: [
                    ...question.options,
                    result.option as typeof question.options[number],
                  ],
                };
              }
            ),
        };
      });

      setAnswers((current) => ({
        ...current,
        [questionId]:
          result.option.id,
      }));

      setOtherSelected((current) => ({
        ...current,
        [questionId]: false,
      }));

      setOtherCandidateNames(
        (current) => ({
          ...current,
          [questionId]: "",
        })
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to add candidate."
      );
    } finally {
      setAddingCandidate(false);
    }
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!pollId || !poll) {
      return;
    }

    setError("");

    const missingRequired =
      poll.questions.some(
        (question) =>
          question.isRequired &&
          !answers[question.id]
      );

    if (missingRequired) {
      setError(
        "Please answer all required questions."
      );

      const firstMissing =
        poll.questions.find(
          (question) =>
            question.isRequired &&
            !answers[question.id]
        );

      if (firstMissing) {
        document
          .getElementById(
            `question-${firstMissing.id}`
          )
          ?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
      }

      return;
    }

    const formattedAnswers =
      Object.entries(answers).map(
        ([questionId, optionId]) => ({
          questionId,
          optionId,
        })
      );

    setSubmitting(true);

    try {
      await submitPollResponses(
        pollId,
        {
          countyId:
            poll.targetCounty?.id ||
            undefined,

          constituencyId:
            poll.targetConstituency?.id ||
            undefined,

          wardId:
            poll.targetWard?.id ||
            undefined,

          answers:
            formattedAnswers,
        }
      );

      navigate(
        `/polls/${pollId}/results`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to submit response"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount =
    poll?.questions.filter(
      (question) =>
        Boolean(answers[question.id]) ||
        otherSelected[question.id]
    ).length ?? 0;

  const totalQuestions =
    poll?.questions.length ?? 0;

  const progress =
    totalQuestions > 0
      ? Math.round(
          (answeredCount /
            totalQuestions) *
            100
        )
      : 0;

  if (loading) {
    return (
      <>
        <Navbar />

        <main className="participate-page">
          <div className="participate-loading">
            <div className="participate-spinner" />

            <p>
              Loading participation form...
            </p>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (error && !poll) {
    return (
      <>
        <Navbar />

        <main className="participate-page">
          <section className="participate-error">
            <span className="participate-error-icon">
              !
            </span>

            <p className="participate-eyebrow">
              POLL UNAVAILABLE
            </p>

            <h1>
              This poll could not be loaded
            </h1>

            <p>
              {error}
            </p>

            <Link
              to="/polls"
              className="participate-primary-link"
            >
              Back to polls
            </Link>
          </section>
        </main>

        <Footer />
      </>
    );
  }

  if (!poll) {
    return null;
  }

  return (
    <>
      <Navbar />

      <main className="participate-page">
        <div className="participate-shell">

          <Link
            to={`/polls/${poll.id}`}
            className="participate-back"
          >
            <span aria-hidden="true">
              ←
            </span>
            Back to poll
          </Link>

          <header className="participate-header">
            <div className="participate-header-top">
              <span className="participate-label">
                PARTICIPATION FORM
              </span>

              <span className="participate-anonymous">
                <span aria-hidden="true">
                  ✓
                </span>
                Anonymous response
              </span>
            </div>

            <h1>
              {poll.title}
            </h1>

            {poll.description && (
              <p className="participate-description">
                {poll.description}
              </p>
            )}
          </header>

          <section className="participate-context">
            <div className="context-item">
              <span className="context-label">
                POLL AREA
              </span>

              <strong>
                {poll.position?.scope ===
                "NATIONAL"
                  ? "National"
                  : [
                      poll.targetWard?.name,
                      poll.targetConstituency?.name,
                      poll.targetCounty?.name,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                    "Specified location"}
              </strong>
            </div>

            {poll.position && (
              <div className="context-item">
                <span className="context-label">
                  POSITION
                </span>

                <strong>
                  {poll.position.name}
                </strong>
              </div>
            )}

            <div className="context-progress">
              <div className="progress-heading">
                <span>
                  Your progress
                </span>

                <strong>
                  {answeredCount}/{totalQuestions}
                </strong>
              </div>

              <div
                className="progress-track"
                aria-label={`${progress}% complete`}
              >
                <span
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>
            </div>
          </section>

          <div className="participate-layout">

            <aside className="participate-sidebar">
              <div className="sidebar-panel">
                <span className="sidebar-number">
                  {String(answeredCount).padStart(
                    2,
                    "0"
                  )}
                </span>

                <span className="sidebar-divider">
                  /
                </span>

                <span className="sidebar-total">
                  {String(totalQuestions).padStart(
                    2,
                    "0"
                  )}
                </span>

                <p>
                  questions answered
                </p>
              </div>

              <div className="sidebar-note">
                <span className="sidebar-note-icon">
                  i
                </span>

                <p>
                  Choose the option that
                  best represents your
                  response. Required
                  questions are marked with
                  an asterisk.
                </p>
              </div>
            </aside>

            <form
              className="participate-form"
              onSubmit={handleSubmit}
            >
              <div className="form-heading">
                <div>
                  <span className="form-kicker">
                    YOUR RESPONSE
                  </span>

                  <h2>
                    Select your answers
                  </h2>
                </div>

                <span className="form-count">
                  {answeredCount} answered
                </span>
              </div>

              {poll.questions.map(
                (
                  question,
                  questionIndex
                ) => (
                  <section
                    key={question.id}
                    id={`question-${question.id}`}
                    className="question-section"
                  >
                    <div className="question-number">
                      {String(
                        questionIndex + 1
                      ).padStart(2, "0")}
                    </div>

                    <div className="question-content">
                      <div className="question-heading">
                        <h3>
                          {question.question}

                          {question.isRequired && (
                            <span
                              className="required-mark"
                              aria-label="required"
                            >
                              *
                            </span>
                          )}
                        </h3>

                        {question.description && (
                          <p>
                            {
                              question.description
                            }
                          </p>
                        )}
                      </div>

                      <div className="answer-list">
                        {question.options.map(
                          (option) => {
                            const selected =
                              answers[
                                question.id
                              ] ===
                              option.id;

                            return (
                              <label
                                key={
                                  option.id
                                }
                                className={`answer-option ${
                                  selected
                                    ? "selected"
                                    : ""
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={
                                    question.id
                                  }
                                  value={
                                    option.id
                                  }
                                  checked={
                                    selected
                                  }
                                  onChange={() =>
                                    handleAnswer(
                                      question.id,
                                      option.id
                                    )
                                  }
                                />

                                <span className="custom-radio">
                                  <span />
                                </span>

                                {option.candidate
                                  ?.photoUrl ? (
                                  <img
                                    src={
                                      option
                                        .candidate
                                        .photoUrl
                                    }
                                    alt=""
                                    className="candidate-photo"
                                  />
                                ) : (
                                  <span className="candidate-placeholder">
                                    {(
                                      option
                                        .candidate
                                        ?.name ||
                                      option.label ||
                                      "?"
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>
                                )}

                                <span className="answer-details">
                                  <strong>
                                    {option
                                      .candidate
                                      ?.name ||
                                      option.label}
                                  </strong>

                                  {option
                                    .candidate
                                    ?.party && (
                                    <small>
                                      {
                                        option
                                          .candidate
                                          .party
                                      }
                                    </small>
                                  )}
                                </span>

                                <span className="answer-check">
                                  ✓
                                </span>
                              </label>
                            );
                          }
                        )}

                        <label
                          className={`answer-option other-option ${
                            otherSelected[
                              question.id
                            ]
                              ? "selected"
                              : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name={
                              question.id
                            }
                            checked={
                              otherSelected[
                                question.id
                              ] === true
                            }
                            onChange={() =>
                              handleOtherSelected(
                                question.id
                              )
                            }
                          />

                          <span className="custom-radio">
                            <span />
                          </span>

                          <span className="other-icon">
                            +
                          </span>

                          <span className="answer-details">
                            <strong>
                              Other candidate
                            </strong>

                            <small>
                              My candidate isn't
                              listed
                            </small>
                          </span>

                          <span className="answer-check">
                            ✓
                          </span>
                        </label>

                        {otherSelected[
                          question.id
                        ] && (
                          <div className="other-candidate-box">
                            <div>
                              <label
                                htmlFor={`other-${question.id}`}
                              >
                                Candidate name
                              </label>

                              <p>
                                Add the candidate
                                you want to include
                                in this poll.
                              </p>
                            </div>

                            <div className="other-candidate-controls">
                              <input
                                id={`other-${question.id}`}
                                type="text"
                                value={
                                  otherCandidateNames[
                                    question.id
                                  ] || ""
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleOtherNameChange(
                                    question.id,
                                    event.target
                                      .value
                                  )
                                }
                                placeholder="Enter candidate name"
                                maxLength={150}
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  addCandidateForQuestion(
                                    question.id
                                  )
                                }
                                disabled={
                                  addingCandidate
                                }
                              >
                                {addingCandidate
                                  ? "Adding..."
                                  : "Add candidate"}
                              </button>
                            </div>

                            <span className="other-help">
                              Once added, the
                              candidate becomes
                              available as an option
                              for this poll.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                )
              )}

              {error && (
                <div
                  className="form-error"
                  role="alert"
                >
                  <span>
                    !
                  </span>

                  <div>
                    <strong>
                      Please check your response
                    </strong>

                    <p>
                      {error}
                    </p>
                  </div>
                </div>
              )}

              <section className="submit-section">
                <div className="submit-copy">
                  <span className="submit-icon">
                    ✓
                  </span>

                  <div>
                    <h2>
                      Ready to submit?
                    </h2>

                    <p>
                      Review your selections
                      before sending your
                      response.
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-button"
                  disabled={
                    submitting ||
                    addingCandidate
                  }
                >
                  <span>
                    {submitting
                      ? "Submitting response..."
                      : "Submit my response"}
                  </span>

                  {!submitting && (
                    <span
                      aria-hidden="true"
                    >
                      →
                    </span>
                  )}
                </button>
              </section>

              <p className="form-disclaimer">
                Your response is anonymous.
                Results are presented as
                percentages and represent
                responses collected through
                this platform.
              </p>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}