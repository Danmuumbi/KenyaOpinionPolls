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
  getAdminPoll,
  updatePoll,
} from "../api/admin";

import type {
  AdminPoll,
  CreatePollQuestion,
} from "../api/admin";

import "./EditPoll.css";

type EditableQuestion =
  CreatePollQuestion & {
    id?: string;
  };

function formatDateTimeLocal(
  value?: string | null
) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    date.getDate()
  ).padStart(2, "0");
  const hours = String(
    date.getHours()
  ).padStart(2, "0");
  const minutes = String(
    date.getMinutes()
  ).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function EditPoll() {
  const { pollId } = useParams();
  const navigate = useNavigate();

  const [poll, setPoll] =
    useState<AdminPoll | null>(null);

  const [title, setTitle] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [startsAt, setStartsAt] =
    useState("");

  const [endsAt, setEndsAt] =
    useState("");

  const [allowResults, setAllowResults] =
    useState(true);

  const [isPublic, setIsPublic] =
    useState(true);

  const [questions, setQuestions] =
    useState<EditableQuestion[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    async function loadPoll() {
      if (!pollId) {
        setError("Poll ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const data =
          await getAdminPoll(pollId);

        setPoll(data);

        setTitle(data.title || "");

        setDescription(
          data.description || ""
        );

        setStartsAt(
          formatDateTimeLocal(
            data.startsAt
          )
        );

        setEndsAt(
          formatDateTimeLocal(
            data.endsAt
          )
        );

        setAllowResults(
          data.allowResults
        );

        setIsPublic(
          data.isPublic
        );

        setQuestions(
          data.questions.map(
            (question) => ({
              id: question.id,

              question:
                question.question,

              description:
                question.description ||
                "",

              isRequired:
                question.isRequired,

              options:
                question.options.map(
                  (option) => ({
                    label:
                      option.label,

                    value:
                      option.value ||
                      "",

                    candidateId:
                      option.candidateId ||
                      undefined,

                    isActive:
                      option.isActive,
                  })
                ),

              tempId:
                question.id,
            })
          )
        );
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

    loadPoll();
  }, [pollId]);

  function updateQuestion(
    questionIndex: number,
    field:
      | "question"
      | "description"
      | "isRequired",
    value: string | boolean
  ) {
    setQuestions(
      (current) =>
        current.map(
          (question, index) =>
            index === questionIndex
              ? {
                  ...question,
                  [field]: value,
                }
              : question
        )
    );
  }

  function updateOption(
    questionIndex: number,
    optionIndex: number,
    field:
      | "label"
      | "value"
      | "candidateId"
      | "isActive",
    value:
      | string
      | boolean
      | undefined
  ) {
    setQuestions(
      (current) =>
        current.map(
          (question, qIndex) => {
            if (
              qIndex !==
              questionIndex
            ) {
              return question;
            }

            return {
              ...question,
              options:
                question.options.map(
                  (option, oIndex) =>
                    oIndex === optionIndex
                      ? {
                          ...option,
                          [field]: value,
                        }
                      : option
                ),
            };
          }
        )
    );
  }

  function addOption(
    questionIndex: number
  ) {
    setQuestions(
      (current) =>
        current.map(
          (question, index) =>
            index === questionIndex
              ? {
                  ...question,
                  options: [
                    ...question.options,
                    {
                      label: "",
                      value: "",
                      candidateId:
                        undefined,
                      isActive: true,
                    },
                  ],
                }
              : question
        )
    );
  }

  function removeOption(
    questionIndex: number,
    optionIndex: number
  ) {
    setQuestions(
      (current) =>
        current.map(
          (question, index) => {
            if (
              index !==
              questionIndex
            ) {
              return question;
            }

            if (
              question.options.length <=
              1
            ) {
              return question;
            }

            return {
              ...question,
              options:
                question.options.filter(
                  (_, oIndex) =>
                    oIndex !==
                    optionIndex
                ),
            };
          }
        )
    );
  }

  function addQuestion() {
    setQuestions(
      (current) => [
        ...current,
        {
          tempId:
            crypto.randomUUID(),

          question: "",

          description: "",

          isRequired: true,

          options: [
            {
              label: "",
              value: "",
              candidateId:
                undefined,
              isActive: true,
            },
          ],
        },
      ]
    );
  }

  function removeQuestion(
    questionIndex: number
  ) {
    if (questions.length <= 1) {
      return;
    }

    setQuestions(
      (current) =>
        current.filter(
          (_, index) =>
            index !==
            questionIndex
        )
    );
  }

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!pollId) {
      return;
    }

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError(
        "Poll title is required."
      );
      return;
    }

    if (
      startsAt &&
      endsAt &&
      new Date(startsAt) >=
        new Date(endsAt)
    ) {
      setError(
        "The start date must be before the end date."
      );
      return;
    }

    for (
      let questionIndex = 0;
      questionIndex <
      questions.length;
      questionIndex++
    ) {
      const question =
        questions[questionIndex];

      if (!question.question.trim()) {
        setError(
          `Question ${
            questionIndex + 1
          } must have text.`
        );
        return;
      }

      if (
        question.options.length ===
        0
      ) {
        setError(
          `Question ${
            questionIndex + 1
          } must have at least one option.`
        );
        return;
      }

      for (
        let optionIndex = 0;
        optionIndex <
        question.options.length;
        optionIndex++
      ) {
        const option =
          question.options[
            optionIndex
          ];

        if (!option.label.trim()) {
          setError(
            `Question ${
              questionIndex + 1
            }, option ${
              optionIndex + 1
            } must have a label.`
          );
          return;
        }
      }
    }

    try {
      setSaving(true);

      await updatePoll(
        pollId,
        {
          title: title.trim(),

          description:
            description.trim(),

          startsAt:
            startsAt || undefined,

          endsAt:
            endsAt || undefined,

          allowResults,

          isPublic,

          questions:
            questions.map(
              (question) => ({
                question:
                  question.question.trim(),

                description:
                  question.description?.trim() ||
                  undefined,

                isRequired:
                  question.isRequired,

                options:
                  question.options.map(
                    (option) => ({
                      label:
                        option.label.trim(),

                      value:
                        option.value?.trim() ||
                        undefined,

                      candidateId:
                        option.candidateId ||
                        undefined,

                      isActive:
                        option.isActive,
                    })
                  ),
              })
            ),
        }
      );

      setSuccess(
        "Poll updated successfully."
      );

      setTimeout(() => {
        navigate(
          `/admin/polls/${pollId}`
        );
      }, 700);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update poll"
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="edit-poll-page">
        <div className="edit-poll-loading">
          <div className="edit-poll-spinner" />
          <p>Loading poll editor...</p>
        </div>
      </main>
    );
  }

  if (!poll) {
    return (
      <main className="edit-poll-page">
        <div className="edit-poll-not-found">
          <span className="edit-poll-eyebrow">
            POLL EDITOR
          </span>

          <h1>Poll not found</h1>

          <p>{error}</p>

          <Link
            className="edit-poll-back-link"
            to="/admin/polls"
          >
            ← Back to polls
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="edit-poll-page">
      <div className="edit-poll-shell">

        <header className="edit-poll-header">
          <div>
            <Link
              className="edit-poll-back-link"
              to={`/admin/polls/${poll.id}`}
            >
              ← Back to Poll
            </Link>

            <div className="edit-poll-heading">
              <span className="edit-poll-eyebrow">
                POLL EDITOR
              </span>

              <h1>Edit Poll</h1>

              <p>
                Update the poll details,
                questions, options and
                visibility settings.
              </p>
            </div>
          </div>

          <div className="edit-poll-header-meta">
            <span className="edit-poll-status">
              {poll.status}
            </span>

            <span className="edit-poll-id">
              ID: {poll.id}
            </span>
          </div>
        </header>

        {error && (
          <div
            className="edit-poll-alert edit-poll-alert--error"
            role="alert"
          >
            <span className="alert-icon">
              !
            </span>

            <div>
              <strong>
                Something needs attention
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div
            className="edit-poll-alert edit-poll-alert--success"
            role="status"
          >
            <span className="alert-icon">
              ✓
            </span>

            <div>
              <strong>
                Changes saved
              </strong>

              <p>{success}</p>
            </div>
          </div>
        )}

        <form
          className="edit-poll-layout"
          onSubmit={handleSubmit}
        >

          <div className="edit-poll-main">

            <section className="editor-section">
              <div className="section-heading">
                <div>
                  <span className="section-number">
                    01
                  </span>

                  <div>
                    <h2>Poll details</h2>

                    <p>
                      The basic information
                      shown to participants.
                    </p>
                  </div>
                </div>
              </div>

              <div className="field-group">
                <label
                  htmlFor="title"
                >
                  Poll title
                  <span>*</span>
                </label>

                <input
                  id="title"
                  className="editor-input editor-input--large"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Enter poll title"
                />
              </div>

              <div className="field-group">
                <label
                  htmlFor="description"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  className="editor-textarea"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  rows={5}
                  placeholder="Describe what this poll is about..."
                />
              </div>
            </section>

            <section className="editor-section">
              <div className="section-heading">
                <div>
                  <span className="section-number">
                    02
                  </span>

                  <div>
                    <h2>Questions</h2>

                    <p>
                      Manage the questions
                      and response options
                      in this poll.
                    </p>
                  </div>
                </div>

                <span className="question-count">
                  {questions.length}{" "}
                  {questions.length === 1
                    ? "question"
                    : "questions"}
                </span>
              </div>

              <div className="questions-list">
                {questions.map(
                  (
                    question,
                    questionIndex
                  ) => (
                    <article
                      className="question-editor"
                      key={
                        question.id ||
                        question.tempId
                      }
                    >

                      <div className="question-editor-header">
                        <div className="question-number">
                          {String(
                            questionIndex +
                              1
                          ).padStart(
                            2,
                            "0"
                          )}
                        </div>

                        <div className="question-title-area">
                          <span>
                            QUESTION{" "}
                            {questionIndex +
                              1}
                          </span>

                          <h3>
                            Question editor
                          </h3>
                        </div>

                        <button
                          type="button"
                          className="remove-question-button"
                          onClick={() =>
                            removeQuestion(
                              questionIndex
                            )
                          }
                          disabled={
                            questions.length <=
                            1
                          }
                        >
                          Remove
                        </button>
                      </div>

                      <div className="question-editor-body">

                        <div className="field-group">
                          <label>
                            Question text
                            <span>*</span>
                          </label>

                          <input
                            className="editor-input"
                            type="text"
                            value={
                              question.question
                            }
                            onChange={(
                              event
                            ) =>
                              updateQuestion(
                                questionIndex,
                                "question",
                                event.target
                                  .value
                              )
                            }
                            placeholder="Enter the question..."
                          />
                        </div>

                        <div className="field-group">
                          <label>
                            Question description
                          </label>

                          <textarea
                            className="editor-textarea editor-textarea--small"
                            value={
                              question.description ||
                              ""
                            }
                            onChange={(
                              event
                            ) =>
                              updateQuestion(
                                questionIndex,
                                "description",
                                event.target
                                  .value
                              )
                            }
                            rows={3}
                            placeholder="Optional supporting information..."
                          />
                        </div>

                        <label className="toggle-row">
                          <span className="toggle">
                            <input
                              type="checkbox"
                              checked={
                                question.isRequired
                              }
                              onChange={(
                                event
                              ) =>
                                updateQuestion(
                                  questionIndex,
                                  "isRequired",
                                  event.target
                                    .checked
                                )
                              }
                            />

                            <span className="toggle-slider" />
                          </span>

                          <span>
                            <strong>
                              Required question
                            </strong>

                            <small>
                              Participants must
                              answer this question.
                            </small>
                          </span>
                        </label>

                        <div className="options-editor">
                          <div className="options-heading">
                            <div>
                              <h4>
                                Response options
                              </h4>

                              <p>
                                Add or edit the
                                choices available
                                to participants.
                              </p>
                            </div>

                            <span>
                              {
                                question.options
                                  .length
                              }{" "}
                              options
                            </span>
                          </div>

                          <div className="options-list">
                            {question.options.map(
                              (
                                option,
                                optionIndex
                              ) => (
                                <div
                                  className="option-editor"
                                  key={
                                    optionIndex
                                  }
                                >
                                  <div className="option-index">
                                    {optionIndex +
                                      1}
                                  </div>

                                  <div className="option-fields">
                                    <input
                                      className="editor-input"
                                      type="text"
                                      placeholder="Option label"
                                      value={
                                        option.label
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        updateOption(
                                          questionIndex,
                                          optionIndex,
                                          "label",
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                    />

                                    <input
                                      className="editor-input editor-input--value"
                                      type="text"
                                      placeholder="Option value"
                                      value={
                                        option.value ||
                                        ""
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        updateOption(
                                          questionIndex,
                                          optionIndex,
                                          "value",
                                          event
                                            .target
                                            .value
                                        )
                                      }
                                    />
                                  </div>

                                  <label className="option-active">
                                    <input
                                      type="checkbox"
                                      checked={
                                        option.isActive
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        updateOption(
                                          questionIndex,
                                          optionIndex,
                                          "isActive",
                                          event
                                            .target
                                            .checked
                                        )
                                      }
                                    />

                                    <span>
                                      Active
                                    </span>
                                  </label>

                                  <button
                                    type="button"
                                    className="remove-option-button"
                                    onClick={() =>
                                      removeOption(
                                        questionIndex,
                                        optionIndex
                                      )
                                    }
                                    disabled={
                                      question
                                        .options
                                        .length <=
                                      1
                                    }
                                    aria-label={`Remove option ${
                                      optionIndex +
                                      1
                                    }`}
                                  >
                                    ×
                                  </button>
                                </div>
                              )
                            )}
                          </div>

                          <button
                            type="button"
                            className="add-option-button"
                            onClick={() =>
                              addOption(
                                questionIndex
                              )
                            }
                          >
                            <span>+</span>
                            Add option
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>

              <button
                type="button"
                className="add-question-button"
                onClick={addQuestion}
              >
                <span>+</span>

                <div>
                  <strong>
                    Add another question
                  </strong>

                  <small>
                    Create a new question
                    for this poll
                  </small>
                </div>
              </button>
            </section>
          </div>

          <aside className="edit-poll-sidebar">

            <section className="sidebar-card">
              <div className="sidebar-card-heading">
                <span className="section-number">
                  03
                </span>

                <div>
                  <h2>Poll settings</h2>

                  <p>
                    Control timing and
                    visibility.
                  </p>
                </div>
              </div>

              <div className="sidebar-fields">

                <div className="field-group">
                  <label htmlFor="startsAt">
                    Start date
                  </label>

                  <input
                    id="startsAt"
                    className="editor-input"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) =>
                      setStartsAt(
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="field-group">
                  <label htmlFor="endsAt">
                    End date
                  </label>

                  <input
                    id="endsAt"
                    className="editor-input"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(event) =>
                      setEndsAt(
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="settings-divider" />

                <label className="setting-toggle">
                  <span>
                    <strong>
                      Public results
                    </strong>

                    <small>
                      Allow participants
                      to view results.
                    </small>
                  </span>

                  <span className="toggle">
                    <input
                      type="checkbox"
                      checked={
                        allowResults
                      }
                      onChange={(event) =>
                        setAllowResults(
                          event.target.checked
                        )
                      }
                    />

                    <span className="toggle-slider" />
                  </span>
                </label>

                <label className="setting-toggle">
                  <span>
                    <strong>
                      Public visibility
                    </strong>

                    <small>
                      Make this poll visible
                      on the public site.
                    </small>
                  </span>

                  <span className="toggle">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(event) =>
                        setIsPublic(
                          event.target.checked
                        )
                      }
                    />

                    <span className="toggle-slider" />
                  </span>
                </label>
              </div>
            </section>

            <section className="save-card">
              <div className="save-card-icon">
                ✓
              </div>

              <div>
                <h2>
                  Ready to save?
                </h2>

                <p>
                  Your changes will be
                  applied to this poll.
                </p>
              </div>

              <button
                type="submit"
                className="save-button"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="button-spinner" />
                    Saving changes...
                  </>
                ) : (
                  <>
                    Save changes
                    <span>→</span>
                  </>
                )}
              </button>

              <Link
                className="cancel-button"
                to={`/admin/polls/${poll.id}`}
              >
                Cancel
              </Link>
            </section>

            <div className="editor-note">
              <strong>
                Editing safely
              </strong>

              <p>
                Existing poll responses
                remain associated with
                their original questions
                and options.
              </p>
            </div>

          </aside>
        </form>
      </div>
    </main>
  );
}