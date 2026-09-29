import {
  useEffect,
  useState,
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

interface QuestionDraft
  extends CreatePollQuestion {
  tempId: string;
}

function createQuestion(): QuestionDraft {
  return {
    tempId:
      crypto.randomUUID(),

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
  const navigate =
    useNavigate();

  /*
   * Poll type
   */

  const [pollType, setPollType] =
    useState<PollType>("GENERAL");

  /*
   * Political positions
   */

  const [positions, setPositions] =
    useState<AdminPosition[]>([]);

  const [positionId, setPositionId] =
    useState("");

  /*
   * Geography
   */

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

  /*
   * Candidates
   */

  const [candidates, setCandidates] =
    useState<AdminCandidate[]>([]);

  const [
    candidatesLoading,
    setCandidatesLoading,
  ] = useState(false);

  /*
   * Poll details
   */

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

  /*
   * Questions
   */

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

  /*
   * Load positions and counties.
   */

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

        setPositions(
          positionData
        );

        setCounties(
          countyData
        );
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

  /*
   * Position scope.
   */

  const selectedPosition =
    positions.find(
      (position) =>
        position.id ===
        positionId
    );

  const positionScope =
    selectedPosition?.scope || "";

  const requiresCounty =
    pollType ===
      "POLITICAL_CAMPAIGN" &&
    (
      positionScope ===
        "COUNTY" ||
      positionScope ===
        "CONSTITUENCY" ||
      positionScope ===
        "WARD"
    );

  const requiresConstituency =
    pollType ===
      "POLITICAL_CAMPAIGN" &&
    (
      positionScope ===
        "CONSTITUENCY" ||
      positionScope ===
        "WARD"
    );

  const requiresWard =
    pollType ===
      "POLITICAL_CAMPAIGN" &&
    positionScope ===
      "WARD";

  /*
   * Load candidates whenever the
   * political position changes.
   */

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
        setCandidatesLoading(
          false
        );
      }
    }

    loadCandidates();
  }, [
    pollType,
    positionId,
  ]);

  /*
   * Reset political fields when
   * switching back to general.
   */

  function handlePollTypeChange(
    value: PollType
  ) {
    setPollType(value);

    setError("");

    if (
      value === "GENERAL"
    ) {
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

  /*
   * Position change.
   */

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

  /*
   * County change.
   */

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

  /*
   * Constituency change.
   */

  async function handleConstituencyChange(
    value: string
  ) {
    setTargetConstituencyId(
      value
    );

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

  /*
   * Filter candidates according
   * to the selected geography.
   *
   * Candidates without geographic
   * assignment remain available at
   * the relevant position level.
   */

  const visibleCandidates =
    candidates.filter(
      (candidate) => {
        if (
          targetWardId
        ) {
          return (
            !candidate.wardId ||
            candidate.wardId ===
              targetWardId
          );
        }

        if (
          targetConstituencyId
        ) {
          return (
            !candidate.constituencyId ||
            candidate.constituencyId ===
              targetConstituencyId
          );
        }

        if (
          targetCountyId
        ) {
          return (
            !candidate.countyId ||
            candidate.countyId ===
              targetCountyId
          );
        }

        return true;
      }
    );

  /*
   * Question helpers.
   */

  function updateQuestion(
    questionIndex: number,
    field: keyof QuestionDraft,
    value: unknown
  ) {
    setQuestions(
      (current) =>
        current.map(
          (
            question,
            index
          ) =>
            index ===
            questionIndex
              ? {
                  ...question,
                  [field]:
                    value,
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
          (
            question,
            qIndex
          ) => {
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
                  (
                    option,
                    oIndex
                  ) =>
                    oIndex ===
                    optionIndex
                      ? {
                          ...option,
                          [field]:
                            value,
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
          item.id ===
          candidateId
      );

    if (!candidate) {
      return;
    }

    setQuestions(
      (current) =>
        current.map(
          (
            question,
            qIndex
          ) => {
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
    if (
      questions.length === 1
    ) {
      return;
    }

    setQuestions(
      (current) =>
        current.filter(
          (_, i) =>
            i !== index
        )
    );
  }

  function addOption(
    questionIndex: number
  ) {
    setQuestions(
      (current) =>
        current.map(
          (
            question,
            index
          ) =>
            index ===
            questionIndex
              ? {
                  ...question,

                  options: [
                    ...question.options,

                    {
                      label: "",
                      value: "",
                      candidateId:
                        undefined,
                      isActive:
                        true,
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
          (
            question,
            index
          ) =>
            index ===
            questionIndex
              ? {
                  ...question,

                  options:
                    question.options.filter(
                      (_, i) =>
                        i !==
                        optionIndex
                    ),
                }
              : question
        )
    );
  }

  /*
   * Submit.
   */

  async function handleSubmit(
    event: React.FormEvent
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
          `Question ${
            i + 1
          } is required`
        );

        return;
      }

      if (
        question.options.length ===
        0
      ) {
        setError(
          `Question ${
            i + 1
          } needs at least one option`
        );

        return;
      }

      for (
        let j = 0;
        j <
        question.options.length;
        j++
      ) {
        const option =
          question.options[j];

        if (
          !option.label.trim()
        ) {
          setError(
            `Option ${
              j + 1
            } in question ${
              i + 1
            } is required`
          );

          return;
        }

        if (
          pollType ===
            "POLITICAL_CAMPAIGN" &&
          !option.candidateId
        ) {
          setError(
            `Select a candidate for option ${
              j + 1
            } in question ${
              i + 1
            }`
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
                    (
                      option
                    ) => ({
                      label:
                        option.label.trim(),

                      value:
                        option.value
                          ?.trim() ||
                        undefined,

                      candidateId:
                        option.candidateId ||
                        undefined,

                      isActive:
                        true,
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
      <main>
        <p>
          Loading...
        </p>
      </main>
    );
  }

  return (
    <main>
      <Link to="/admin/polls">
        ← Poll Management
      </Link>

      <h1>
        Create New Poll
      </h1>

      <p>
        Create a general public
        opinion poll or a
        political/campaign poll.
      </p>

      {error && (
        <p>
          <strong>
            Error:
          </strong>{" "}
          {error}
        </p>
      )}

      <form
        onSubmit={
          handleSubmit
        }
      >
        <section>
          <h2>
            Poll Type
          </h2>

          <label>
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

            {" "}
            General Opinion
          </label>

          <br />

          <label>
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

            {" "}
            Political / Campaign
          </label>
        </section>

        <hr />

        <section>
          <h2>
            Poll Details
          </h2>

          <div>
            <label>
              Poll Title
            </label>

            <br />

            <input
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

          <br />

          <div>
            <label>
              Description
            </label>

            <br />

            <textarea
              value={
                description
              }
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="Describe the purpose of this poll"
              rows={4}
            />
          </div>
        </section>

        {pollType ===
          "POLITICAL_CAMPAIGN" && (
          <>
            <hr />

            <section>
              <h2>
                Political Poll
                Configuration
              </h2>

              <div>
                <label>
                  Position
                </label>

                <br />

                <select
                  value={
                    positionId
                  }
                  onChange={(
                    event
                  ) =>
                    handlePositionChange(
                      event.target
                        .value
                    )
                  }
                  required
                >
                  <option value="">
                    Select position
                  </option>

                  {positions.map(
                    (
                      position
                    ) => (
                      <option
                        key={
                          position.id
                        }
                        value={
                          position.id
                        }
                      >
                        {
                          position.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {positionId && (
                <>
                  <p>
                    Position scope:{" "}
                    <strong>
                      {
                        positionScope
                      }
                    </strong>
                  </p>

                  {requiresCounty && (
                    <>
                      <label>
                        Target County *
                      </label>

                      <br />

                      <select
                        value={
                          targetCountyId
                        }
                        onChange={(
                          event
                        ) =>
                          handleCountyChange(
                            event
                              .target
                              .value
                          )
                        }
                        required
                      >
                        <option value="">
                          Select county
                        </option>

                        {counties.map(
                          (
                            county
                          ) => (
                            <option
                              key={
                                county.id
                              }
                              value={
                                county.id
                              }
                            >
                              {
                                county.name
                              }
                            </option>
                          )
                        )}
                      </select>

                      <br />
                      <br />
                    </>
                  )}

                  {requiresConstituency && (
                    <>
                      <label>
                        Target
                        Constituency *
                      </label>

                      <br />

                      <select
                        value={
                          targetConstituencyId
                        }
                        onChange={(
                          event
                        ) =>
                          handleConstituencyChange(
                            event
                              .target
                              .value
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

                      <br />
                      <br />
                    </>
                  )}

                  {requiresWard && (
                    <>
                      <label>
                        Target Ward *
                      </label>

                      <br />

                      <select
                        value={
                          targetWardId
                        }
                        onChange={(
                          event
                        ) =>
                          setTargetWardId(
                            event
                              .target
                              .value
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
                              key={
                                ward.id
                              }
                              value={
                                ward.id
                              }
                            >
                              {
                                ward.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </>
                  )}
                </>
              )}
            </section>
          </>
        )}

        <hr />

        <section>
          <h2>
            Questions
          </h2>

          {pollType ===
            "POLITICAL_CAMPAIGN" && (
            <p>
              For political/campaign
              polls, each option is
              linked to a candidate
              already registered in
              the system.
            </p>
          )}

          {questions.map(
            (
              question,
              questionIndex
            ) => (
              <article
                key={
                  question.tempId
                }
                style={{
                  border:
                    "1px solid #ddd",
                  padding:
                    "20px",
                  marginBottom:
                    "20px",
                }}
              >
                <h3>
                  Question{" "}
                  {questionIndex +
                    1}
                </h3>

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
                      event.target
                        .value
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

                <br />
                <br />

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
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional question description"
                  rows={3}
                />

                <br />
                <br />

                <label>
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

                  {" "}
                  Required question
                </label>

                <h4>
                  Options
                </h4>

                {question.options.map(
                  (
                    option,
                    optionIndex
                  ) => (
                    <div
                      key={
                        optionIndex
                      }
                      style={{
                        marginBottom:
                          "15px",
                      }}
                    >
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
                                event
                                  .target
                                  .value
                              )
                            }
                            required
                          >
                            <option value="">
                              Select candidate
                            </option>

                            {candidatesLoading ? (
                              <option
                                disabled
                              >
                                Loading
                                candidates...
                              </option>
                            ) : (
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
                              )
                            )}
                          </select>

                          {option.candidateId && (
                            <p>
                              Selected:{" "}
                              <strong>
                                {
                                  option.label
                                }
                              </strong>
                            </p>
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
                              event
                                .target
                                .value
                            )
                          }
                          placeholder={`Option ${
                            optionIndex +
                            1
                          }`}
                          required
                        />
                      )}

                      {" "}

                      <button
                        type="button"
                        onClick={() =>
                          removeOption(
                            questionIndex,
                            optionIndex
                          )
                        }
                        disabled={
                          question
                            .options
                            .length ===
                          1
                        }
                      >
                        Remove
                      </button>
                    </div>
                  )
                )}

                <button
                  type="button"
                  onClick={() =>
                    addOption(
                      questionIndex
                    )
                  }
                >
                  + Add Option
                </button>

                {" "}

                <button
                  type="button"
                  onClick={() =>
                    removeQuestion(
                      questionIndex
                    )
                  }
                  disabled={
                    questions.length ===
                    1
                  }
                >
                  Remove Question
                </button>
              </article>
            )
          )}

          <button
            type="button"
            onClick={
              addQuestion
            }
          >
            + Add Question
          </button>
        </section>

        <hr />

        <section>
          <h2>
            Poll Settings
          </h2>

          <div>
            <label>
              Start Date
            </label>

            <br />

            <input
              type="datetime-local"
              value={startsAt}
              onChange={(event) =>
                setStartsAt(
                  event.target.value
                )
              }
            />
          </div>

          <br />

          <div>
            <label>
              End Date
            </label>

            <br />

            <input
              type="datetime-local"
              value={endsAt}
              onChange={(event) =>
                setEndsAt(
                  event.target.value
                )
              }
            />
          </div>

          <br />

          <label>
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

            {" "}
            Allow public results
          </label>

          <br />

          <label>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) =>
                setIsPublic(
                  event.target.checked
                )
              }
            />

            {" "}
            Make poll publicly visible
          </label>
        </section>

        <hr />

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Creating Poll..."
            : "Create Poll"}
        </button>
      </form>
    </main>
  );
}