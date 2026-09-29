import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  getCandidates,
  getAdminPositions,
  updateCandidate,
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
| Geography helper
|--------------------------------------------------------------------------
*/

async function fetchGeography<T>(
  endpoint: string
): Promise<T[]> {
  const token =
    localStorage.getItem("token");

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  if (!contentType.includes("application/json")) {
    await response.text();

    throw new Error(
      `Request failed (${response.status}).`
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
| Edit Candidate
|--------------------------------------------------------------------------
*/

export default function AdminCandidateEdit() {
  const { candidateId } =
    useParams<{
      candidateId: string;
    }>();

  const navigate = useNavigate();

  const [candidate, setCandidate] =
    useState<AdminCandidate | null>(null);

  const [positions, setPositions] =
    useState<AdminPosition[]>([]);

  const [counties, setCounties] =
    useState<County[]>([]);

  const [
    constituencies,
    setConstituencies,
  ] = useState<Constituency[]>([]);

  const [wards, setWards] =
    useState<Ward[]>([]);

  const [name, setName] =
    useState("");

  const [party, setParty] =
    useState("");

  const [photoUrl, setPhotoUrl] =
    useState("");

  const [description, setDescription] =
    useState("");

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

  const [isActive, setIsActive] =
    useState(true);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load candidate
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function loadCandidate() {
      try {
        setLoading(true);
        setError("");

        if (!candidateId) {
          setError(
            "Candidate ID is missing."
          );
          return;
        }

        /*
         * Use the exact same candidate endpoint
         * used by the working Candidates page.
         */
        const [
          candidateList,
          positionList,
          countyList,
        ] = await Promise.all([
          getCandidates(),
          getAdminPositions(),
          fetchGeography<County>(
            "/geography/counties"
          ),
        ]);

        /*
         * Find the candidate using the ID
         * from the URL.
         */
        const foundCandidate =
          candidateList.find(
            (item) =>
              item.id === candidateId
          );

        if (!foundCandidate) {
          console.error(
            "Candidate was not found.",
            {
              candidateId,
              availableCandidates:
                candidateList.map(
                  (item) => ({
                    id: item.id,
                    name: item.name,
                  })
                ),
            }
          );

          setError(
            "Candidate not found."
          );

          return;
        }

        setCandidate(
          foundCandidate
        );

        setPositions(
          positionList
        );

        setCounties(
          countyList
        );

        /*
         * Populate form.
         */
        setName(
          foundCandidate.name || ""
        );

        setParty(
          foundCandidate.party || ""
        );

        setPhotoUrl(
          foundCandidate.photoUrl ||
            ""
        );

        setDescription(
          foundCandidate.description ||
            ""
        );

        setPositionId(
          foundCandidate.positionId ||
            ""
        );

        setCountyId(
          foundCandidate.countyId ||
            ""
        );

        setConstituencyId(
          foundCandidate.constituencyId ||
            ""
        );

        setWardId(
          foundCandidate.wardId ||
            ""
        );

        setIsActive(
          foundCandidate.isActive
        );
      } catch (err) {
        console.error(
          "Failed to load candidate:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load candidate"
        );
      } finally {
        setLoading(false);
      }
    }

    loadCandidate();
  }, [candidateId]);

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
  | Position scope
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
  }

  /*
  |--------------------------------------------------------------------------
  | Save
  |--------------------------------------------------------------------------
  */

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!candidateId) {
      setError(
        "Candidate ID is missing."
      );
      return;
    }

    if (!name.trim()) {
      setError(
        "Candidate name is required."
      );
      return;
    }

    if (!positionId) {
      setError(
        "Position is required."
      );
      return;
    }

    if (
      requiresCounty &&
      !countyId
    ) {
      setError(
        "County is required for this position."
      );
      return;
    }

    if (
      requiresConstituency &&
      !constituencyId
    ) {
      setError(
        "Constituency is required for this position."
      );
      return;
    }

    if (
      requiresWard &&
      !wardId
    ) {
      setError(
        "Ward is required for this position."
      );
      return;
    }

    try {
      setSaving(true);

      const updatedCandidate =
        await updateCandidate(
          candidateId,
          {
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

            isActive,
          }
        );

      setCandidate(
        updatedCandidate
      );

      setSuccess(
        "Candidate updated successfully."
      );
    } catch (err) {
      console.error(
        "Failed to update candidate:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update candidate"
      );
    } finally {
      setSaving(false);
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
        <div className="mx-auto max-w-4xl">
          <div className="rounded-xl bg-white p-8 shadow-sm">
            Loading candidate...
          </div>
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error / not found
  |--------------------------------------------------------------------------
  */

  if (!candidate) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">

          <div className="mb-6">
            <Link
              to="/admin/candidates"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              ← Back to Candidates
            </Link>
          </div>

          <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm">

            <h1 className="text-xl font-semibold text-slate-900">
              Candidate not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              {error ||
                "The candidate could not be found."}
            </p>

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
      <div className="mx-auto max-w-4xl">

        {/* Back */}

        <div className="mb-6">
          <Link
            to="/admin/candidates"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Candidates
          </Link>
        </div>

        {/* Header */}

        <div className="mb-6">

          <h1 className="text-2xl font-bold text-slate-900">
            Edit Candidate
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Update candidate information,
            position, location, or status.
          </p>

        </div>

        {/* Messages */}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Form */}

        <section className="rounded-xl bg-white p-6 shadow-sm">

          <form
            onSubmit={handleSubmit}
            className="space-y-6"
          >

            {/* Basic information */}

            <div className="grid gap-5 md:grid-cols-2">

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
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

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
                rows={4}
                placeholder="Optional candidate description"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Status */}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">

              <label className="flex items-center gap-3">

                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) =>
                    setIsActive(
                      e.target.checked
                    )
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />

                <span className="text-sm font-medium text-slate-700">
                  Candidate is active
                </span>

              </label>

              <p className="mt-1 ml-7 text-xs text-slate-500">
                Inactive candidates will not
                appear in public polls.
              </p>

            </div>

            {/* Actions */}

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-5">

              <Link
                to="/admin/candidates"
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </div>

          </form>

        </section>

      </div>
    </main>
  );
}