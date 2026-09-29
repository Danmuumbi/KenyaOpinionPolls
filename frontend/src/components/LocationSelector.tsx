import {
  useEffect,
  useState,
} from "react";

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

import {
  getLocationContext,
  saveLocationContext,
} from "../utils/locationContext";

interface Props {
  requireCounty?: boolean;
  requireConstituency?: boolean;
  requireWard?: boolean;

  onChange?: (context: {
    countyId: string;
    constituencyId: string;
    wardId: string;
  }) => void;
}

export default function LocationSelector({
  requireCounty = false,
  requireConstituency = false,
  requireWard = false,
  onChange,
}: Props) {
  const saved = getLocationContext();

  const [counties, setCounties] =
    useState<County[]>([]);

  const [
    constituencies,
    setConstituencies,
  ] = useState<Constituency[]>([]);

  const [wards, setWards] =
    useState<Ward[]>([]);

  const [countyId, setCountyId] =
    useState(saved.countyId);

  const [
    constituencyId,
    setConstituencyId,
  ] = useState(saved.constituencyId);

  const [wardId, setWardId] =
    useState(saved.wardId);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await getCounties();

        setCounties(data);

        if (saved.countyId) {
          const constituencyData =
            await getConstituencies(
              saved.countyId
            );

          setConstituencies(
            constituencyData
          );

          if (saved.constituencyId) {
            const wardData =
              await getWards(
                saved.constituencyId
              );

            setWards(wardData);
          }
        }

        /**
         * Notify the parent about the
         * saved location when available.
         */
        if (
          saved.countyId ||
          saved.constituencyId ||
          saved.wardId
        ) {
          onChange?.({
            countyId:
              saved.countyId,
            constituencyId:
              saved.constituencyId,
            wardId:
              saved.wardId,
          });
        }
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load location"
        );
      } finally {
        setLoading(false);
      }
    }

    load();

    // We intentionally only load the
    // initial saved location once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function emit(
    nextCountyId: string,
    nextConstituencyId: string,
    nextWardId: string
  ) {
    const context = {
      countyId: nextCountyId,
      constituencyId:
        nextConstituencyId,
      wardId: nextWardId,
    };

    saveLocationContext(context);

    onChange?.(context);
  }

  async function handleCountyChange(
    value: string
  ) {
    setCountyId(value);

    setConstituencyId("");
    setWardId("");

    setConstituencies([]);
    setWards([]);

    emit(value, "", "");

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
    setConstituencyId(value);
    setWardId("");

    setWards([]);

    emit(
      countyId,
      value,
      ""
    );

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

  function handleWardChange(
    value: string
  ) {
    setWardId(value);

    emit(
      countyId,
      constituencyId,
      value
    );
  }

  if (loading) {
    return (
      <section>
        <p>Loading location...</p>
      </section>
    );
  }

  return (
    <section>
      <h2>Your location</h2>

      <p>
        Choose your location so we can
        show you the polls relevant to
        your area.
      </p>

      {error && (
        <p>
          <strong>Error:</strong>{" "}
          {error}
        </p>
      )}

      {/* COUNTY */}

      <div>
        <label htmlFor="context-county">
          County
          {requireCounty && " *"}
        </label>

        <br />

        <select
          id="context-county"
          value={countyId}
          onChange={(event) =>
            handleCountyChange(
              event.target.value
            )
          }
          required={requireCounty}
        >
          <option value="">
            Select county
          </option>

          {counties.map((county) => (
            <option
              key={county.id}
              value={county.id}
            >
              {county.name}
            </option>
          ))}
        </select>
      </div>

      {/* CONSTITUENCY */}

      {requireConstituency && (
        <>
          <br />

          <div>
            <label htmlFor="context-constituency">
              Constituency *
            </label>

            <br />

            <select
              id="context-constituency"
              value={constituencyId}
              onChange={(event) =>
                handleConstituencyChange(
                  event.target.value
                )
              }
              disabled={!countyId}
              required
            >
              <option value="">
                Select constituency
              </option>

              {constituencies.map(
                (constituency) => (
                  <option
                    key={constituency.id}
                    value={constituency.id}
                  >
                    {constituency.name}
                  </option>
                )
              )}
            </select>
          </div>
        </>
      )}

      {/* WARD */}

      {requireWard && (
        <>
          <br />

          <div>
            <label htmlFor="context-ward">
              Ward *
            </label>

            <br />

            <select
              id="context-ward"
              value={wardId}
              onChange={(event) =>
                handleWardChange(
                  event.target.value
                )
              }
              disabled={
                !constituencyId
              }
              required
            >
              <option value="">
                Select ward
              </option>

              {wards.map((ward) => (
                <option
                  key={ward.id}
                  value={ward.id}
                >
                  {ward.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </section>
  );
}