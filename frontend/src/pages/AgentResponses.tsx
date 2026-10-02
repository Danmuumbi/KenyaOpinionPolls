import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import LocationSelector from "../components/LocationSelector";

import {
  getAdminPolls,
  recordAgentResponse,
} from "../api/admin";

import type {
  AdminPoll,
} from "../api/admin";

import "./AgentResponses.css";

interface LocationContext {
  countyId: string;
  constituencyId: string;
  wardId: string;
}

export default function AgentResponses() {
  const [polls, setPolls] = useState<AdminPoll[]>([]);

  const [pollId, setPollId] = useState("");

  const [location, setLocation] =
    useState<LocationContext>({
      countyId: "",
      constituencyId: "",
      wardId: "",
    });

  const [answers, setAnswers] =
    useState<Record<string, string>>({});

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadPolls() {
      try {
        const data = await getAdminPolls();

        setPolls(
          data.filter(
            (poll) => poll.status === "ACTIVE"
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load polls"
        );
      } finally {
        setLoading(false);
      }
    }

    loadPolls();
  }, []);

  const selectedPoll = polls.find(
    (poll) => poll.id === pollId
  );

  function handleAnswerChange(
    questionId: string,
    optionId: string
  ) {
    setAnswers((previous) => ({
      ...previous,
      [questionId]: optionId,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedPoll) {
      setError("Please select a poll.");
      return;
    }

    if (
      !location.countyId ||
      !location.constituencyId ||
      !location.wardId
    ) {
      setError(
        "Please select the respondent's complete location."
      );
      return;
    }

    const unansweredRequired =
      selectedPoll.questions.filter(
        (question) =>
          question.isRequired &&
          !answers[question.id]
      );

    if (unansweredRequired.length > 0) {
      setError(
        "Please answer all required questions."
      );
      return;
    }

    const submittedAnswers =
      selectedPoll.questions
        .filter(
          (question) => answers[question.id]
        )
        .map((question) => ({
          questionId: question.id,
          optionId: answers[question.id],
        }));

    if (submittedAnswers.length === 0) {
      setError("Please provide at least one answer.");
      return;
    }

    try {
      setSubmitting(true);

      await recordAgentResponse(
        selectedPoll.id,
        {
          countyId: location.countyId,
          constituencyId: location.constituencyId,
          wardId: location.wardId,
          answers: submittedAnswers,
        }
      );

      setSuccess(
        "Respondent's answers have been recorded successfully."
      );

      setAnswers({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to record response."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="agent-page">
        <p>Loading active polls...</p>
      </main>
    );
  }

  return (
    <main className="agent-page">

      <header className="agent-header">
        <div>
          <span className="agent-eyebrow">
            DATA COLLECTION
          </span>

          <h1>Record Respondent</h1>

          <p>
            Enter answers collected directly
            from a respondent by an authorized
            polling agent.
          </p>
        </div>
      </header>

      {error && (
        <div className="agent-alert agent-error">
          {error}
        </div>
      )}

      {success && (
        <div className="agent-alert agent-success">
          {success}
        </div>
      )}

      <form
        className="agent-form"
        onSubmit={handleSubmit}
      >

        <section className="agent-card">

          <div className="agent-section-heading">
            <span>01</span>

            <div>
              <h2>Select Poll</h2>

              <p>
                Choose the active poll associated
                with this respondent.
              </p>
            </div>
          </div>

          <label htmlFor="agent-poll">
            Active poll
          </label>

          <select
            id="agent-poll"
            value={pollId}
            onChange={(event) => {
              setPollId(event.target.value);
              setAnswers({});
              setError("");
              setSuccess("");
            }}
            required
          >
            <option value="">
              Select an active poll
            </option>

            {polls.map((poll) => (
              <option
                key={poll.id}
                value={poll.id}
              >
                {poll.title}
              </option>
            ))}
          </select>

          {polls.length === 0 && (
            <p className="agent-muted">
              There are currently no active polls.
            </p>
          )}

        </section>

        <section className="agent-card">

          <div className="agent-section-heading">
            <span>02</span>

            <div>
              <h2>Respondent Location</h2>

              <p>
                Select the respondent's actual
                county, constituency and ward.
              </p>
            </div>
          </div>

          <LocationSelector
            requireCounty
            requireConstituency
            requireWard
            onChange={setLocation}
          />

        </section>

        {selectedPoll && (
          <section className="agent-card">

            <div className="agent-section-heading">
              <span>03</span>

              <div>
                <h2>Record Answers</h2>

                <p>
                  Select the answers provided
                  by the respondent.
                </p>
              </div>
            </div>

            <div className="agent-poll-title">
              {selectedPoll.title}
            </div>

            {selectedPoll.questions
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((question, index) => {

                const activeOptions =
                  question.options.filter(
                    (option) => option.isActive
                  );

                return (
                  <fieldset
                    className="agent-question"
                    key={question.id}
                  >

                    <legend>
                      <span>
                        Question {index + 1}
                      </span>

                      <strong>
                        {question.question}
                      </strong>

                      {question.isRequired && (
                        <small>Required</small>
                      )}
                    </legend>

                    {question.description && (
                      <p className="agent-muted">
                        {question.description}
                      </p>
                    )}

                    <div className="agent-options">

                      {activeOptions.map((option) => (
                        <label
                          className={
                            answers[question.id] === option.id
                              ? "agent-option selected"
                              : "agent-option"
                          }
                          key={option.id}
                        >

                          <input
                            type="radio"
                            name={question.id}
                            value={option.id}
                            checked={
                              answers[question.id] === option.id
                            }
                            onChange={() =>
                              handleAnswerChange(
                                question.id,
                                option.id
                              )
                            }
                          />

                          <span>
                            {option.label}
                          </span>

                        </label>
                      ))}

                    </div>

                  </fieldset>
                );
              })}

          </section>
        )}

        {selectedPoll && (
          <div className="agent-submit-area">

            <p>
              Please confirm that the selected
              answers accurately represent the
              respondent's responses.
            </p>

            <button
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Recording response..."
                : "Submit Respondent's Answers"}
            </button>

          </div>
        )}

      </form>

    </main>
  );
}