import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  createPoll,
  getAdminPositions,
  getCandidates,
} from "../api/admin";

import type {
  AdminCandidate,
  AdminPosition,
  CreatePollQuestion,
  PollType,
} from "../api/admin";

import {
  getCounties,
  getConstituencies,
  getWards,
} from "../api/geography";

import type {
  County,
  Constituency,
  Ward,
} from "../api/geography";

import "./CreatePoll.css";


interface QuestionDraft
  extends CreatePollQuestion {
  tempId: string;
}


function createQuestion(): QuestionDraft {
  return {
    tempId: crypto.randomUUID(),

    question: "",

    description: "",

    isRequired: true,

    options: [
      {
        label: "",
        value: "",
        candidateId: undefined,
        isActive: true,
      },
    ],
  };
}


export default function CreatePoll() {
  const navigate = useNavigate();

  const [pollType, setPollType] =
    useState<PollType>("GENERAL");

  const [positions, setPositions] =
    useState<AdminPosition[]>([]);

  const [positionId, setPositionId] =
    useState("");

  const [counties, setCounties] =
    useState<County[]>([]);

  const [
    constituencies,
    setConstituencies,
  ] = useState<Constituency[]>([]);

  const [wards, setWards] =
    useState<Ward[]>([]);

  const [targetCountyId, setTargetCountyId] =
    useState("");

  const [
    targetConstituencyId,
    setTargetConstituencyId,
  ] = useState("");

  const [targetWardId, setTargetWardId] =
    useState("");

  const [candidates, setCandidates] =
    useState<AdminCandidate[]>([]);

  const [
    candidatesLoading,
    setCandidatesLoading,
  ] = useState(false);

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
    useState<QuestionDraft[]>([
      createQuestion(),
    ]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");


  useEffect(() => {
    async function loadInitialData() {
      try {
        const [
          positionData,
          countyData,
        ] = await Promise.all([
          getAdminPositions(),
          getCounties(),
        ]);

        setPositions(positionData);
        setCounties(countyData);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load poll data"
        );
      } finally {
        setLoading(false);
      }
    }

    loadInitialData();
  }, []);


  const selectedPosition =
    positions.find(
      (position) =>
        position.id === positionId
    );

  const positionScope =
    selectedPosition?.scope || "";


  const requiresCounty =
    pollType ===
      "POLITICAL_CAMPAIGN" &&
    (
      positionScope === "COUNTY" ||
      positionScope === "CONSTITUENCY" ||
      positionScope === "WARD"
    );


  const requiresConstituency =
    pollType ===
      "POLITICAL_CAMPAIGN" &&
    (
      positionScope === "CONSTITUENCY" ||
      positionScope === "WARD"
    );


  const requiresWard =
    pollType ===
      "POLITICAL_CAMPAIGN" &&
    positionScope === "WARD";


  useEffect(() => {
    async function loadCandidates() {
      if (
        pollType !==
          "POLITICAL_CAMPAIGN" ||
        !positionId
      ) {
        setCandidates([]);
        return;
      }

      setCandidatesLoading(true);

      try {
        const data =
          await getCandidates(
            positionId
          );

        setCandidates(data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load candidates"
        );
      } finally {
        setCandidatesLoading(false);
      }
    }

    loadCandidates();
  }, [
    pollType,
    positionId,
  ]);


  function handlePollTypeChange(
    value: PollType
  ) {
    setPollType(value);
    setError("");

    if (value === "GENERAL") {
      setPositionId("");

      setTargetCountyId("");
      setTargetConstituencyId("");
      setTargetWardId("");

      setConstituencies([]);
      setWards([]);

      setCandidates([]);

      setQuestions([
        createQuestion(),
      ]);
    }
  }


  function handlePositionChange(
    value: string
  ) {
    setPositionId(value);

    setTargetCountyId("");
    setTargetConstituencyId("");
    setTargetWardId("");

    setConstituencies([]);
    setWards([]);

    setCandidates([]);
  }


  async function handleCountyChange(
    value: string
  ) {
    setTargetCountyId(value);

    setTargetConstituencyId("");
    setTargetWardId("");

    setConstituencies([]);
    setWards([]);

    if (!value) {
      return;
    }

    try {
      const data =
        await getConstituencies(
          value
        );

      setConstituencies(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load constituencies"
      );
    }
  }


  async function handleConstituencyChange(
    value: string
  ) {
    setTargetConstituencyId(value);

    setTargetWardId("");
    setWards([]);

    if (!value) {
      return;
    }

    try {
      const data =
        await getWards(value);

      setWards(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load wards"
      );
    }
  }


  const visibleCandidates =
    candidates.filter(
      (candidate) => {
        if (targetWardId) {
          return (
            !candidate.wardId ||
            candidate.wardId ===
              targetWardId
          );
        }

        if (targetConstituencyId) {
          return (
            !candidate.constituencyId ||
            candidate.constituencyId ===
              targetConstituencyId
          );
        }

        if (targetCountyId) {
          return (
            !candidate.countyId ||
            candidate.countyId ===
              targetCountyId
          );
        }

        return true;
      }
    );


  function updateQuestion(
    questionIndex: number,
    field: keyof QuestionDraft,
    value: unknown
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
    field: string,
    value: string
  ) {
    setQuestions(
      (current) =>
        current.map(
          (question, qIndex) => {
            if (
              qIndex !== questionIndex
            ) {
              return question;
            }

            return {
              ...question,

              options:
                question.options.map(
                  (
                    option,
                    oIndex
                  ) =>
                    oIndex ===
                    optionIndex
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


  function updateCandidateOption(
    questionIndex: number,
    optionIndex: number,
    candidateId: string
  ) {
    const candidate =
      visibleCandidates.find(
        (item) =>
          item.id === candidateId
      );

    if (!candidate) {
      return;
    }

    setQuestions(
      (current) =>
        current.map(
          (question, qIndex) => {
            if (
              qIndex !== questionIndex
            ) {
              return question;
            }

            return {
              ...question,

              options:
                question.options.map(
                  (
                    option,
                    oIndex
                  ) =>
                    oIndex ===
                    optionIndex
                      ? {
                          ...option,

                          label:
                            candidate.name,

                          value:
                            candidate.id,

                          candidateId:
                            candidate.id,
                        }
                      : option
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
        createQuestion(),
      ]
    );
  }


  function removeQuestion(
    index: number
  ) {
    if (questions.length === 1) {
      return;
    }

    setQuestions(
      (current) =>
        current.filter(
          (_, i) => i !== index
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
          (question, index) =>
            index === questionIndex
              ? {
                  ...question,

                  options:
                    question.options.filter(
                      (_, i) =>
                        i !== optionIndex
                    ),
                }
              : question
        )
    );
  }


  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (!title.trim()) {
      setError(
        "Poll title is required"
      );
      return;
    }

    if (
      pollType ===
      "POLITICAL_CAMPAIGN"
    ) {
      if (!positionId) {
        setError(
          "Please select a political position"
        );
        return;
      }

      if (
        requiresCounty &&
        !targetCountyId
      ) {
        setError(
          "Please select the target county"
        );
        return;
      }

      if (
        requiresConstituency &&
        !targetConstituencyId
      ) {
        setError(
          "Please select the target constituency"
        );
        return;
      }

      if (
        requiresWard &&
        !targetWardId
      ) {
        setError(
          "Please select the target ward"
        );
        return;
      }
    }

    if (
      startsAt &&
      endsAt &&
      new Date(startsAt) >=
        new Date(endsAt)
    ) {
      setError(
        "End date must be after start date"
      );
      return;
    }

    for (
      let i = 0;
      i < questions.length;
      i++
    ) {
      const question =
        questions[i];

      if (
        !question.question.trim()
      ) {
        setError(
          `Question ${i + 1} is required`
        );
        return;
      }

      if (
        question.options.length ===
        0
      ) {
        setError(
          `Question ${i + 1} needs at least one option`
        );
        return;
      }

      for (
        let j = 0;
        j < question.options.length;
        j++
      ) {
        const option =
          question.options[j];

        if (!option.label.trim()) {
          setError(
            `Option ${j + 1} in question ${i + 1} is required`
          );
          return;
        }

        if (
          pollType ===
            "POLITICAL_CAMPAIGN" &&
          !option.candidateId
        ) {
          setError(
            `Select a candidate for option ${j + 1} in question ${i + 1}`
          );
          return;
        }
      }
    }

    setSaving(true);

    try {
      const created =
        await createPoll({
          title:
            title.trim(),

          description:
            description.trim(),

          pollType,

          positionId:
            positionId ||
            undefined,

          targetCountyId:
            targetCountyId ||
            undefined,

          targetConstituencyId:
            targetConstituencyId ||
            undefined,

          targetWardId:
            targetWardId ||
            undefined,

          startsAt:
            startsAt ||
            undefined,

          endsAt:
            endsAt ||
            undefined,

          allowResults,

          isPublic,

          questions:
            questions.map(
              (question) => ({
                question:
                  question.question.trim(),

                description:
                  question.description
                    ?.trim() ||
                  undefined,

                isRequired:
                  question.isRequired,

                options:
                  question.options.map(
                    (option) => ({
                      label:
                        option.label.trim(),

                      value:
                        option.value
                          ?.trim() ||
                        undefined,

                      candidateId:
                        option.candidateId ||
                        undefined,

                      isActive: true,
                    })
                  ),
              })
            ),
        });

      navigate(
        `/admin/polls/${created.id}`
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to create poll"
      );
    } finally {
      setSaving(false);
    }
  }


  if (loading) {
    return (
      <main className="admin-create-page">
        <div className="admin-create-loading">
          <div className="admin-loading-line" />
          <p>
            Loading poll builder...
          </p>
        </div>
      </main>
    );
  }


  return (
    <main className="admin-create-page">

      <div className="admin-create-shell">

        {/* HEADER */}

        <header className="admin-create-header">

          <div>
            <Link
              to="/admin/polls"
              className="admin-back-link"
            >
              <span>←</span>
              Poll Management
            </Link>

            <div className="admin-create-eyebrow">
              POLL BUILDER
            </div>

            <h1>
              Create a new poll
            </h1>

            <p>
              Build and configure a poll
              before making it available
              to participants.
            </p>
          </div>

          <div className="admin-create-header-meta">
            <span
              className={
                pollType ===
                "POLITICAL_CAMPAIGN"
                  ? "admin-type-badge admin-type-badge--political"
                  : "admin-type-badge"
              }
            >
              {pollType ===
              "POLITICAL_CAMPAIGN"
                ? "Political / Campaign"
                : "General Opinion"}
            </span>
          </div>

        </header>


        {/* ERROR */}

        {error && (
          <div className="admin-form-error">
            <div className="admin-form-error__icon">
              !
            </div>

            <div>
              <strong>
                Unable to continue
              </strong>

              <p>
                {error}
              </p>
            </div>
          </div>
        )}


        <form
          onSubmit={handleSubmit}
          className="admin-create-layout"
        >

          <div className="admin-create-main">

            {/* POLL TYPE */}

            <section className="admin-builder-section">

              <div className="admin-section-heading">
                <div>
                  <span className="admin-section-number">
                    01
                  </span>

                  <div>
                    <h2>
                      Poll type
                    </h2>

                    <p>
                      Choose what kind of
                      poll you are creating.
                    </p>
                  </div>
                </div>
              </div>


              <div className="poll-type-grid">

                <label
                  className={`poll-type-card ${
                    pollType ===
                    "GENERAL"
                      ? "poll-type-card--selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="pollType"
                    value="GENERAL"
                    checked={
                      pollType ===
                      "GENERAL"
                    }
                    onChange={() =>
                      handlePollTypeChange(
                        "GENERAL"
                      )
                    }
                  />

                  <span className="poll-type-card__radio" />

                  <span>
                    <strong>
                      General opinion
                    </strong>

                    <small>
                      Public questions,
                      community feedback
                      and research-oriented
                      polls.
                    </small>
                  </span>
                </label>


                <label
                  className={`poll-type-card ${
                    pollType ===
                    "POLITICAL_CAMPAIGN"
                      ? "poll-type-card--selected"
                      : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="pollType"
                    value="POLITICAL_CAMPAIGN"
                    checked={
                      pollType ===
                      "POLITICAL_CAMPAIGN"
                    }
                    onChange={() =>
                      handlePollTypeChange(
                        "POLITICAL_CAMPAIGN"
                      )
                    }
                  />

                  <span className="poll-type-card__radio" />

                  <span>
                    <strong>
                      Political / campaign
                    </strong>

                    <small>
                      Position-based polling
                      connected to candidates
                      and geographic targeting.
                    </small>
                  </span>
                </label>

              </div>

            </section>


            {/* DETAILS */}

            <section className="admin-builder-section">

              <div className="admin-section-heading">
                <div>
                  <span className="admin-section-number">
                    02
                  </span>

                  <div>
                    <h2>
                      Poll details
                    </h2>

                    <p>
                      Give participants
                      enough context to
                      understand the poll.
                    </p>
                  </div>
                </div>
              </div>


              <div className="admin-field">

                <label htmlFor="poll-title">
                  Poll title
                </label>

                <input
                  id="poll-title"
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder={
                    pollType ===
                    "POLITICAL_CAMPAIGN"
                      ? "e.g. County Governor Opinion Poll"
                      : "e.g. Public Transport Satisfaction Poll"
                  }
                  required
                />

              </div>


              <div className="admin-field">

                <label htmlFor="poll-description">
                  Description
                </label>

                <textarea
                  id="poll-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value
                    )
                  }
                  placeholder="Describe the purpose of this poll"
                  rows={5}
                />

                <span className="admin-field-help">
                  Keep this short and clear.
                  It will help participants
                  understand what they are
                  responding to.
                </span>

              </div>

            </section>


            {/* POLITICAL CONFIG */}

            {pollType ===
              "POLITICAL_CAMPAIGN" && (
              <section className="admin-builder-section">

                <div className="admin-section-heading">
                  <div>
                    <span className="admin-section-number">
                      03
                    </span>

                    <div>
                      <h2>
                        Political configuration
                      </h2>

                      <p>
                        Connect the poll to a
                        position and, where
                        required, a target
                        geography.
                      </p>
                    </div>
                  </div>
                </div>


                <div className="admin-field">

                  <label htmlFor="position">
                    Political position
                  </label>

                  <select
                    id="position"
                    value={positionId}
                    onChange={(event) =>
                      handlePositionChange(
                        event.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      Select position
                    </option>

                    {positions.map(
                      (position) => (
                        <option
                          key={position.id}
                          value={position.id}
                        >
                          {position.name}
                        </option>
                      )
                    )}
                  </select>

                </div>


                {positionId && (
                  <div className="position-scope-note">
                    <span>
                      Position scope
                    </span>

                    <strong>
                      {positionScope}
                    </strong>
                  </div>
                )}


                {positionId && (
                  <div className="geography-grid">

                    {requiresCounty && (
                      <div className="admin-field">

                        <label htmlFor="county">
                          Target county
                        </label>

                        <select
                          id="county"
                          value={
                            targetCountyId
                          }
                          onChange={(event) =>
                            handleCountyChange(
                              event.target.value
                            )
                          }
                          required
                        >
                          <option value="">
                            Select county
                          </option>

                          {counties.map(
                            (county) => (
                              <option
                                key={county.id}
                                value={county.id}
                              >
                                {county.name}
                              </option>
                            )
                          )}
                        </select>

                      </div>
                    )}


                    {requiresConstituency && (
                      <div className="admin-field">

                        <label htmlFor="constituency">
                          Target constituency
                        </label>

                        <select
                          id="constituency"
                          value={
                            targetConstituencyId
                          }
                          onChange={(event) =>
                            handleConstituencyChange(
                              event.target.value
                            )
                          }
                          required
                        >
                          <option value="">
                            Select constituency
                          </option>

                          {constituencies.map(
                            (
                              constituency
                            ) => (
                              <option
                                key={
                                  constituency.id
                                }
                                value={
                                  constituency.id
                                }
                              >
                                {
                                  constituency.name
                                }
                              </option>
                            )
                          )}
                        </select>

                      </div>
                    )}


                    {requiresWard && (
                      <div className="admin-field">

                        <label htmlFor="ward">
                          Target ward
                        </label>

                        <select
                          id="ward"
                          value={targetWardId}
                          onChange={(event) =>
                            setTargetWardId(
                              event.target.value
                            )
                          }
                          required
                        >
                          <option value="">
                            Select ward
                          </option>

                          {wards.map(
                            (ward) => (
                              <option
                                key={ward.id}
                                value={ward.id}
                              >
                                {ward.name}
                              </option>
                            )
                          )}
                        </select>

                      </div>
                    )}

                  </div>
                )}

              </section>
            )}


            {/* QUESTIONS */}

            <section className="admin-builder-section">

              <div className="admin-section-heading">
                <div>
                  <span className="admin-section-number">
                    {pollType ===
                    "POLITICAL_CAMPAIGN"
                      ? "04"
                      : "03"}
                  </span>

                  <div>
                    <h2>
                      Questions
                    </h2>

                    <p>
                      Build the questions
                      participants will answer.
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


              {pollType ===
                "POLITICAL_CAMPAIGN" && (
                <div className="admin-info-note">
                  <strong>
                    Candidate-linked options
                  </strong>

                  <span>
                    Each option in a political
                    poll must be connected to
                    a registered candidate.
                  </span>
                </div>
              )}


              <div className="questions-stack">

                {questions.map(
                  (
                    question,
                    questionIndex
                  ) => (
                    <article
                      key={question.tempId}
                      className="question-builder-card"
                    >

                      <div className="question-builder-header">

                        <div className="question-index">
                          {String(
                            questionIndex + 1
                          ).padStart(2, "0")}
                        </div>

                        <div>
                          <span>
                            QUESTION
                          </span>

                          <h3>
                            Question{" "}
                            {questionIndex + 1}
                          </h3>
                        </div>

                        {questions.length >
                          1 && (
                          <button
                            type="button"
                            className="danger-text-button"
                            onClick={() =>
                              removeQuestion(
                                questionIndex
                              )
                            }
                          >
                            Remove
                          </button>
                        )}

                      </div>


                      <div className="question-builder-body">

                        <div className="admin-field">

                          <label>
                            Question text
                          </label>

                          <input
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
                                event.target.value
                              )
                            }
                            placeholder={
                              pollType ===
                              "POLITICAL_CAMPAIGN"
                                ? "e.g. Who would you currently support?"
                                : "Enter the question"
                            }
                            required
                          />

                        </div>


                        <div className="admin-field">

                          <label>
                            Description
                            <span>
                              Optional
                            </span>
                          </label>

                          <textarea
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
                                event.target.value
                              )
                            }
                            placeholder="Add additional context for participants"
                            rows={3}
                          />

                        </div>


                        <label className="checkbox-row">

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
                                event.target.checked
                              )
                            }
                          />

                          <span>
                            <strong>
                              Required question
                            </strong>

                            <small>
                              Participants must
                              answer this question
                              before submitting.
                            </small>
                          </span>

                        </label>


                        <div className="options-header">

                          <div>
                            <h4>
                              Response options
                            </h4>

                            <p>
                              Add the choices
                              participants can select.
                            </p>
                          </div>

                          <span>
                            {question.options.length}
                            {" "}
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
                                key={
                                  optionIndex
                                }
                                className="option-row"
                              >

                                <div className="option-number">
                                  {optionIndex + 1}
                                </div>


                                <div className="option-control">

                                  {pollType ===
                                  "POLITICAL_CAMPAIGN" ? (
                                    <>

                                      <select
                                        value={
                                          option.candidateId ||
                                          ""
                                        }
                                        onChange={(
                                          event
                                        ) =>
                                          updateCandidateOption(
                                            questionIndex,
                                            optionIndex,
                                            event.target.value
                                          )
                                        }
                                        required
                                      >
                                        <option value="">
                                          {candidatesLoading
                                            ? "Loading candidates..."
                                            : "Select candidate"}
                                        </option>

                                        {!candidatesLoading &&
                                          visibleCandidates.map(
                                            (
                                              candidate
                                            ) => (
                                              <option
                                                key={
                                                  candidate.id
                                                }
                                                value={
                                                  candidate.id
                                                }
                                              >
                                                {
                                                  candidate.name
                                                }

                                                {candidate.party
                                                  ? ` — ${candidate.party}`
                                                  : ""}
                                              </option>
                                            )
                                          )}
                                      </select>

                                      {option.candidateId && (
                                        <small className="selected-option">
                                          Selected:{" "}
                                          <strong>
                                            {
                                              option.label
                                            }
                                          </strong>
                                        </small>
                                      )}

                                    </>
                                  ) : (
                                    <input
                                      type="text"
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
                                          event.target.value
                                        )
                                      }
                                      placeholder={`Option ${
                                        optionIndex + 1
                                      }`}
                                      required
                                    />
                                  )}

                                </div>


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
                                    question.options
                                      .length === 1
                                  }
                                  aria-label={`Remove option ${
                                    optionIndex + 1
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
                          className="secondary-action"
                          onClick={() =>
                            addOption(
                              questionIndex
                            )
                          }
                        >
                          <span>+</span>
                          Add response option
                        </button>

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
                    Continue building this poll
                  </small>
                </div>

                <span className="add-question-arrow">
                  →
                </span>
              </button>

            </section>


            {/* SETTINGS */}

            <section className="admin-builder-section">

              <div className="admin-section-heading">
                <div>
                  <span className="admin-section-number">
                    {pollType ===
                    "POLITICAL_CAMPAIGN"
                      ? "05"
                      : "04"}
                  </span>

                  <div>
                    <h2>
                      Poll settings
                    </h2>

                    <p>
                      Control availability
                      and public visibility.
                    </p>
                  </div>
                </div>
              </div>


              <div className="settings-grid">

                <div className="admin-field">

                  <label htmlFor="starts-at">
                    Start date
                  </label>

                  <input
                    id="starts-at"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(event) =>
                      setStartsAt(
                        event.target.value
                      )
                    }
                  />

                </div>


                <div className="admin-field">

                  <label htmlFor="ends-at">
                    End date
                  </label>

                  <input
                    id="ends-at"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(event) =>
                      setEndsAt(
                        event.target.value
                      )
                    }
                  />

                </div>

              </div>


              <div className="settings-options">

                <label className="setting-toggle">

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

                  <span className="toggle-ui" />

                  <span>
                    <strong>
                      Allow public results
                    </strong>

                    <small>
                      Let participants view
                      the available poll
                      results.
                    </small>
                  </span>

                </label>


                <label className="setting-toggle">

                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(event) =>
                      setIsPublic(
                        event.target.checked
                      )
                    }
                  />

                  <span className="toggle-ui" />

                  <span>
                    <strong>
                      Make poll publicly visible
                    </strong>

                    <small>
                      Allow this poll to
                      appear on the public
                      SFD Insights platform.
                    </small>
                  </span>

                </label>

              </div>

            </section>

          </div>


          {/* SIDE SUMMARY */}

          <aside className="admin-create-sidebar">

            <div className="builder-summary">

              <div className="builder-summary__top">
                <span>
                  POLL SUMMARY
                </span>

                <div className="summary-status-dot" />
              </div>


              <div className="builder-summary__title">
                {title.trim()
                  ? title
                  : "Untitled poll"}
              </div>


              <div className="builder-summary__type">
                {pollType ===
                "POLITICAL_CAMPAIGN"
                  ? "Political / Campaign"
                  : "General Opinion"}
              </div>


              <div className="summary-divider" />


              <div className="summary-row">
                <span>
                  Questions
                </span>

                <strong>
                  {questions.length}
                </strong>
              </div>


              <div className="summary-row">
                <span>
                  Visibility
                </span>

                <strong>
                  {isPublic
                    ? "Public"
                    : "Private"}
                </strong>
              </div>


              <div className="summary-row">
                <span>
                  Results
                </span>

                <strong>
                  {allowResults
                    ? "Visible"
                    : "Hidden"}
                </strong>
              </div>


              {selectedPosition && (
                <>
                  <div className="summary-divider" />

                  <div className="summary-label">
                    POSITION
                  </div>

                  <div className="summary-value">
                    {
                      selectedPosition.name
                    }
                  </div>
                </>
              )}


              {(targetCountyId ||
                targetConstituencyId ||
                targetWardId) && (
                <>
                  <div className="summary-label">
                    TARGET
                  </div>

                  <div className="summary-value">
                    {targetWardId
                      ? wards.find(
                          (ward) =>
                            ward.id ===
                            targetWardId
                        )?.name
                      : targetConstituencyId
                        ? constituencies.find(
                            (
                              constituency
                            ) =>
                              constituency.id ===
                              targetConstituencyId
                          )?.name
                        : counties.find(
                            (county) =>
                              county.id ===
                              targetCountyId
                          )?.name}
                  </div>
                </>
              )}

            </div>


            <div className="builder-help">

              <span className="builder-help__label">
                BEFORE CREATING
              </span>

              <ul>
                <li>
                  Check the poll title
                  and description.
                </li>

                <li>
                  Make sure every question
                  has its required options.
                </li>

                {pollType ===
                  "POLITICAL_CAMPAIGN" && (
                  <li>
                    Confirm each option
                    is linked to the
                    correct candidate.
                  </li>
                )}

                <li>
                  Review visibility and
                  result settings.
                </li>
              </ul>

            </div>

          </aside>

        </form>


        {/* ACTION BAR */}

        <div className="admin-create-actions">

          <Link
            to="/admin/polls"
            className="cancel-create-button"
          >
            Cancel
          </Link>

          <button
            type="submit"
            form=""
            disabled={saving}
            className="create-poll-submit"
            onClick={() => {
              const form =
                document.querySelector(
                  ".admin-create-layout"
                ) as HTMLFormElement | null;

              form?.requestSubmit();
            }}
          >
            {saving
              ? "Creating poll..."
              : "Create poll"}

            {!saving && (
              <span>
                →
              </span>
            )}
          </button>

        </div>

      </div>

    </main>
  );
}