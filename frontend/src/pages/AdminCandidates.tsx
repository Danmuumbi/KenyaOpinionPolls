import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  createCandidate,
  deleteCandidate,
  getCandidates,
  getAdminPositions,
} from "../api/admin";

import type {
  AdminCandidate,
  AdminPosition,
} from "../api/admin";

const API_URL = "http://localhost:5000/api";

interface County {
  id: string;
  name: string;
  code?: number;
}

interface Constituency {
  id: string;
  name: string;
  code?: string;
  countyId: string;
}

interface Ward {
  id: string;
  name: string;
  code?: string;
  constituencyId: string;
}

/*
|--------------------------------------------------------------------------
| Geography API helper
|--------------------------------------------------------------------------
*/

async function fetchGeography<T>(
  endpoint: string
): Promise<T[]> {
  const token = localStorage.getItem("token");

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const contentType =
    response.headers.get("content-type") || "";

  /*
   * Prevent errors such as:
   * Unexpected token '<', "<!DOCTYPE "... is not valid JSON
   *
   * This happens when the backend returns an HTML 404 page.
   */
  if (!contentType.includes("application/json")) {
    const text = await response.text();

    throw new Error(
      response.ok
        ? "The server returned an unexpected response."
        : `Request failed (${response.status}).`
    );
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
        "Failed to load geography"
    );
  }

  return data.data as T[];
}

/*
|--------------------------------------------------------------------------
| Admin Candidates
|--------------------------------------------------------------------------
*/

export default function AdminCandidates() {
  const [positions, setPositions] =
    useState<AdminPosition[]>([]);

  const [candidates, setCandidates] =
    useState<AdminCandidate[]>([]);

  const [counties, setCounties] =
    useState<County[]>([]);

  const [
    constituencies,
    setConstituencies,
  ] = useState<Constituency[]>([]);

  const [wards, setWards] =
    useState<Ward[]>([]);

  const [positionId, setPositionId] =
    useState("");

  const [countyId, setCountyId] =
    useState("");

  const [
    constituencyId,
    setConstituencyId,
  ] = useState("");

  const [wardId, setWardId] =
    useState("");

  const [name, setName] =
    useState("");

  const [party, setParty] =
    useState("");

  const [photoUrl, setPhotoUrl] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load initial data
  |--------------------------------------------------------------------------
  */

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      /*
       * Candidates and positions are the important
       * page data. They are loaded independently from
       * geography so a geography error cannot hide
       * existing candidates.
       */
      const [
        positionList,
        candidateList,
      ] = await Promise.all([
        getAdminPositions(),
        getCandidates(),
      ]);

      setPositions(positionList);
      setCandidates(candidateList);

      /*
       * Geography is loaded separately.
       *
       * IMPORTANT:
       * The correct backend endpoint is:
       * /geography/counties
       */
      try {
        const countyList =
          await fetchGeography<County>(
            "/geography/counties"
          );

        setCounties(countyList);
      } catch (geoError) {
        console.error(
          "Failed to load counties:",
          geoError
        );

        setCounties([]);

        setError(
          geoError instanceof Error
            ? geoError.message
            : "Failed to load counties"
        );
      }
    } catch (err) {
      console.error(
        "Failed to load candidates:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load candidates"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Selected position and scope
  |--------------------------------------------------------------------------
  */

  const selectedPosition =
    positions.find(
      (position) =>
        position.id === positionId
    );

  const scope =
    selectedPosition?.scope || "";

  const requiresCounty =
    scope === "COUNTY" ||
    scope === "CONSTITUENCY" ||
    scope === "WARD";

  const requiresConstituency =
    scope === "CONSTITUENCY" ||
    scope === "WARD";

  const requiresWard =
    scope === "WARD";

  /*
  |--------------------------------------------------------------------------
  | Load constituencies
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!countyId) {
      setConstituencies([]);
      return;
    }

    async function loadConstituencies() {
      try {
        /*
         * Correct backend endpoint:
         *
         * /geography/counties/:countyId/constituencies
         */
        const data =
          await fetchGeography<Constituency>(
            `/geography/counties/${countyId}/constituencies`
          );

        setConstituencies(data);
      } catch (err) {
        console.error(
          "Failed to load constituencies:",
          err
        );

        setConstituencies([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load constituencies"
        );
      }
    }

    loadConstituencies();
  }, [countyId]);

  /*
  |--------------------------------------------------------------------------
  | Load wards
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!constituencyId) {
      setWards([]);
      return;
    }

    async function loadWards() {
      try {
        /*
         * Correct backend endpoint:
         *
         * /geography/constituencies/:constituencyId/wards
         */
        const data =
          await fetchGeography<Ward>(
            `/geography/constituencies/${constituencyId}/wards`
          );

        setWards(data);
      } catch (err) {
        console.error(
          "Failed to load wards:",
          err
        );

        setWards([]);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load wards"
        );
      }
    }

    loadWards();
  }, [constituencyId]);

  /*
  |--------------------------------------------------------------------------
  | Position change
  |--------------------------------------------------------------------------
  */

  function handlePositionChange(
    value: string
  ) {
    setPositionId(value);

    const position =
      positions.find(
        (item) =>
          item.id === value
      );

    const newScope =
      position?.scope || "";

    if (
      newScope !== "COUNTY" &&
      newScope !== "CONSTITUENCY" &&
      newScope !== "WARD"
    ) {
      setCountyId("");
      setConstituencyId("");
      setWardId("");
    } else if (
      newScope === "COUNTY"
    ) {
      setConstituencyId("");
      setWardId("");
    } else if (
      newScope === "CONSTITUENCY"
    ) {
      setWardId("");
    }

    setError("");
  }

  /*
  |--------------------------------------------------------------------------
  | County change
  |--------------------------------------------------------------------------
  */

  function handleCountyChange(
    value: string
  ) {
    setCountyId(value);
    setConstituencyId("");
    setWardId("");
    setError("");
  }

  /*
  |--------------------------------------------------------------------------
  | Constituency change
  |--------------------------------------------------------------------------
  */

  function handleConstituencyChange(
    value: string
  ) {
    setConstituencyId(value);
    setWardId("");
    setError("");
  }

  /*
  |--------------------------------------------------------------------------
  | Create candidate
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError(
        "Candidate name is required"
      );
      return;
    }

    if (!positionId) {
      setError(
        "Position is required"
      );
      return;
    }

    if (
      requiresCounty &&
      !countyId
    ) {
      setError(
        "County is required for this position"
      );
      return;
    }

    if (
      requiresConstituency &&
      !constituencyId
    ) {
      setError(
        "Constituency is required for this position"
      );
      return;
    }

    if (
      requiresWard &&
      !wardId
    ) {
      setError(
        "Ward is required for this position"
      );
      return;
    }

    try {
      setSaving(true);

      const candidate =
        await createCandidate({
          name: name.trim(),

          party:
            party.trim() ||
            undefined,

          photoUrl:
            photoUrl.trim() ||
            undefined,

          description:
            description.trim() ||
            undefined,

          positionId,

          countyId:
            countyId ||
            undefined,

          constituencyId:
            constituencyId ||
            undefined,

          wardId:
            wardId ||
            undefined,
        });

      /*
       * Add the new candidate immediately
       * to the existing list.
       */
      setCandidates((current) => [
        candidate,
        ...current,
      ]);

      /*
       * Clear form.
       */
      setName("");
      setParty("");
      setPhotoUrl("");
      setDescription("");

      setSuccess(
        "Candidate created successfully."
      );
    } catch (err) {
      console.error(
        "Failed to create candidate:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create candidate"
      );
    } finally {
      setSaving(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Deactivate candidate
  |--------------------------------------------------------------------------
  */

  async function handleDeactivate(
    candidate: AdminCandidate
  ) {
    const confirmed =
      window.confirm(
        `Deactivate ${candidate.name}?\n\nThey will no longer appear publicly, but their existing poll responses will be preserved.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(candidate.id);
      setError("");
      setSuccess("");

      await deleteCandidate(
        candidate.id
      );

      /*
       * The backend performs a soft delete
       * by setting isActive=false.
       *
       * We remove it from this active list
       * without touching historical responses.
       */
      setCandidates((current) =>
        current.filter(
          (item) =>
            item.id !== candidate.id
        )
      );

      setSuccess(
        `${candidate.name} has been deactivated.`
      );
    } catch (err) {
      console.error(
        "Failed to deactivate candidate:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to deactivate candidate"
      );
    } finally {
      setDeletingId(null);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-xl bg-white p-8 shadow-sm">
            Loading candidates...
          </div>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Page
  |--------------------------------------------------------------------------
  */

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl">

        {/* Header */}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Candidates
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage candidates used in
            public opinion polls.
          </p>
        </div>

        {/* Error */}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Success */}

        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Create Candidate */}

        <section className="mb-8 rounded-xl bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-lg font-semibold text-slate-900">
            Add Candidate
          </h2>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            <div className="grid gap-5 md:grid-cols-2">

              {/* Name */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Candidate Name *
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setName(
                      e.target.value
                    )
                  }
                  placeholder="Candidate name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Party */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Party
                </label>

                <input
                  type="text"
                  value={party}
                  onChange={(e) =>
                    setParty(
                      e.target.value
                    )
                  }
                  placeholder="Political party"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Position */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Position *
                </label>

                <select
                  value={positionId}
                  onChange={(e) =>
                    handlePositionChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">
                    Select position
                  </option>

                  {positions
                    .filter(
                      (position) =>
                        position.isActive
                    )
                    .map(
                      (position) => (
                        <option
                          key={
                            position.id
                          }
                          value={
                            position.id
                          }
                        >
                          {position.name}
                        </option>
                      )
                    )}
                </select>
              </div>

              {/* Photo */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Photo URL
                </label>

                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) =>
                    setPhotoUrl(
                      e.target.value
                    )
                  }
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

            </div>

            {/* Geography */}

            <div className="grid gap-5 md:grid-cols-3">

              {/* County */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  County
                  {requiresCounty &&
                    " *"}
                </label>

                <select
                  value={countyId}
                  disabled={
                    !requiresCounty
                  }
                  onChange={(e) =>
                    handleCountyChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {requiresCounty
                      ? "Select county"
                      : "Not required"}
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

              {/* Constituency */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Constituency
                  {requiresConstituency &&
                    " *"}
                </label>

                <select
                  value={
                    constituencyId
                  }
                  disabled={
                    !requiresConstituency ||
                    !countyId
                  }
                  onChange={(e) =>
                    handleConstituencyChange(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {requiresConstituency
                      ? "Select constituency"
                      : "Not required"}
                  </option>

                  {constituencies.map(
                    (constituency) => (
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

              {/* Ward */}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Ward
                  {requiresWard &&
                    " *"}
                </label>

                <select
                  value={wardId}
                  disabled={
                    !requiresWard ||
                    !constituencyId
                  }
                  onChange={(e) =>
                    setWardId(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  <option value="">
                    {requiresWard
                      ? "Select ward"
                      : "Not required"}
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

            </div>

            {/* Description */}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Optional candidate description"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Submit */}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Adding..."
                  : "Add Candidate"}
              </button>
            </div>

          </form>
        </section>

        {/* Existing Candidates */}

        <section className="rounded-xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-4">

            <h2 className="text-lg font-semibold text-slate-900">
              Existing Candidates
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {candidates.length} active candidate
              {candidates.length === 1
                ? ""
                : "s"}
            </p>

          </div>

          {candidates.length === 0 ? (

            <div className="p-8 text-center text-sm text-slate-500">
              No active candidates found.
            </div>

          ) : (

            <div className="divide-y divide-slate-200">

              {candidates.map(
                (candidate) => (

                  <div
                    key={candidate.id}
                    className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                  >

                    {/* Candidate */}

                    <div className="flex min-w-0 items-center gap-4">

                      {candidate.photoUrl ? (

                        <img
                          src={
                            candidate.photoUrl
                          }
                          alt={
                            candidate.name
                          }
                          className="h-14 w-14 shrink-0 rounded-full border border-slate-200 object-cover"
                        />

                      ) : (

                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg font-semibold text-slate-500">
                          {candidate.name
                            .charAt(0)
                            .toUpperCase()}
                        </div>

                      )}

                      <div className="min-w-0">

                        <h3 className="font-semibold text-slate-900">
                          {
                            candidate.name
                          }
                        </h3>

                        <p className="text-sm text-slate-500">
                          {
                            candidate
                              .position
                              ?.name ||
                            "No position"
                          }
                        </p>

                        {candidate.party && (
                          <p className="text-sm text-slate-500">
                            {
                              candidate.party
                            }
                          </p>
                        )}

                        <div className="mt-1 text-xs text-slate-400">

                          {candidate.ward?.name ||
                            candidate.constituency?.name ||
                            candidate.county?.name ||
                            "No location"}

                        </div>

                      </div>

                    </div>

                    {/* Actions */}

                    <div className="flex shrink-0 items-center gap-2">

                      <Link
                        to={`/admin/candidates/${candidate.id}/edit`}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        onClick={() =>
                          handleDeactivate(
                            candidate
                          )
                        }
                        disabled={
                          deletingId ===
                          candidate.id
                        }
                        className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId ===
                        candidate.id
                          ? "Deactivating..."
                          : "Deactivate"}
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </div>
    </main>
  );
}