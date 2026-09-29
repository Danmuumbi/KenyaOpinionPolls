import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  getPublicHome,
  getQuickVotes,
  submitPollResponses,
} from "../api/public";

import type {
  PublicPoll,
  PublicPosition,
  QuickVote,
  QuickVoteCandidate,
} from "../api/public";

import LocationSelector from "../components/LocationSelector";

export default function Home() {
  /* ================================================================
     EXISTING HOME DATA
  ================================================================= */

  const [positions, setPositions] =
    useState<PublicPosition[]>([]);

  const [generalPolls, setGeneralPolls] =
    useState<PublicPoll[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* ================================================================
     USER LOCATION

     County → Constituency → Ward
  ================================================================= */

  const [location, setLocation] =
    useState({
      countyId: "",
      constituencyId: "",
      wardId: "",
    });

  /* ================================================================
     QUICK VOTE DATA
  ================================================================= */

  const [quickVotes, setQuickVotes] =
    useState<QuickVote[]>([]);

  const [quickVoteLoading, setQuickVoteLoading] =
    useState(false);

  const [quickVoteError, setQuickVoteError] =
    useState("");

  /* ================================================================
     CURRENT QUICK VOTE
  ================================================================= */

  const [selectedQuickVote, setSelectedQuickVote] =
    useState<QuickVote | null>(null);

  const [selectedCandidate, setSelectedCandidate] =
    useState<QuickVoteCandidate | null>(null);

  /* ================================================================
     SUBMISSION
  ================================================================= */

  const [submittingVote, setSubmittingVote] =
    useState(false);

  const [voteSubmitted, setVoteSubmitted] =
    useState(false);

  /* ================================================================
     LOAD EXISTING HOME DATA
  ================================================================= */

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data =
          await getPublicHome();

        if (cancelled) {
          return;
        }

        setPositions(data.positions);
        setGeneralPolls(data.generalPolls);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setError(
          error instanceof Error
            ? error.message
            : "Failed to load polls"
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ================================================================
     LOAD AREA QUICK VOTES

     This functionality already existed and is kept.
  ================================================================= */

  useEffect(() => {
    let cancelled = false;

    async function loadAreaPolls() {
      if (
        !location.countyId ||
        !location.constituencyId ||
        !location.wardId
      ) {
        setQuickVotes([]);
        setQuickVoteError("");
        setQuickVoteLoading(false);
        return;
      }

      setQuickVoteLoading(true);
      setQuickVoteError("");

      try {
        const data =
          await getQuickVotes({
            countyId:
              location.countyId,

            constituencyId:
              location.constituencyId,

            wardId:
              location.wardId,
          });

        if (cancelled) {
          return;
        }

        setQuickVotes(data);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setQuickVoteError(
          error instanceof Error
            ? error.message
            : "Failed to load polls for your area"
        );

        setQuickVotes([]);
      } finally {
        if (!cancelled) {
          setQuickVoteLoading(false);
        }
      }
    }

    loadAreaPolls();

    return () => {
      cancelled = true;
    };
  }, [
    location.countyId,
    location.constituencyId,
    location.wardId,
  ]);

  /* ================================================================
     QUICK VOTE POSITIONS

     Multiple polls may exist for the same position.
     We show one quick-vote entry per position.
  ================================================================= */

  const quickVotePositions =
    useMemo(() => {
      const positionMap =
        new Map<string, QuickVote>();

      for (const vote of quickVotes) {
        if (
          !positionMap.has(
            vote.position.id
          )
        ) {
          positionMap.set(
            vote.position.id,
            vote
          );
        }
      }

      return Array.from(
        positionMap.values()
      );
    }, [quickVotes]);

  /* ================================================================
     COMPLETE LOCATION
  ================================================================= */

  const hasCompleteLocation =
    Boolean(
      location.countyId &&
      location.constituencyId &&
      location.wardId
    );

  /* ================================================================
     LOCATION CHANGE
  ================================================================= */

  function handleLocationChange(
    context: {
      countyId: string;
      constituencyId: string;
      wardId: string;
    }
  ) {
    setLocation(context);

    setSelectedQuickVote(null);
    setSelectedCandidate(null);
    setVoteSubmitted(false);
    setQuickVoteError("");
  }

  /* ================================================================
     SELECT QUICK VOTE
  ================================================================= */

  function selectQuickVote(
    vote: QuickVote
  ) {
    setSelectedQuickVote(vote);
    setSelectedCandidate(null);
    setVoteSubmitted(false);
    setQuickVoteError("");
  }

  /* ================================================================
     SELECT CANDIDATE
  ================================================================= */

  function selectCandidate(
    candidate: QuickVoteCandidate
  ) {
    setSelectedCandidate(candidate);
    setVoteSubmitted(false);
    setQuickVoteError("");
  }

  /* ================================================================
     CHANGE POSITION
  ================================================================= */

  function changeQuickVotePosition() {
    setSelectedQuickVote(null);
    setSelectedCandidate(null);
    setVoteSubmitted(false);
    setQuickVoteError("");
  }

  /* ================================================================
     CHANGE CANDIDATE
  ================================================================= */

  function changeCandidate() {
    setSelectedCandidate(null);
    setQuickVoteError("");
  }

  /* ================================================================
     SUBMIT QUICK VOTE
  ================================================================= */

  async function submitQuickVote() {
    if (
      !selectedQuickVote ||
      !selectedCandidate
    ) {
      return;
    }

    setSubmittingVote(true);
    setQuickVoteError("");

    try {
      await submitPollResponses(
        selectedQuickVote.poll.id,
        {
          countyId:
            location.countyId ||
            undefined,

          constituencyId:
            location.constituencyId ||
            undefined,

          wardId:
            location.wardId ||
            undefined,

          answers: [
            {
              questionId:
                selectedQuickVote
                  .question.id,

              optionId:
                selectedCandidate
                  .optionId,
            },
          ],
        }
      );

      setVoteSubmitted(true);
    } catch (error) {
      setQuickVoteError(
        error instanceof Error
          ? error.message
          : "Failed to submit your vote"
      );
    } finally {
      setSubmittingVote(false);
    }
  }

  /* ================================================================
     CONTINUE VOTING
  ================================================================= */

  function continueVoting() {
    setSelectedQuickVote(null);
    setSelectedCandidate(null);
    setVoteSubmitted(false);
    setQuickVoteError("");
  }

  /* ================================================================
     POSITION SCOPE LABEL
  ================================================================= */

  function getPositionScopeLabel(
    scope: PublicPosition["scope"]
  ) {
    switch (scope) {
      case "NATIONAL":
        return "National";

      case "COUNTY":
        return "County level";

      case "CONSTITUENCY":
        return "Constituency level";

      case "WARD":
        return "Ward level";

      default:
        return "";
    }
  }

  /* ================================================================
     LOADING
  ================================================================= */

  if (loading) {
    return (
      <main>
        <p>
          Loading Kenya Opinion Polls...
        </p>
      </main>
    );
  }

  /* ================================================================
     ERROR
  ================================================================= */

  if (error) {
    return (
      <main>
        <h1>
          Kenya Opinion Polls
        </h1>

        <p>
          {error}
        </p>
      </main>
    );
  }

  /* ================================================================
     PAGE
  ================================================================= */

  return (
    <main>

      {/* ============================================================
          HEADER
      ============================================================= */}

      <header>
        <h1>
          Kenya Opinion Polls
        </h1>

        <p>
          Explore voluntary online
          opinion polls and public
          sentiment across Kenya.
        </p>
      </header>

      <hr />

      {/* ============================================================
          YOUR LOCATION
      ============================================================= */}

      <section>
        <h2>
          Find Polls in Your Area
        </h2>

        <p>
          Select your county,
          constituency and ward to see
          the opinion polls available
          in your area.
        </p>

        <LocationSelector
          requireCounty={true}
          requireConstituency={true}
          requireWard={true}
          onChange={
            handleLocationChange
          }
        />
      </section>

      <hr />

      {/* ============================================================
          POLLS FOR YOUR AREA
      ============================================================= */}

      <section>

        <h2>
          Polls for Your Area
        </h2>

        {!hasCompleteLocation && (
          <div>
            <h3>
              Select your location
            </h3>

            <p>
              Choose your county,
              constituency and ward above
              to discover the positions
              and active opinion polls
              available in your area.
            </p>
          </div>
        )}

        {quickVoteLoading && (
          <p>
            Finding available polls
            for your area...
          </p>
        )}

        {quickVoteError && (
          <p>
            <strong>
              {quickVoteError}
            </strong>
          </p>
        )}

        {/* ========================================================
            AVAILABLE POSITIONS
        ========================================================= */}

        {hasCompleteLocation &&
          !quickVoteLoading &&
          !quickVoteError &&
          !selectedQuickVote &&
          quickVotePositions.length > 0 && (
            <section>

              <p>
                These are the active
                opinion polls currently
                available for your selected
                area. You can participate in
                whichever poll you choose.
              </p>

              <div>
                {quickVotePositions.map(
                  (vote) => (
                    <article
                      key={
                        vote.position.id
                      }
                    >

                      <h3>
                        {
                          vote.position
                            .name
                        }
                      </h3>

                      <p>
                        {getPositionScopeLabel(
                          vote.position
                            .scope
                        )}
                      </p>

                      {vote.position
                        .description && (
                        <p>
                          {
                            vote.position
                              .description
                          }
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          selectQuickVote(
                            vote
                          )
                        }
                      >
                        Vote Now
                      </button>

                      <Link
                        to={`/polls/${vote.poll.id}`}
                      >
                        View Poll Details
                      </Link>

                    </article>
                  )
                )}
              </div>

            </section>
          )}

        {/* ========================================================
            NO ACTIVE QUICK VOTES
        ========================================================= */}

        {hasCompleteLocation &&
          !quickVoteLoading &&
          !quickVoteError &&
          !selectedQuickVote &&
          quickVotePositions.length === 0 && (
            <section>

              <h3>
                No active polls for this
                area
              </h3>

              <p>
                There are currently no
                active opinion polls available
                for your selected county,
                constituency and ward.
              </p>

              <p>
                You can still explore the
                available positions and
                general opinion polls below.
              </p>

            </section>
          )}

        {/* ========================================================
            SELECTED QUICK VOTE
        ========================================================= */}

        {selectedQuickVote &&
          !voteSubmitted && (
            <section>

              <hr />

              <button
                type="button"
                onClick={
                  changeQuickVotePosition
                }
              >
                ← Back to Positions
              </button>

              <h2>
                {
                  selectedQuickVote
                    .position.name
                }
              </h2>

              <p>
                {
                  selectedQuickVote
                    .question.question
                }
              </p>

              <p>
                Select one option below
                to participate in this
                opinion poll.
              </p>

              {/* ==================================================
                  QUICK VOTE CANDIDATES
              ================================================== */}

              <div>
                {selectedQuickVote.candidates.map(
                  (candidate) => {
                    const selected =
                      selectedCandidate
                        ?.optionId ===
                      candidate.optionId;

                    return (
                      <article
                        key={
                          candidate.optionId
                        }
                      >

                        {candidate.photoUrl && (
                          <img
                            src={
                              candidate.photoUrl
                            }
                            alt={
                              candidate.name
                            }
                            width="120"
                            height="120"
                          />
                        )}

                        <h3>
                          {
                            candidate.name
                          }
                        </h3>

                        {candidate.party && (
                          <p>
                            {
                              candidate.party
                            }
                          </p>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            selectCandidate(
                              candidate
                            )
                          }
                        >
                          {selected
                            ? "✓ Selected"
                            : `Vote for ${candidate.name}`}
                        </button>

                      </article>
                    );
                  }
                )}
              </div>

              {/* ==================================================
                  CONFIRM VOTE
              ================================================== */}

              {selectedCandidate && (
                <section>

                  <hr />

                  <h3>
                    Confirm Your Vote
                  </h3>

                  <p>
                    You are selecting:
                  </p>

                  <h2>
                    {
                      selectedCandidate
                        .name
                    }
                  </h2>

                  {selectedCandidate.party && (
                    <p>
                      {
                        selectedCandidate
                          .party
                      }
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={
                      submittingVote
                    }
                    onClick={
                      submitQuickVote
                    }
                  >
                    {submittingVote
                      ? "Submitting..."
                      : "✓ Confirm Vote"}
                  </button>

                  <button
                    type="button"
                    disabled={
                      submittingVote
                    }
                    onClick={
                      changeCandidate
                    }
                  >
                    Change Candidate
                  </button>

                </section>
              )}

            </section>
          )}

        {/* ========================================================
            VOTE SUCCESS
        ========================================================= */}

        {voteSubmitted &&
          selectedQuickVote &&
          selectedCandidate && (
            <section>

              <hr />

              <h2>
                ✓ Response Recorded
              </h2>

              <p>
                Your response for the
                following opinion poll has
                been recorded:
              </p>

              <h3>
                {
                  selectedQuickVote
                    .position.name
                }
              </h3>

              <p>
                Selected:
              </p>

              <h2>
                {
                  selectedCandidate.name
                }
              </h2>

              {selectedCandidate.party && (
                <p>
                  {
                    selectedCandidate
                      .party
                  }
                </p>
              )}

              <p>
                Thank you for participating
                in this voluntary opinion
                poll.
              </p>

              <div>

                <button
                  type="button"
                  onClick={
                    continueVoting
                  }
                >
                  Continue Voting
                </button>

                <Link
                  to={`/polls/${selectedQuickVote.poll.id}`}
                >
                  View Poll Details
                </Link>

              </div>

            </section>
          )}

      </section>

      <hr />

      {/* ============================================================
          POLITICAL OPINION POLLS

          NEW FUNCTIONALITY:

          Every position can now display the candidates already
          stored for that position.

          Candidate cards are horizontally scrollable.

          Clicking ANY candidate card takes the participant to
          the same position-polls page as "View X Polls".
      ============================================================= */}

      <section>

        <h2>
          Political Opinion Polls
        </h2>

        <p>
          Explore available polls by
          position and view the candidates
          participating in each poll.
        </p>

        <div>

          {positions.map(
            (position) => {

              const candidates =
                position.candidates ?? [];

              return (
                <article
                  key={position.id}
                >

                  {/* ==================================================
                      POSITION HEADER
                  ================================================== */}

                  <h3>
                    {position.name}
                  </h3>

                  <p>
                    {getPositionScopeLabel(
                      position.scope
                    )}
                  </p>

                  {position.description && (
                    <p>
                      {
                        position.description
                      }
                    </p>
                  )}

                  {position.pollCount !==
                    undefined && (
                    <p>
                      {
                        position.pollCount
                      }{" "}
                      active poll
                      {position.pollCount ===
                      1
                        ? ""
                        : "s"}
                    </p>
                  )}

                  {/* ==================================================
                      CANDIDATE SCROLLING AREA

                      Horizontal scrolling is intentionally done
                      here without changing the existing page
                      styling system.

                      We can style this properly later.
                  ================================================== */}

                  {candidates.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        overflowX: "auto",
                        gap: "16px",
                        padding:
                          "10px 0",
                      }}
                    >

                      {candidates.map(
                        (candidate) => (
                          <Link
                            key={
                              candidate.id
                            }
                            to={`/polls/position/${position.id}`}
                            style={{
                              flex:
                                "0 0 auto",
                              textDecoration:
                                "none",
                            }}
                          >

                            <article>

                              {/* ====================================
                                  CANDIDATE IMAGE
                              ==================================== */}

                              {candidate.photoUrl ? (
                                <img
                                  src={
                                    candidate.photoUrl
                                  }
                                  alt={
                                    candidate.name
                                  }
                                  width="160"
                                  height="160"
                                  loading="lazy"
                                />
                              ) : (
                                <div
                                  style={{
                                    width:
                                      "160px",
                                    height:
                                      "160px",
                                    display:
                                      "flex",
                                    alignItems:
                                      "center",
                                    justifyContent:
                                      "center",
                                  }}
                                >
                                  No image
                                </div>
                              )}

                              {/* ====================================
                                  CANDIDATE NAME
                              ==================================== */}

                              <h4>
                                {
                                  candidate.name
                                }
                              </h4>

                              {/* ====================================
                                  PARTY
                              ==================================== */}

                              {candidate.party && (
                                <p>
                                  {
                                    candidate.party
                                  }
                                </p>
                              )}

                            </article>

                          </Link>
                        )
                      )}

                    </div>
                  )}

                  {/* ==================================================
                      VIEW ALL POLLS

                      This is the SAME destination used by the
                      candidate cards above.
                  ================================================== */}

                  <Link
                    to={`/polls/position/${position.id}`}
                  >
                    View{" "}
                    {position.name} Polls
                  </Link>

                </article>
              );
            }
          )}

        </div>

      </section>

      <hr />

      {/* ============================================================
          GENERAL & PUBLIC OPINION

          KEPT
      ============================================================= */}

      <section>

        <h2>
          General & Public Opinion
        </h2>

        <p>
          Explore non-position-specific
          public opinion and research
          polls.
        </p>

        <Link to="/polls/general">
          Explore General Polls
        </Link>

        {generalPolls.length > 0 && (
          <div>

            <h3>
              Currently active
            </h3>

            {generalPolls
              .slice(0, 3)
              .map((poll) => (
                <article
                  key={poll.id}
                >

                  <h4>
                    {poll.title}
                  </h4>

                  <p>
                    {poll._count
                      ?.responses ?? 0}{" "}
                    responses
                  </p>

                  <Link
                    to={`/polls/${poll.id}`}
                  >
                    View Poll
                  </Link>

                </article>
              ))}

          </div>
        )}

      </section>

      <hr />

      {/* ============================================================
          IMPORTANT INFORMATION

          KEPT
      ============================================================= */}

      <section>

        <h2>
          Important Information
        </h2>

        <p>
          This is an independent
          platform for voluntary online
          opinion polling.
        </p>

        <p>
          Participation here does not
          cast an official election
          vote.
        </p>

        <p>
          Online responses may not
          represent the views of the
          entire population.
        </p>

      </section>

    </main>
  );
}