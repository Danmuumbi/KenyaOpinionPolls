import {
  useEffect,
  useState,
} from "react";

import type { FormEvent } from "react";

import {
  Link,
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

import "./AdminCandidateEdit.css";

const API_URL = "https://kenyaopinionpolls.onrender.com/api";
// const API_URL = "https://kenyaopinionpolls.onrender.com/api";



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

/* -------------------------------------------------------------------------- */
/* Geography helper                                                           */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Edit Candidate                                                             */
/* -------------------------------------------------------------------------- */

export default function AdminCandidateEdit() {
  const { candidateId } =
    useParams<{
      candidateId: string;
    }>();

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

  /* ------------------------------------------------------------------------ */
  /* Load candidate                                                            */
  /* ------------------------------------------------------------------------ */

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

        const foundCandidate =
          candidateList.find(
            (item) =>
              item.id === candidateId
          );

        if (!foundCandidate) {
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

  /* ------------------------------------------------------------------------ */
  /* Load constituencies                                                       */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Load wards                                                               */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Position scope                                                           */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Position change                                                          */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* County change                                                            */
  /* ------------------------------------------------------------------------ */

  function handleCountyChange(
    value: string
  ) {
    setCountyId(value);
    setConstituencyId("");
    setWardId("");
  }

  /* ------------------------------------------------------------------------ */
  /* Constituency change                                                      */
  /* ------------------------------------------------------------------------ */

  function handleConstituencyChange(
    value: string
  ) {
    setConstituencyId(value);
    setWardId("");
  }

  /* ------------------------------------------------------------------------ */
  /* Save                                                                      */
  /* ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                   */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="candidate-edit-page">
        <div className="candidate-edit-loading">
          <div className="candidate-edit-loading-avatar" />

          <div className="candidate-edit-loading-content">
            <div />
            <div />
            <div />
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Not found                                                                 */
  /* ------------------------------------------------------------------------ */

  if (!candidate) {
    return (
      <main className="candidate-edit-page">
        <div className="candidate-edit-shell">
          <Link
            to="/admin/candidates"
            className="candidate-edit-back"
          >
            ← Candidates
          </Link>

          <section className="candidate-edit-not-found">
            <div className="candidate-edit-not-found-mark">
              ?
            </div>

            <p className="candidate-edit-eyebrow">
              Candidate management
            </p>

            <h1>
              Candidate not found
            </h1>

            <p>
              {error ||
                "The candidate could not be found."}
            </p>

            <Link
              to="/admin/candidates"
              className="candidate-edit-primary-button"
            >
              Return to candidates
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) =>
        part.charAt(0).toUpperCase()
      )
      .join("") || "?";

  const countyName =
    counties.find(
      (item) =>
        item.id === countyId
    )?.name;

  const constituencyName =
    constituencies.find(
      (item) =>
        item.id === constituencyId
    )?.name;

  const wardName =
    wards.find(
      (item) =>
        item.id === wardId
    )?.name;

  const locationParts = [
    wardName,
    constituencyName,
    countyName,
  ].filter(Boolean);

  return (
    <main className="candidate-edit-page">
      <div className="candidate-edit-shell">

        {/* ---------------------------------------------------------------- */}
        {/* Top navigation                                                    */}
        {/* ---------------------------------------------------------------- */}

        <div className="candidate-edit-topbar">
          <Link
            to="/admin/candidates"
            className="candidate-edit-back"
          >
            <span>←</span>
            Candidates
          </Link>

          <div className="candidate-edit-record">
            <span className="candidate-edit-record-dot" />
            Editing candidate
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Page heading                                                      */}
        {/* ---------------------------------------------------------------- */}

        <header className="candidate-edit-header">
          <div>
            <p className="candidate-edit-eyebrow">
              SFD Insights / Candidate management
            </p>

            <h1>
              Edit candidate
            </h1>

            <p className="candidate-edit-header-copy">
              Update the candidate profile,
              electoral position, geographic
              scope, or public visibility.
            </p>
          </div>

          <div
            className={`candidate-edit-status ${
              isActive
                ? "candidate-edit-status--active"
                : "candidate-edit-status--inactive"
            }`}
          >
            <span />
            {isActive
              ? "Active"
              : "Inactive"}
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Notices                                                           */}
        {/* ---------------------------------------------------------------- */}

        {error && (
          <div
            className="candidate-edit-notice candidate-edit-notice--error"
            role="alert"
          >
            <span className="candidate-edit-notice-icon">
              !
            </span>

            <div>
              <strong>
                Unable to save
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div
            className="candidate-edit-notice candidate-edit-notice--success"
            role="status"
          >
            <span className="candidate-edit-notice-icon">
              ✓
            </span>

            <div>
              <strong>
                Changes saved
              </strong>

              <p>{success}</p>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="candidate-edit-form"
        >

          {/* ============================================================= */}
          {/* Profile overview                                               */}
          {/* ============================================================= */}

          <section className="candidate-edit-profile">

            <div className="candidate-edit-profile-visual">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={name}
                  onError={(event) => {
                    event.currentTarget.style.display =
                      "none";
                  }}
                />
              ) : (
                <span>
                  {initials}
                </span>
              )}

              <div className="candidate-edit-profile-badge">
                {isActive
                  ? "LIVE"
                  : "OFF"}
              </div>
            </div>

            <div className="candidate-edit-profile-main">
              <p className="candidate-edit-profile-label">
                Candidate profile
              </p>

              <h2>
                {name ||
                  "Unnamed candidate"}
              </h2>

              <div className="candidate-edit-profile-meta">
                <span>
                  {selectedPosition?.name ||
                    "No position selected"}
                </span>

                {party && (
                  <>
                    <i />
                    <span>{party}</span>
                  </>
                )}
              </div>

              {locationParts.length > 0 && (
                <div className="candidate-edit-location">
                  <span className="candidate-edit-location-icon">
                    ⌖
                  </span>

                  {locationParts.join(
                    " · "
                  )}
                </div>
              )}
            </div>

            <div className="candidate-edit-profile-id">
              <span>Record</span>
              <code>
                {candidate.id.slice(
                  0,
                  10
                )}
                …
              </code>
            </div>
          </section>

          {/* ============================================================= */}
          {/* Main editing grid                                              */}
          {/* ============================================================= */}

          <div className="candidate-edit-grid">

            {/* =========================================================== */}
            {/* Main column                                                   */}
            {/* =========================================================== */}

            <div className="candidate-edit-main-column">

              {/* Basic information */}

              <section className="candidate-edit-section">
                <div className="candidate-edit-section-heading">
                  <div>
                    <span className="candidate-edit-section-number">
                      01
                    </span>

                    <div>
                      <h2>
                        Identity
                      </h2>

                      <p>
                        The information displayed
                        for this candidate.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="candidate-edit-fields">

                  <div className="candidate-edit-field candidate-edit-field--wide">
                    <label htmlFor="candidate-name">
                      Candidate name
                      <span>*</span>
                    </label>

                    <input
                      id="candidate-name"
                      type="text"
                      value={name}
                      onChange={(event) =>
                        setName(
                          event.target.value
                        )
                      }
                      autoComplete="name"
                    />
                  </div>

                  <div className="candidate-edit-field">
                    <label htmlFor="candidate-party">
                      Party
                    </label>

                    <input
                      id="candidate-party"
                      type="text"
                      value={party}
                      onChange={(event) =>
                        setParty(
                          event.target.value
                        )
                      }
                      placeholder="Political party"
                    />
                  </div>

                  <div className="candidate-edit-field candidate-edit-field--wide">
                    <label htmlFor="candidate-photo">
                      Profile photo URL
                    </label>

                    <input
                      id="candidate-photo"
                      type="url"
                      value={photoUrl}
                      onChange={(event) =>
                        setPhotoUrl(
                          event.target.value
                        )
                      }
                      placeholder="https://..."
                    />

                    <span className="candidate-edit-field-help">
                      Use a direct image URL.
                      The preview above updates
                      from this address.
                    </span>
                  </div>

                </div>
              </section>

              {/* Position */}

              <section className="candidate-edit-section">
                <div className="candidate-edit-section-heading">
                  <div>
                    <span className="candidate-edit-section-number">
                      02
                    </span>

                    <div>
                      <h2>
                        Electoral position
                      </h2>

                      <p>
                        Assign the position this
                        candidate belongs to.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="candidate-edit-position-control">

                  <div className="candidate-edit-field">
                    <label htmlFor="candidate-position">
                      Position
                      <span>*</span>
                    </label>

                    <select
                      id="candidate-position"
                      value={positionId}
                      onChange={(event) =>
                        handlePositionChange(
                          event.target.value
                        )
                      }
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

                  <div className="candidate-edit-scope-preview">
                    <span>
                      Required scope
                    </span>

                    <strong>
                      {scope ||
                        "Not defined"}
                    </strong>

                    <small>
                      {scope === "WARD"
                        ? "County → Constituency → Ward"
                        : scope ===
                          "CONSTITUENCY"
                        ? "County → Constituency"
                        : scope ===
                          "COUNTY"
                        ? "County"
                        : "No geographic scope"}
                    </small>
                  </div>

                </div>
              </section>

              {/* Geography */}

              <section className="candidate-edit-section">
                <div className="candidate-edit-section-heading">
                  <div>
                    <span className="candidate-edit-section-number">
                      03
                    </span>

                    <div>
                      <h2>
                        Geographic scope
                      </h2>

                      <p>
                        Define where this candidate
                        belongs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="candidate-edit-location-chain">

                  <div className="candidate-edit-field">
                    <label htmlFor="candidate-county">
                      County
                      {requiresCounty && (
                        <span>*</span>
                      )}
                    </label>

                    <select
                      id="candidate-county"
                      value={countyId}
                      disabled={
                        !requiresCounty
                      }
                      onChange={(event) =>
                        handleCountyChange(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        {requiresCounty
                          ? "Select county"
                          : "Not required"}
                      </option>

                      {counties.map(
                        (county) => (
                          <option
                            key={
                              county.id
                            }
                            value={
                              county.id
                            }
                          >
                            {county.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="candidate-edit-chain-arrow">
                    →
                  </div>

                  <div className="candidate-edit-field">
                    <label htmlFor="candidate-constituency">
                      Constituency
                      {requiresConstituency && (
                        <span>*</span>
                      )}
                    </label>

                    <select
                      id="candidate-constituency"
                      value={
                        constituencyId
                      }
                      disabled={
                        !requiresConstituency ||
                        !countyId
                      }
                      onChange={(event) =>
                        handleConstituencyChange(
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        {requiresConstituency
                          ? "Select constituency"
                          : "Not required"}
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

                  <div className="candidate-edit-chain-arrow">
                    →
                  </div>

                  <div className="candidate-edit-field">
                    <label htmlFor="candidate-ward">
                      Ward
                      {requiresWard && (
                        <span>*</span>
                      )}
                    </label>

                    <select
                      id="candidate-ward"
                      value={wardId}
                      disabled={
                        !requiresWard ||
                        !constituencyId
                      }
                      onChange={(event) =>
                        setWardId(
                          event.target.value
                        )
                      }
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
                            value={
                              ward.id
                            }
                          >
                            {ward.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                </div>

                {locationParts.length > 0 && (
                  <div className="candidate-edit-location-summary">
                    <span>
                      Current scope
                    </span>

                    <strong>
                      {locationParts.join(
                        " / "
                      )}
                    </strong>
                  </div>
                )}
              </section>

              {/* Description */}

              <section className="candidate-edit-section">
                <div className="candidate-edit-section-heading">
                  <div>
                    <span className="candidate-edit-section-number">
                      04
                    </span>

                    <div>
                      <h2>
                        Description
                      </h2>

                      <p>
                        Optional public-facing
                        candidate information.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="candidate-edit-field">
                  <label htmlFor="candidate-description">
                    Candidate description
                  </label>

                  <textarea
                    id="candidate-description"
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    rows={6}
                    placeholder="Add a short, factual description..."
                  />

                  <span className="candidate-edit-field-help">
                    Keep this factual and concise.
                    Avoid information that is not
                    relevant to the candidate profile.
                  </span>
                </div>
              </section>

            </div>

            {/* =========================================================== */}
            {/* Side column                                                   */}
            {/* =========================================================== */}

            <aside className="candidate-edit-sidebar">

              {/* Visibility */}

              <section className="candidate-edit-side-section">
                <p className="candidate-edit-side-label">
                  Public visibility
                </p>

                <button
                  type="button"
                  className={`candidate-edit-visibility ${
                    isActive
                      ? "candidate-edit-visibility--active"
                      : "candidate-edit-visibility--inactive"
                  }`}
                  onClick={() =>
                    setIsActive(
                      !isActive
                    )
                  }
                  aria-pressed={
                    isActive
                  }
                >
                  <span className="candidate-edit-toggle">
                    <span />
                  </span>

                  <span>
                    <strong>
                      {isActive
                        ? "Active"
                        : "Inactive"}
                    </strong>

                    <small>
                      {isActive
                        ? "Visible in eligible public polls"
                        : "Hidden from public polls"}
                    </small>
                  </span>
                </button>

                <p className="candidate-edit-side-help">
                  Changing this status does
                  not remove historical poll
                  responses.
                </p>
              </section>

              {/* Candidate snapshot */}

              <section className="candidate-edit-side-section">
                <p className="candidate-edit-side-label">
                  Current assignment
                </p>

                <div className="candidate-edit-assignment">

                  <div>
                    <span>
                      Position
                    </span>

                    <strong>
                      {selectedPosition?.name ||
                        "Not assigned"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Scope
                    </span>

                    <strong>
                      {scope ||
                        "None"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Location
                    </span>

                    <strong>
                      {locationParts.length
                        ? locationParts[
                            locationParts.length -
                              1
                          ]
                        : "Not assigned"}
                    </strong>
                  </div>

                </div>
              </section>

              {/* Important note */}

              <section className="candidate-edit-side-note">
                <span>i</span>

                <div>
                  <strong>
                    Historical responses
                  </strong>

                  <p>
                    Editing this record updates
                    the candidate profile. Existing
                    poll responses remain associated
                    with the candidate.
                  </p>
                </div>
              </section>

            </aside>

          </div>

          {/* ============================================================= */}
          {/* Action bar                                                      */}
          {/* ============================================================= */}

          <div className="candidate-edit-actions">

            <div>
              <span className="candidate-edit-actions-indicator" />

              <span>
                {saving
                  ? "Saving changes..."
                  : "Ready to save"}
              </span>
            </div>

            <div className="candidate-edit-action-buttons">
              <Link
                to="/admin/candidates"
                className="candidate-edit-cancel"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="candidate-edit-save"
              >
                {saving ? (
                  <>
                    <span className="candidate-edit-spinner" />
                    Saving
                  </>
                ) : (
                  <>
                    Save changes
                    <span>→</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </form>
      </div>
    </main>
  );
}