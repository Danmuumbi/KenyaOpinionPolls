import { useEffect, useMemo, useState } from "react";

import {
  getAdminFeaturedPolls,
  getAvailableFeaturedPolls,
  featurePoll,
  removeFeaturedPoll,
  updateFeaturedPollOrder,
} from "../api/featuredPolls";

import "./FeaturedPolls.css";

interface FeaturedPoll {
  id: string;
  title: string;
  description?: string | null;
  type: string;
  featuredOrder: number | null;

  position?: {
    id: string;
    name: string;
  } | null;

  campaign?: {
    id: string;
    name: string;
  } | null;

  targetCounty?: {
    id: string;
    name: string;
  } | null;

  targetConstituency?: {
    id: string;
    name: string;
  } | null;

  targetWard?: {
    id: string;
    name: string;
  } | null;
}

export default function FeaturedPolls() {
  const [featuredPolls, setFeaturedPolls] =
    useState<FeaturedPoll[]>([]);

  const [availablePolls, setAvailablePolls] =
    useState<FeaturedPoll[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [availableType, setAvailableType] =
    useState("ALL");

  const [availablePosition, setAvailablePosition] =
    useState("ALL");

  async function loadPolls() {
    try {
      setLoading(true);
      setError("");

      const [
        featured,
        available,
      ] = await Promise.all([
        getAdminFeaturedPolls(),
        getAvailableFeaturedPolls(),
      ]);

      setFeaturedPolls(featured);
      setAvailablePolls(available);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load featured polls"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPolls();
  }, []);

  async function handleFeature(
    pollId: string
  ) {
    try {
      setActionLoading(pollId);

      await featurePoll(pollId);

      await loadPolls();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to feature poll"
      );
    } finally {
      setActionLoading("");
    }
  }

  async function handleRemove(
    pollId: string
  ) {
    try {
      setActionLoading(pollId);

      await removeFeaturedPoll(pollId);

      await loadPolls();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to remove featured poll"
      );
    } finally {
      setActionLoading("");
    }
  }

  async function handleOrderChange(
    pollId: string,
    value: string
  ) {
    const order = Number(value);

    if (
      !Number.isInteger(order) ||
      order < 1
    ) {
      return;
    }

    try {
      setActionLoading(pollId);

      await updateFeaturedPollOrder(
        pollId,
        order
      );

      await loadPolls();
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update order"
      );
    } finally {
      setActionLoading("");
    }
  }

  function getLocation(
    poll: FeaturedPoll
  ) {
    const locations = [
      poll.targetWard?.name,
      poll.targetConstituency?.name,
      poll.targetCounty?.name,
    ].filter(Boolean);

    return locations.join(" → ");
  }

  function getScopeLabel(
    poll: FeaturedPoll
  ) {
    if (poll.targetWard) {
      return "Ward";
    }

    if (poll.targetConstituency) {
      return "Constituency";
    }

    if (poll.targetCounty) {
      return "County";
    }

    return "National";
  }

  const positionOptions = useMemo(() => {
    const names = availablePolls
      .map((poll) => poll.position?.name)
      .filter(
        (name): name is string =>
          Boolean(name)
      );

    return Array.from(new Set(names)).sort();
  }, [availablePolls]);

  const typeOptions = useMemo(() => {
    return Array.from(
      new Set(
        availablePolls
          .map((poll) => poll.type)
          .filter(Boolean)
      )
    ).sort();
  }, [availablePolls]);

  const filteredAvailablePolls =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return availablePolls.filter(
        (poll) => {
          const matchesSearch =
            !query ||
            poll.title
              .toLowerCase()
              .includes(query) ||
            poll.description
              ?.toLowerCase()
              .includes(query) ||
            poll.position?.name
              .toLowerCase()
              .includes(query) ||
            getLocation(poll)
              .toLowerCase()
              .includes(query);

          const matchesType =
            availableType === "ALL" ||
            poll.type === availableType;

          const matchesPosition =
            availablePosition === "ALL" ||
            poll.position?.name ===
              availablePosition;

          return (
            matchesSearch &&
            matchesType &&
            matchesPosition
          );
        }
      );
    }, [
      availablePolls,
      search,
      availableType,
      availablePosition,
    ]);

  if (loading) {
    return (
      <main className="featured-polls-page">
        <div className="featured-polls-shell">
          <div className="featured-polls-loading">
            <div className="featured-polls-loading-mark">
              <span />
              <span />
              <span />
            </div>

            <p>Loading featured polls</p>
            <span>
              Preparing your public poll lineup...
            </span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="featured-polls-page">
      <div className="featured-polls-shell">

        {/* =====================================================
            HEADER
            ===================================================== */}

        <header className="featured-polls-header">

          <div className="featured-polls-heading">

            <div className="featured-polls-eyebrow">
              SFD INSIGHTS / CONTENT
            </div>

            <h1>
              Featured polls
            </h1>

            <p>
              Curate the polls that receive
              prominent placement on the public
              home page.
            </p>

          </div>

          <div className="featured-polls-header-stat">
            <span>
              Currently featured
            </span>

            <strong>
              {featuredPolls.length}
            </strong>
          </div>

        </header>

        {/* =====================================================
            ERROR
            ===================================================== */}

        {error && (
          <div
            className="featured-polls-alert"
            role="alert"
          >
            <strong>
              Something went wrong
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={loadPolls}
            >
              Try again
            </button>
          </div>
        )}

        {/* =====================================================
            PUBLIC PREVIEW / CURRENT QUEUE
            ===================================================== */}

        <section className="featured-polls-featured-section">

          <div className="featured-polls-section-top">

            <div>
              <div className="featured-polls-section-kicker">
                PUBLIC HOME PAGE
              </div>

              <h2>
                Current feature lineup
              </h2>

              <p>
                These polls are currently
                arranged for public display.
                Lower numbers appear first.
              </p>
            </div>

            <div className="featured-polls-lineup-note">
              <span className="featured-polls-lineup-dot" />
              Live lineup
            </div>

          </div>

          {featuredPolls.length === 0 ? (
            <div className="featured-polls-empty">

              <div className="featured-polls-empty-number">
                01
              </div>

              <div>
                <h3>
                  Nothing is featured yet
                </h3>

                <p>
                  Choose a poll from the
                  available collection below
                  to begin building the public
                  lineup.
                </p>
              </div>

            </div>
          ) : (
            <div className="featured-polls-queue">

              {featuredPolls.map(
                (poll, index) => (
                  <article
                    key={poll.id}
                    className="featured-poll-featured-row"
                  >

                    {/* Order number */}

                    <div className="featured-poll-order">

                      <span>
                        {String(
                          poll.featuredOrder ??
                            index + 1
                        ).padStart(2, "0")}
                      </span>

                      <small>
                        POSITION
                      </small>

                    </div>

                    {/* Main information */}

                    <div className="featured-poll-main">

                      <div className="featured-poll-title-line">

                        <h3>
                          {poll.title}
                        </h3>

                        <span className="featured-poll-status">
                          Featured
                        </span>

                      </div>

                      {poll.description && (
                        <p className="featured-poll-description">
                          {poll.description}
                        </p>
                      )}

                      <div className="featured-poll-meta">

                        {poll.position && (
                          <span>
                            <strong>
                              Position
                            </strong>

                            {poll.position.name}
                          </span>
                        )}

                        {poll.campaign && (
                          <span>
                            <strong>
                              Campaign
                            </strong>

                            {poll.campaign.name}
                          </span>
                        )}

                        {getLocation(poll) && (
                          <span>
                            <strong>
                              Scope
                            </strong>

                            {getScopeLabel(
                              poll
                            )}

                            <em>
                              {getLocation(
                                poll
                              )}
                            </em>
                          </span>
                        )}

                      </div>

                    </div>

                    {/* Controls */}

                    <div className="featured-poll-controls">

                      <label>
                        <span>
                          Order
                        </span>

                        <select
                          value={
                            poll.featuredOrder ??
                            ""
                          }
                          disabled={
                            actionLoading ===
                            poll.id
                          }
                          onChange={(
                            event
                          ) =>
                            handleOrderChange(
                              poll.id,
                              event.target
                                .value
                            )
                          }
                        >
                          {featuredPolls.map(
                            (_, index) => (
                              <option
                                key={
                                  index + 1
                                }
                                value={
                                  index + 1
                                }
                              >
                                {index + 1}
                              </option>
                            )
                          )}
                        </select>
                      </label>

                      <button
                        type="button"
                        disabled={
                          actionLoading ===
                          poll.id
                        }
                        onClick={() =>
                          handleRemove(
                            poll.id
                          )
                        }
                        className="featured-poll-remove"
                      >
                        {actionLoading ===
                        poll.id
                          ? "Removing..."
                          : "Remove"}
                      </button>

                    </div>

                  </article>
                )
              )}

            </div>
          )}

        </section>

        {/* =====================================================
            AVAILABLE POLLS
            ===================================================== */}

        <section className="featured-polls-available-section">

          <div className="featured-polls-section-top">

            <div>
              <div className="featured-polls-section-kicker">
                POLL LIBRARY
              </div>

              <h2>
                Available to feature
              </h2>

              <p>
                Search and filter active public
                polls before adding them to the
                home page lineup.
              </p>
            </div>

            <div className="featured-polls-available-count">
              <strong>
                {filteredAvailablePolls.length}
              </strong>

              <span>
                matching polls
              </span>
            </div>

          </div>

          {/* Filters */}

          <div className="featured-polls-filters">

            <div className="featured-polls-search">

              <span
                className="featured-polls-search-icon"
                aria-hidden="true"
              >
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search polls, positions or locations..."
                aria-label="Search available polls"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

            </div>

            <label className="featured-polls-filter">

              <span>
                Poll type
              </span>

              <select
                value={availableType}
                onChange={(event) =>
                  setAvailableType(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  All types
                </option>

                {typeOptions.map(
                  (type) => (
                    <option
                      key={type}
                      value={type}
                    >
                      {type.replaceAll(
                        "_",
                        " "
                      )}
                    </option>
                  )
                )}
              </select>

            </label>

            <label className="featured-polls-filter">

              <span>
                Position
              </span>

              <select
                value={
                  availablePosition
                }
                onChange={(event) =>
                  setAvailablePosition(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  All positions
                </option>

                {positionOptions.map(
                  (position) => (
                    <option
                      key={position}
                      value={position}
                    >
                      {position}
                    </option>
                  )
                )}
              </select>

            </label>

          </div>

          {/* Available list */}

          {filteredAvailablePolls.length ===
          0 ? (
            <div className="featured-polls-no-results">

              <div className="featured-polls-no-results-icon">
                /
              </div>

              <h3>
                No matching polls
              </h3>

              <p>
                Try changing your search or
                filter selection.
              </p>

              {(search ||
                availableType !== "ALL" ||
                availablePosition !==
                  "ALL") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setAvailableType(
                      "ALL"
                    );
                    setAvailablePosition(
                      "ALL"
                    );
                  }}
                >
                  Clear filters
                </button>
              )}

            </div>
          ) : (
            <div className="featured-polls-library">

              {filteredAvailablePolls.map(
                (poll) => (
                  <article
                    key={poll.id}
                    className="featured-poll-library-row"
                  >

                    <div className="featured-poll-library-marker">
                      <span />
                    </div>

                    <div className="featured-poll-library-main">

                      <div className="featured-poll-library-title">

                        <h3>
                          {poll.title}
                        </h3>

                        <span>
                          {poll.type.replaceAll(
                            "_",
                            " "
                          )}
                        </span>

                      </div>

                      {poll.description && (
                        <p>
                          {poll.description}
                        </p>
                      )}

                      <div className="featured-poll-library-meta">

                        {poll.position && (
                          <span>
                            {poll.position.name}
                          </span>
                        )}

                        {getLocation(poll) && (
                          <span>
                            {getLocation(
                              poll
                            )}
                          </span>
                        )}

                        {poll.campaign && (
                          <span>
                            {poll.campaign.name}
                          </span>
                        )}

                      </div>

                    </div>

                    <button
                      type="button"
                      className="featured-poll-feature-button"
                      disabled={
                        actionLoading ===
                        poll.id
                      }
                      onClick={() =>
                        handleFeature(
                          poll.id
                        )
                      }
                    >
                      {actionLoading ===
                      poll.id ? (
                        "Adding..."
                      ) : (
                        <>
                          <span>
                            +
                          </span>
                          Feature
                        </>
                      )}
                    </button>

                  </article>
                )
              )}

            </div>
          )}

        </section>

      </div>
    </main>
  );
}