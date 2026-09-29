
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

export default function Participate() {
  const { pollId } =
    useParams();

  const navigate =
    useNavigate();

  const [poll, setPoll] =
    useState<PublicPollDetails | null>(
      null
    );

  const [answers, setAnswers] =
    useState<
      Record<string, string>
    >({});

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [addingCandidate, setAddingCandidate] =
    useState(false);

  const [otherSelected, setOtherSelected] =
    useState<
      Record<string, boolean>
    >({});

  const [otherCandidateNames, setOtherCandidateNames] =
    useState<
      Record<string, string>
    >({});

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
          await getPublicPoll(
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

    load();
  }, [pollId]);

  function handleAnswer(
    questionId: string,
    optionId: string
  ) {
    setAnswers((current) => ({
      ...current,
      [questionId]:
        optionId,
    }));

    setOtherSelected((current) => ({
      ...current,
      [questionId]: false,
    }));
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

      /*
       * Add the newly created option
       * into the poll currently displayed.
       */
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

                /*
                 * Prevent duplicate display
                 * if the option is already there.
                 */
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

      /*
       * Select the newly created
       * candidate option.
       */
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

    /*
     * Make sure all required questions
     * have been answered.
     */
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

      return;
    }

    /*
     * The participant has already
     * selected this specific poll.
     *
     * Therefore we use the poll's own
     * target geography instead of asking
     * the participant to select it again.
     */
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

  if (loading) {
    return (
      <main>
        <p>
          Loading participation form...
        </p>
      </main>
    );
  }

  if (error && !poll) {
    return (
      <main>
        <h1>
          Poll unavailable
        </h1>

        <p>{error}</p>

        <Link to="/">
          Back home
        </Link>
      </main>
    );
  }

  if (!poll) {
    return null;
  }

  return (
    <main>
      <Link
        to={`/polls/${poll.id}`}
      >
        ← Back to poll
      </Link>

      <header>
        <h1>
          {poll.title}
        </h1>

        <p>
          Your response is anonymous.
        </p>
      </header>

      <hr />

      {/* POLL LOCATION */}

      {poll.position &&
        poll.position.scope !==
          "NATIONAL" && (
          <section>
            <h2>
              Poll location
            </h2>

            {poll.targetCounty && (
              <p>
                County:{" "}
                <strong>
                  {
                    poll.targetCounty
                      .name
                  }
                </strong>
              </p>
            )}

            {poll.targetConstituency && (
              <p>
                Constituency:{" "}
                <strong>
                  {
                    poll
                      .targetConstituency
                      .name
                  }
                </strong>
              </p>
            )}

            {poll.targetWard && (
              <p>
                Ward:{" "}
                <strong>
                  {
                    poll
                      .targetWard
                      .name
                  }
                </strong>
              </p>
            )}
          </section>
        )}

      <hr />

      <form
        onSubmit={handleSubmit}
      >
        <section>
          <h2>
            Your response
          </h2>

          {poll.questions.map(
            (
              question,
              questionIndex
            ) => (
              <article
                key={question.id}
              >
                <h3>
                  {questionIndex + 1}.{" "}
                  {question.question}
                </h3>

                {question.description && (
                  <p>
                    {
                      question.description
                    }
                  </p>
                )}

                {question.options.map(
                  (option) => (
                    <label
                      key={option.id}
                      style={{
                        display:
                          "block",
                      }}
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
                          answers[
                            question.id
                          ] ===
                          option.id
                        }
                        onChange={() =>
                          handleAnswer(
                            question.id,
                            option.id
                          )
                        }
                      />

                      {" "}

                      {option.candidate
                        ?.name ||
                        option.label}

                      {option.candidate
                        ?.party &&
                        ` (${option.candidate.party})`}
                    </label>
                  )
                )}

                {/* OTHER CANDIDATE */}

                <label
                  style={{
                    display:
                      "block",
                    marginTop:
                      "12px",
                  }}
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

                  {" "}

                  Other candidate / My candidate
                  isn't listed
                </label>

                {otherSelected[
                  question.id
                ] && (
                  <div
                    style={{
                      marginTop:
                        "10px",
                      marginLeft:
                        "24px",
                    }}
                  >
                    <input
                      type="text"
                      value={
                        otherCandidateNames[
                          question.id
                        ] || ""
                      }
                      onChange={(event) =>
                        handleOtherNameChange(
                          question.id,
                          event.target.value
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
                      style={{
                        marginLeft:
                          "8px",
                      }}
                    >
                      {addingCandidate
                        ? "Adding..."
                        : "Add Candidate"}
                    </button>

                    <p>
                      The candidate will be
                      added to this poll and
                      will be available for
                      other participants.
                    </p>
                  </div>
                )}
              </article>
            )
          )}
        </section>

        {error && (
          <p>
            <strong>
              Error:
            </strong>{" "}
            {error}
          </p>
        )}

        <br />

        <button
          type="submit"
          disabled={
            submitting ||
            addingCandidate
          }
        >
          {submitting
            ? "Submitting..."
            : "Submit Response"}
        </button>
      </form>
    </main>
  );
}
