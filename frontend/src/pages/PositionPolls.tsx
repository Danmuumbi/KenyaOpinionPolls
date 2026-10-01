import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getPublicPositionPolls,
  getPublicPositions,
} from "../api/public";

import type {
  PublicPoll,
  PublicPosition,
} from "../api/public";

import LocationSelector from "../components/LocationSelector";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

import "./PositionPolls.css";

type LocationState = {
  countyId: string;
  constituencyId: string;
  wardId: string;
};

export default function PositionPolls() {
  const { positionId } = useParams();

  const [position, setPosition] =
    useState<PublicPosition | null>(null);

  const [polls, setPolls] =
    useState<PublicPoll[]>([]);

  const [location, setLocation] =
    useState<LocationState>({
      countyId: "",
      constituencyId: "",
      wardId: "",
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!positionId) {
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const positions =
          await getPublicPositions();

        if (cancelled) {
          return;
        }

        const selectedPosition =
          positions.find(
            (item) =>
              item.id === positionId
          );

        if (!selectedPosition) {
          throw new Error(
            "Position not found"
          );
        }

        if (cancelled) {
          return;
        }

        setPosition(selectedPosition);

        const filters = {
          countyId:
            location.countyId ||
            undefined,

          constituencyId:
            location.constituencyId ||
            undefined,

          wardId:
            location.wardId ||
            undefined,
        };

        const data =
          await getPublicPositionPolls(
            positionId,
            filters
          );

        if (cancelled) {
          return;
        }

        setPolls(data);
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
  }, [
    positionId,
    location.countyId,
    location.constituencyId,
    location.wardId,
  ]);

  function handleLocationChange(
    nextLocation: LocationState
  ) {
    setLocation(nextLocation);
  }

  const requiresCounty =
    position?.scope === "COUNTY" ||
    position?.scope === "CONSTITUENCY" ||
    position?.scope === "WARD";

  const requiresConstituency =
    position?.scope === "CONSTITUENCY" ||
    position?.scope === "WARD";

  const requiresWard =
    position?.scope === "WARD";

  const hasLocationFilter =
    Boolean(
      location.countyId ||
      location.constituencyId ||
      location.wardId
    );

  function getPollLocation(
    poll: PublicPoll
  ) {
    const parts = [
      poll.targetWard?.name,
      poll.targetConstituency?.name,
      poll.targetCounty?.name,
    ].filter(Boolean);

    if (parts.length === 0) {
      return "National";
    }

    return parts.join(" · ");
  }

  if (loading && !position) {
    return (
      <>
        <Navbar />

        <main className="position-page">
          <div className="position-loading">
            <div className="position-spinner" />

            <p>
              Loading polls...
            </p>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (error && !position) {
    return (
      <>
        <Navbar />

        <main className="position-page">
          <section className="position-error">
            <span className="position-error-icon">
              !
            </span>

            <span className="position-eyebrow">
              POLLS UNAVAILABLE
            </span>

            <h1>
              We couldn't load this position
            </h1>

            <p>
              {error}
            </p>

            <Link
              to="/polls"
              className="position-primary-link"
            >
              Back to polls
            </Link>
          </section>
        </main>

        <Footer />
      </>
    );
  }

  if (!position) {
    return null;
  }

  return (
    <>
      <Navbar />

      <main className="position-page">
        <div className="position-shell">

          <Link
            to="/"
            className="position-back"
          >
            <span aria-hidden="true">
              ←
            </span>

            Home
          </Link>

          <header className="position-header">
            <div className="position-header-label">
              <span className="position-dot" />

              PUBLIC OPINION
            </div>

            <h1>
              {position.name}
              <span>
                Opinion Polls
              </span>
            </h1>

            <p>
              Explore active polls for this
              position and share your response
              where you are eligible to
              participate.
            </p>
          </header>

          {requiresCounty && (
            <section className="location-panel">
              <div className="location-panel-heading">
                <div>
                  <span className="section-kicker">
                    FIND YOUR AREA
                  </span>

                  <h2>
                    Choose a location
                  </h2>
                </div>

                <span className="location-step">
                  Filter
                </span>
              </div>

              <p className="location-description">
                Start with your county and
                narrow down to your constituency
                or ward where applicable.
              </p>

              <LocationSelector
                requireCounty={
                  requiresCounty
                }
                requireConstituency={
                  requiresConstituency
                }
                requireWard={
                  requiresWard
                }
                onChange={
                  handleLocationChange
                }
              />

              {hasLocationFilter && (
                <button
                  type="button"
                  className="clear-location"
                  onClick={() =>
                    handleLocationChange({
                      countyId: "",
                      constituencyId: "",
                      wardId: "",
                    })
                  }
                >
                  Clear location filter
                </button>
              )}
            </section>
          )}

          <section className="polls-section">
            <div className="polls-heading">
              <div>
                <span className="section-kicker">
                  AVAILABLE POLLS
                </span>

                <h2>
                  {hasLocationFilter
                    ? "Polls for this area"
                    : `Active ${position.name} polls`}
                </h2>
              </div>

              {loading && (
                <span className="polls-loading-label">
                  Updating...
                </span>
              )}
            </div>

            {!loading &&
              polls.length === 0 && (
                <div className="empty-polls">
                  <div className="empty-polls-mark">
                    —
                  </div>

                  <h3>
                    No active polls found
                  </h3>

                  <p>
                    There are currently no active{" "}
                    {position.name.toLowerCase()}{" "}
                    polls
                    {hasLocationFilter
                      ? " for the selected area."
                      : "."}
                  </p>

                  {hasLocationFilter && (
                    <button
                      type="button"
                      onClick={() =>
                        handleLocationChange({
                          countyId: "",
                          constituencyId: "",
                          wardId: "",
                        })
                      }
                      className="empty-clear-button"
                    >
                      View all polls
                    </button>
                  )}
                </div>
              )}

            {polls.length > 0 && (
              <div className="poll-list">
                {polls.map(
                  (
                    poll,
                    index
                  ) => (
                    <article
                      key={poll.id}
                      className="poll-item"
                    >
                      <div className="poll-index">
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </div>

                      <div className="poll-main">
                        <div className="poll-meta">
                          <span>
                            ACTIVE POLL
                          </span>

                          <span className="meta-separator">
                            •
                          </span>

                          <span>
                            {getPollLocation(
                              poll
                            )}
                          </span>
                        </div>

                        <h3>
                          {poll.title}
                        </h3>

                        {poll.description && (
                          <p className="poll-description">
                            {poll.description}
                          </p>
                        )}

                        <div className="poll-target">
                          {poll.targetCounty && (
                            <span>
                              <strong>
                                County
                              </strong>

                              {
                                poll
                                  .targetCounty
                                  .name
                              }
                            </span>
                          )}

                          {poll.targetConstituency && (
                            <span>
                              <strong>
                                Constituency
                              </strong>

                              {
                                poll
                                  .targetConstituency
                                  .name
                              }
                            </span>
                          )}

                          {poll.targetWard && (
                            <span>
                              <strong>
                                Ward
                              </strong>

                              {
                                poll
                                  .targetWard
                                  .name
                              }
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="poll-actions">
                        <Link
                          to={`/polls/${poll.id}`}
                          className="statistics-link"
                        >
                          View results
                        </Link>

                        <Link
                          to={`/polls/${poll.id}/participate`}
                          className="participate-link"
                        >
                          Participate
                          <span aria-hidden="true">
                            →
                          </span>
                        </Link>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </section>

          <section className="position-information">
            <div className="information-line" />

            <div className="information-content">
              <span className="information-label">
                ABOUT THESE POLLS
              </span>

              <p>
                These are voluntary online
                opinion polls. Results reflect
                responses submitted through SFD
                Insights and should not be
                interpreted as official election
                results.
              </p>
            </div>
          </section>

        </div>
      </main>

      <Footer />
    </>
  );
}