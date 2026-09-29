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

  /*
   * IMPORTANT:
   *
   * Do not automatically use the previously saved
   * location here.
   *
   * The Position Polls page should initially show
   * all available polls and allow the location selector
   * to act as a filter.
   */
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

        /*
         * First get the position so we know its scope.
         */
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

        /*
         * Build the filters.
         *
         * Empty values are deliberately converted
         * to undefined.
         *
         * This means:
         *
         * No location selected
         *      ↓
         * get ALL polls for this position
         *
         * County selected
         *      ↓
         * filter by county
         *
         * Constituency selected
         *      ↓
         * filter by constituency
         *
         * Ward selected
         *      ↓
         * filter by ward
         */
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
    /*
     * LocationSelector is now purely a filter.
     *
     * As soon as the user changes the location,
     * the effect above reloads the polls.
     */
    setLocation(nextLocation);
  }

  if (loading) {
    return (
      <main>
        <p>
          Loading polls...
        </p>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <Link to="/">
          ← Home
        </Link>

        <h1>
          Polls unavailable
        </h1>

        <p>{error}</p>
      </main>
    );
  }

  if (!position) {
    return null;
  }

  const requiresCounty =
    position.scope === "COUNTY" ||
    position.scope === "CONSTITUENCY" ||
    position.scope === "WARD";

  const requiresConstituency =
    position.scope === "CONSTITUENCY" ||
    position.scope === "WARD";

  const requiresWard =
    position.scope === "WARD";

  return (
    <main>
      <Link to="/">
        ← Home
      </Link>

      <header>
        <h1>
          {position.name} Opinion Polls
        </h1>

        <p>
          Who would you support if we
          were to vote today?
        </p>
      </header>

      {requiresCounty && (
        <>
          <hr />

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
        </>
      )}

      <hr />

      <section>
        <h2>
          Available Polls
        </h2>

        {polls.length === 0 ? (
          <p>
            No active{" "}
            {position.name} polls are
            currently available for
            the selected area.
          </p>
        ) : (
          <div>
            {polls.map((poll) => (
              <article
                key={poll.id}
              >
                <h3>
                  {poll.title}
                </h3>

                {poll.description && (
                  <p>
                    {poll.description}
                  </p>
                )}

                {poll.targetCounty && (
                  <p>
                    Target:{" "}
                    {
                      poll
                        .targetCounty
                        .name
                    }
                    {" County"}
                  </p>
                )}

                {poll.targetConstituency && (
                  <p>
                    Target:{" "}
                    {
                      poll
                        .targetConstituency
                        .name
                    }
                  </p>
                )}

                {poll.targetWard && (
                  <p>
                    Target:{" "}
                    {
                      poll
                        .targetWard
                        .name
                    }
                  </p>
                )}

                <p>
                  Responses:{" "}
                  {poll._count
                    ?.responses ?? 0}
                </p>

                <div>
                  <Link
                    to={`/polls/${poll.id}/participate`}
                  >
                    Participate in this Poll
                  </Link>

                  {" "}

                  <Link
                    to={`/polls/${poll.id}`}
                  >
                    View Statistics
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}