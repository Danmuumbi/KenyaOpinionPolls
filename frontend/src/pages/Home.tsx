import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,  useNavigate,

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

import {
  getFeaturedPolls,
} from "../api/featuredPolls";

import LocationSelector from "../components/LocationSelector";

import "./Home.css";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Home() {
  /* ================================================================
     EXISTING HOME DATA
  ================================================================= */

  const [positions, setPositions] =
    useState<PublicPosition[]>([]);

      const navigate = useNavigate();


  const [generalPolls, setGeneralPolls] =
    useState<PublicPoll[]>([]);

  const [featuredPolls, setFeaturedPolls] =
    useState<any[]>([]);

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
   CANDIDATE PAGINATION
================================================================ */

const [candidatePages, setCandidatePages] =
  useState<Record<string, number>>({});

    
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

        try {
          const featured =
            await getFeaturedPolls();

          if (!cancelled) {
            setFeaturedPolls(featured);
          }
        } catch (featuredError) {
          console.error(
            "Failed to load featured polls:",
            featuredError
          );

          setFeaturedPolls([]);
        }
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

  // function selectQuickVote(
  //   vote: QuickVote
  // ) {
  //   setSelectedQuickVote(vote);
  //   setSelectedCandidate(null);
  //   setVoteSubmitted(false);
  //   setQuickVoteError("");
  // }

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


  function changeCandidatePage(
  positionId: string,
  direction: "next" | "previous",
  totalCandidates: number
) {
  const pageSize = 4;

  const totalPages = Math.ceil(
    totalCandidates / pageSize
  );

  setCandidatePages((current) => {
    const currentPage =
      current[positionId] ?? 0;

    let nextPage = currentPage;

    if (direction === "next") {
      nextPage = Math.min(
        currentPage + 1,
        totalPages - 1
      );
    }

    if (direction === "previous") {
      nextPage = Math.max(
        currentPage - 1,
        0
      );
    }

    return {
      ...current,
      [positionId]: nextPage,
    };
  });
}
  /* ================================================================
     LOADING
  ================================================================= */

  if (loading) {
    return (
      <main className="home-page">
        <div className="home-loading">
          <span className="loading-line" />

          <p>
            Preparing Kenya Opinion Polls...
          </p>
        </div>
      </main>
    );
  }

  /* ================================================================
     ERROR
  ================================================================= */

  if (error) {
    return (
      <main className="home-page">
        <section className="home-error">
          <span className="section-kicker">
            Something went wrong
          </span>

          <h1>
            Kenya Opinion Polls
          </h1>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
          >
            Try Again
          </button>
        </section>
      </main>
    );
  }

  

  /* ================================================================
     PAGE
  ================================================================= */

  return (

    <>
    <Navbar />
    <main className="home-page">

      {/* ============================================================
          HERO
      ============================================================= */}

      <section className="home-hero">
        <div className="home-shell">

          <div className="home-hero-grid">

            <div>

              <p className="home-eyebrow">
                SFD Insights · Kenya Opinion Polls
              </p>

              <h1>
                Your voice.
                <br />
                <span>Counted.</span>
              </h1>

              <p className="home-hero-lead">
                Explore public opinion across Kenya,
                take part in voluntary polls, and see
                what people are saying about the issues
                and positions that matter to them.
              </p>

              <p className="home-hero-note">
                Simple participation. Independent polling.
                One response at a time.
              </p>

            </div>


            <aside className="home-hero-action">

              <p className="home-hero-action-label">
                Start here
              </p>

              <h2>
                Have your say in a few simple steps.
              </h2>

              <p>
                Choose your area, explore an available
                poll, and submit your response.
                No complicated registration process is
                required for public participation.
              </p>

              <a
                href="#find-your-area"
                className="home-hero-action-link"
              >
                Find polls in my area →
              </a>

            </aside>

          </div>

        </div>
      </section>


      {/* ============================================================
          FEATURED POLLS
      ============================================================= */}

      {featuredPolls.length > 0 && (
        <section className="featured-area">
          <div className="home-shell">

            <div className="featured-heading">

              <div>
                <p className="section-kicker">
                  Currently highlighted
                </p>

                <h2>
                  Polls worth your attention.
                </h2>
              </div>

              <p>
                These polls have been selected as
                current highlights. Open one to read
                the question and participate.
              </p>

            </div>


            <div className="featured-list">

              {featuredPolls.map((poll, index) => (
                <article
                  className="featured-item"
                  key={poll.id}
                >

                  <span className="featured-number">
                    0{index + 1}
                  </span>

                  <h3>
                    {poll.title}
                  </h3>

                  {poll.description && (
                    <p className="featured-description">
                      {poll.description}
                    </p>
                  )}

                  <div className="featured-meta">

                    {poll.position && (
                      <span>
                        {poll.position.name}
                      </span>
                    )}

                    {poll.campaign && (
                      <span>
                        {poll.campaign.name}
                      </span>
                    )}

                    {(poll.targetCounty ||
                      poll.targetConstituency ||
                      poll.targetWard) && (
                      <span>
                        {[
                          poll.targetWard?.name,
                          poll.targetConstituency?.name,
                          poll.targetCounty?.name,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}

                  </div>

                  <Link
                    className="text-action"
                    to={`/polls/${poll.id}`}
                  >
                    Read and participate
                  </Link>

                </article>
              ))}

            </div>

          </div>
        </section>
      )}


      {/* ============================================================
          FIND YOUR AREA
      ============================================================= */}

      <section
        id="find-your-area"
        className="home-section location-section"
      >

        <div className="home-shell">

          <div className="location-layout">

            <div className="location-copy">

              <p className="section-kicker">
                Find your area
              </p>

              <h2>
                Start with
                <br />
                where you live.
              </h2>

              <p>
                Select your
                <strong> county</strong>,
                <strong> constituency</strong>,
                and <strong> ward</strong>.
              </p>

              <p>
                We use your selection to show the
                active polls available for your area.
                This keeps the experience relevant
                without making you search through
                unrelated polls.
              </p>

            </div>


            <div className="location-form">

              <LocationSelector
                requireCounty={true}
                requireConstituency={true}
                requireWard={true}
                onChange={
                  handleLocationChange
                }
              />

            </div>

          </div>

        </div>

      </section>


      {/* ============================================================
          AREA POLLS / QUICK VOTE
      ============================================================= */}

      <section className="home-section quick-vote-section">

        <div className="home-shell">

          <div className="section-intro">

            <div>
              <p className="section-kicker">
                Participate
              </p>

              <h2>
                Polls for your area.
              </h2>
            </div>

            <p>
              Once you select your location, the
              active polls available there will appear
              here. Choose a position and make your
              response.
            </p>

          </div>


          {!hasCompleteLocation && (
            <div className="quick-vote-empty">

              <h3>
                Your local polls are waiting.
              </h3>

              <p>
                Select your county, constituency and
                ward above. Your available polls will
                appear here automatically.
              </p>

            </div>
          )}


          {quickVoteLoading && (
            <div className="quick-vote-empty">

              <h3>
                Finding your local polls…
              </h3>

              <p>
                We are checking the active polls
                available for your selected area.
              </p>

            </div>
          )}


          {quickVoteError && (
            <div className="quick-vote-empty">

              <h3>
                We could not load the local polls.
              </h3>

              <p>
                {quickVoteError}
              </p>

            </div>
          )}


          {/* ========================================================
              AVAILABLE POSITIONS
          ========================================================= */}

          {hasCompleteLocation &&
            !quickVoteLoading &&
            !quickVoteError &&
            !selectedQuickVote &&
            quickVotePositions.length > 0 && (

              <div className="quick-position-list">

                {quickVotePositions.map((vote) => (

                  <article
                    className="quick-position"
                    key={vote.position.id}
                  >

                    <p className="quick-position-scope">
                      {getPositionScopeLabel(
                        vote.position.scope
                      )}
                    </p>

                    <h3>
                      {vote.position.name}
                    </h3>

                    {vote.position.description && (
                      <p>
                        {vote.position.description}
                      </p>
                    )}

                    <div>

                     <button
  type="button"
  className="quick-vote-button"
  onClick={() =>
    navigate(
      `/polls/${vote.poll.id}/participate`
    )
  }
>
  Vote now
</button>

                      <Link
                        className="quick-position-link"
                        to={`/polls/${vote.poll.id}`}
                      >
                        Read poll details
                      </Link>

                    </div>

                  </article>

                ))}

              </div>
            )}


          {/* ========================================================
              NO ACTIVE POLLS
          ========================================================= */}

          {hasCompleteLocation &&
            !quickVoteLoading &&
            !quickVoteError &&
            !selectedQuickVote &&
            quickVotePositions.length === 0 && (

              <div className="quick-vote-empty">

                <h3>
                  No active polls for this area yet.
                </h3>

                <p>
                  There are currently no active polls
                  matching your selected county,
                  constituency and ward. You can still
                  explore the national and general
                  opinion polls further below.
                </p>

              </div>
            )}


          {/* ========================================================
              SELECTED QUICK VOTE
          ========================================================= */}

          {selectedQuickVote &&
            !voteSubmitted && (

              <div className="vote-panel">

                <button
                  type="button"
                  className="vote-back"
                  onClick={
                    changeQuickVotePosition
                  }
                >
                  ← Back to positions
                </button>

                <p className="section-kicker">
                  {selectedQuickVote.position.name}
                </p>

                <h2 className="vote-question">
                  {
                    selectedQuickVote
                      .question.question
                  }
                </h2>

                <p className="vote-instruction">
                  Select one option below to
                  participate in this opinion poll.
                </p>


                <div className="vote-candidates">

                  {selectedQuickVote.candidates.map(
                    (candidate) => {

                      const selected =
                        selectedCandidate
                          ?.optionId ===
                        candidate.optionId;

                      return (
                        <article
                          className="vote-candidate"
                          key={candidate.optionId}
                        >

                          {candidate.photoUrl && (
                            <img
                              src={candidate.photoUrl}
                              alt={candidate.name}
                              width="92"
                              height="92"
                            />
                          )}

                          <h3>
                            {candidate.name}
                          </h3>

                          {candidate.party && (
                            <p>
                              {candidate.party}
                            </p>
                          )}

                          <button
                            type="button"
                            className={
                              selected
                                ? "vote-select-button selected"
                                : "vote-select-button"
                            }
                            onClick={() =>
                              selectCandidate(
                                candidate
                              )
                            }
                          >
                            {selected
                              ? "✓ Selected"
                              : `Choose ${candidate.name}`}
                          </button>

                        </article>
                      );
                    }
                  )}

                </div>


                {selectedCandidate && (
                  <div className="vote-confirm">

                    <h3>
                      Confirm your response
                    </h3>

                    <p>
                      You selected:
                    </p>

                    <h2 className="vote-confirm-name">
                      {selectedCandidate.name}
                    </h2>

                    {selectedCandidate.party && (
                      <p>
                        {selectedCandidate.party}
                      </p>
                    )}

                    <div className="vote-confirm-actions">

                      <button
                        type="button"
                        className="primary-button"
                        disabled={
                          submittingVote
                        }
                        onClick={
                          submitQuickVote
                        }
                      >
                        {submittingVote
                          ? "Submitting…"
                          : "Confirm response"}
                      </button>

                      <button
                        type="button"
                        className="secondary-button"
                        disabled={
                          submittingVote
                        }
                        onClick={
                          changeCandidate
                        }
                      >
                        Change selection
                      </button>

                    </div>

                  </div>
                )}

              </div>
            )}


          {/* ========================================================
              SUCCESS
          ========================================================= */}

          {voteSubmitted &&
            selectedQuickVote &&
            selectedCandidate && (

              <div className="vote-panel">

                <p className="section-kicker">
                  Response recorded
                </p>

                <h2>
                  Thank you for participating.
                </h2>

                <p>
                  Your response for the
                  <strong>
                    {" "}
                    {selectedQuickVote.position.name}
                  </strong>{" "}
                  opinion poll has been recorded.
                </p>

                <h3>
                  Selected:
                  {" "}
                  {selectedCandidate.name}
                </h3>

                {selectedCandidate.party && (
                  <p>
                    {selectedCandidate.party}
                  </p>
                )}

                <div className="vote-confirm-actions">

                  <button
                    type="button"
                    className="primary-button"
                    onClick={
                      continueVoting
                    }
                  >
                    Continue voting
                  </button>

                  <Link
                    className="secondary-button"
                    to={`/polls/${selectedQuickVote.poll.id}`}
                  >
                    View poll details
                  </Link>

                </div>

              </div>
            )}

        </div>

      </section>


      {/* ============================================================
          POLITICAL OPINION
      ============================================================= */}

      <section className="home-section political-section">

        <div className="home-shell">

          <div className="section-intro">

            <div>
              <p className="section-kicker">
                Explore by position
              </p>

              <h2>
                Political opinion.
              </h2>
            </div>

            <p>
              Browse the positions represented on the
              platform and explore the candidates and
              active polls associated with each one.
            </p>

          </div>


          <div className="position-list">

            {positions.map((position) => {

              const candidates =
                position.candidates ?? [];

              return (
                <article
                  className="position-row"
                  key={position.id}
                >

                  <div className="position-info">

                    <h3>
                      {position.name}
                    </h3>

                    <p className="position-scope">
                      {getPositionScopeLabel(
                        position.scope
                      )}
                    </p>

                    {position.description && (
                      <p className="position-description">
                        {position.description}
                      </p>
                    )}

                  </div>


                  <div>

                    {candidates.length > 0 ? (

                      <div className="candidate-gallery">

  {(() => {
    const pageSize = 4;

    const currentPage =
      candidatePages[position.id] ?? 0;

    const totalPages =
      Math.ceil(
        candidates.length / pageSize
      );

    const startIndex =
      currentPage * pageSize;

    const visibleCandidates =
      candidates.slice(
        startIndex,
        startIndex + pageSize
      );

    return (
      <>
        <div className="candidate-strip">

          {visibleCandidates.map(
            (candidate) => (

              <Link
                key={candidate.id}
                className="candidate-person"
                to={`/polls/position/${position.id}`}
              >

                {candidate.photoUrl ? (
                  <img
                    src={candidate.photoUrl}
                    alt={candidate.name}
                    width="92"
                    height="92"
                    loading="lazy"
                  />
                ) : (
                  <div className="candidate-placeholder">
                    No image
                  </div>
                )}

                <h4>
                  {candidate.name}
                </h4>

                {candidate.party && (
                  <p>
                    {candidate.party}
                  </p>
                )}

              </Link>

            )
          )}

        </div>

        {totalPages > 1 && (
          <div className="candidate-pagination">

            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() =>
                changeCandidatePage(
                  position.id,
                  "previous",
                  candidates.length
                )
              }
            >
              ← Previous
            </button>

            <span>
              {currentPage + 1} / {totalPages}
            </span>

            <button
              type="button"
              disabled={
                currentPage ===
                totalPages - 1
              }
              onClick={() =>
                changeCandidatePage(
                  position.id,
                  "next",
                  candidates.length
                )
              }
            >
              Next →
            </button>

          </div>
        )}
      </>
    );
  })()}

</div>
                    ) : (

                      <p className="position-description">
                        Candidate information is not
                        currently available for this
                        position.
                      </p>

                    )}

                  </div>


                  <div className="position-action">

                    <Link
                      to={`/polls/position/${position.id}`}
                    >
                      View polls →
                    </Link>

                  </div>

                </article>
              );
            })}

          </div>

        </div>

      </section>


      {/* ============================================================
          GENERAL OPINION
      ============================================================= */}

      <section className="home-section">

        <div className="home-shell">

          <div className="general-layout">

            <div className="general-main">

              <p className="section-kicker">
                Beyond political positions
              </p>

              <h2>
                General & public opinion.
              </h2>

              <p>
                Not every question is about a political
                position. Explore public-service,
                research, community and other
                non-position-specific opinion polls.
              </p>

              <Link
                className="general-link"
                to="/polls/general"
              >
                Explore all general polls →
              </Link>


              {generalPolls.length > 0 && (

                <div className="general-list">

                  {generalPolls
                    .slice(0, 3)
                    .map((poll) => (

                      <article
                        className="general-item"
                        key={poll.id}
                      >

                        <div>

                          <h4>
                            {poll.title}
                          </h4>

                          <p>
                            Active public opinion poll
                          </p>

                        </div>

                        <Link
                          to={`/polls/${poll.id}`}
                        >
                          Open poll →
                        </Link>

                      </article>

                    ))}

                </div>
              )}

            </div>


            <aside className="trust-panel">

              <h2>
                What this platform is.
              </h2>

              <p>
                SFD Insights provides a simple,
                independent space for voluntary online
                opinion polling.
              </p>

              <ul className="trust-points">

                <li>
                  Participation is voluntary.
                </li>

                <li>
                  An online response is not an official
                  election vote.
                </li>

                <li>
                  Online responses may not represent
                  the entire population.
                </li>

                <li>
                  Poll results should be understood
                  within their methodology and context.
                </li>

              </ul>

            </aside>

          </div>

        </div>

      </section>

    </main>

     <Footer />

      </>

  );
}
