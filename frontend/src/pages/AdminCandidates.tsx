import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { FormEvent } from "react";

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

import "./AdminCandidates.css";

const API_URL =
  "https://kenyaopinionpolls.onrender.com/api";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

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

/* --------------------------------------------------------------------------
   Geography API
   -------------------------------------------------------------------------- */

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

/* --------------------------------------------------------------------------
   Admin Candidates
   -------------------------------------------------------------------------- */

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

  /* ------------------------------------------------------------------------
     Create form
     ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------
     Page state
     ------------------------------------------------------------------------ */

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

  const [showCreatePanel, setShowCreatePanel] =
    useState(false);

  /* ------------------------------------------------------------------------
     Directory filters
     ------------------------------------------------------------------------ */

  const [search, setSearch] =
    useState("");

  const [filterPositionId, setFilterPositionId] =
    useState("");

  const [filterCountyId, setFilterCountyId] =
    useState("");

  const [
    filterConstituencyId,
    setFilterConstituencyId,
  ] = useState("");

  const [filterWardId, setFilterWardId] =
    useState("");

  const [filterParty, setFilterParty] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pageSize, setPageSize] =
    useState(25);

  /* ------------------------------------------------------------------------
     Load initial data
     ------------------------------------------------------------------------ */

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [
        positionList,
        candidateList,
      ] = await Promise.all([
        getAdminPositions(),
        getCandidates(),
      ]);

      setPositions(positionList);
      setCandidates(candidateList);

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

  /* ------------------------------------------------------------------------
     Create form position / scope
     ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------
     Load constituencies for create form
     ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------
     Load wards for create form
     ------------------------------------------------------------------------ */

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

  /* ------------------------------------------------------------------------
     Create form handlers
     ------------------------------------------------------------------------ */

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

  function handleCountyChange(
    value: string
  ) {
    setCountyId(value);
    setConstituencyId("");
    setWardId("");
    setError("");
  }

  function handleConstituencyChange(
    value: string
  ) {
    setConstituencyId(value);
    setWardId("");
    setError("");
  }

  /* ------------------------------------------------------------------------
     Directory filter geography
     ------------------------------------------------------------------------ */

  const filterConstituencies =
    useMemo(() => {
      if (!filterCountyId) {
        return [];
      }

      return counties.length
        ? constituencies.filter(
            (item) =>
              item.countyId ===
              filterCountyId
          )
        : [];
    }, [
      filterCountyId,
      constituencies,
      counties.length,
    ]);

  const filterWards =
    useMemo(() => {
      if (!filterConstituencyId) {
        return [];
      }

      return wards.filter(
        (item) =>
          item.constituencyId ===
          filterConstituencyId
      );
    }, [
      filterConstituencyId,
      wards,
    ]);

  /* ------------------------------------------------------------------------
     Load filter geography when county changes
     ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!filterCountyId) {
      return;
    }

    async function loadFilterConstituencies() {
      try {
        const data =
          await fetchGeography<Constituency>(
            `/geography/counties/${filterCountyId}/constituencies`
          );

        setConstituencies((current) => {
          const existing = new Map(
            current.map((item) => [
              item.id,
              item,
            ])
          );

          data.forEach((item) => {
            existing.set(item.id, item);
          });

          return Array.from(
            existing.values()
          );
        });
      } catch (err) {
        console.error(
          "Failed to load filter constituencies:",
          err
        );
      }
    }

    loadFilterConstituencies();
  }, [filterCountyId]);

  /* ------------------------------------------------------------------------
     Load filter wards when constituency changes
     ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!filterConstituencyId) {
      return;
    }

    async function loadFilterWards() {
      try {
        const data =
          await fetchGeography<Ward>(
            `/geography/constituencies/${filterConstituencyId}/wards`
          );

        setWards((current) => {
          const existing = new Map(
            current.map((item) => [
              item.id,
              item,
            ])
          );

          data.forEach((item) => {
            existing.set(item.id, item);
          });

          return Array.from(
            existing.values()
          );
        });
      } catch (err) {
        console.error(
          "Failed to load filter wards:",
          err
        );
      }
    }

    loadFilterWards();
  }, [filterConstituencyId]);

  /* ------------------------------------------------------------------------
     Party filter options
     ------------------------------------------------------------------------ */

  const partyOptions =
    useMemo(() => {
      const parties = new Set<string>();

      candidates.forEach(
        (candidate) => {
          if (candidate.party?.trim()) {
            parties.add(
              candidate.party.trim()
            );
          }
        }
      );

      return Array.from(parties).sort(
        (a, b) =>
          a.localeCompare(b)
      );
    }, [candidates]);

  /* ------------------------------------------------------------------------
     Filter candidates
     ------------------------------------------------------------------------ */

  const filteredCandidates =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return candidates.filter(
        (candidate) => {
          const matchesSearch =
            !normalizedSearch ||
            candidate.name
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            candidate.party
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            candidate.position?.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            candidate.county?.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            candidate.constituency?.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            candidate.ward?.name
              ?.toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesPosition =
            !filterPositionId ||
            candidate.position?.id ===
              filterPositionId;

          const matchesCounty =
            !filterCountyId ||
            candidate.county?.id ===
              filterCountyId;

          const matchesConstituency =
            !filterConstituencyId ||
            candidate.constituency?.id ===
              filterConstituencyId;

          const matchesWard =
            !filterWardId ||
            candidate.ward?.id ===
              filterWardId;

          const matchesParty =
            !filterParty ||
            candidate.party ===
              filterParty;

          return (
            matchesSearch &&
            matchesPosition &&
            matchesCounty &&
            matchesConstituency &&
            matchesWard &&
            matchesParty
          );
        }
      );
    }, [
      candidates,
      search,
      filterPositionId,
      filterCountyId,
      filterConstituencyId,
      filterWardId,
      filterParty,
    ]);

  /* ------------------------------------------------------------------------
     Pagination
     ------------------------------------------------------------------------ */

  const totalFiltered =
    filteredCandidates.length;

  const totalPages = Math.max(
    1,
    Math.ceil(
      totalFiltered / pageSize
    )
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedCandidates =
    useMemo(() => {
      const start =
        (page - 1) * pageSize;

      return filteredCandidates.slice(
        start,
        start + pageSize
      );
    }, [
      filteredCandidates,
      page,
      pageSize,
    ]);

  const rangeStart =
    totalFiltered === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const rangeEnd = Math.min(
    page * pageSize,
    totalFiltered
  );

  /* ------------------------------------------------------------------------
     Filter helpers
     ------------------------------------------------------------------------ */

  const hasActiveFilters =
    Boolean(
      search ||
        filterPositionId ||
        filterCountyId ||
        filterConstituencyId ||
        filterWardId ||
        filterParty
    );

  function resetPage() {
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setFilterPositionId("");
    setFilterCountyId("");
    setFilterConstituencyId("");
    setFilterWardId("");
    setFilterParty("");
    setPage(1);
  }

  function handleFilterCountyChange(
    value: string
  ) {
    setFilterCountyId(value);
    setFilterConstituencyId("");
    setFilterWardId("");
    resetPage();
  }

  function handleFilterConstituencyChange(
    value: string
  ) {
    setFilterConstituencyId(value);
    setFilterWardId("");
    resetPage();
  }

  function handleFilterPositionChange(
    value: string
  ) {
    setFilterPositionId(value);
    resetPage();
  }

  function handleFilterWardChange(
    value: string
  ) {
    setFilterWardId(value);
    resetPage();
  }

  function handleSearchChange(
    value: string
  ) {
    setSearch(value);
    resetPage();
  }

  function handlePartyChange(
    value: string
  ) {
    setFilterParty(value);
    resetPage();
  }

  function handlePageSizeChange(
    value: number
  ) {
    setPageSize(value);
    setPage(1);
  }

  /* ------------------------------------------------------------------------
     Create candidate
     ------------------------------------------------------------------------ */

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

      setCandidates(
        (current) => [
          candidate,
          ...current,
        ]
      );

      setName("");
      setParty("");
      setPhotoUrl("");
      setDescription("");

      setSuccess(
        "Candidate created successfully."
      );

      setShowCreatePanel(false);
      setPage(1);
      clearFilters();
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

  /* ------------------------------------------------------------------------
     Deactivate candidate
     ------------------------------------------------------------------------ */

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
      setDeletingId(
        candidate.id
      );

      setError("");
      setSuccess("");

      await deleteCandidate(
        candidate.id
      );

      setCandidates(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              candidate.id
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

  /* ------------------------------------------------------------------------
     Loading
     ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="candidates-loading">
        <div className="candidates-loading-inner">
          <div className="candidates-loading-mark">
            SFD
          </div>

          <div>
            <strong>
              Loading candidate directory
            </strong>

            <span>
              Preparing your candidate records...
            </span>
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------
     Page
     ------------------------------------------------------------------------ */

  return (
    <main className="candidates-page">

      <div className="candidates-shell">

        {/* ================================================================
            HEADER
            ================================================================ */}

        <header className="candidates-header">

          <div className="candidates-header-main">

            <div className="candidates-breadcrumb">
              <Link to="/dashboard">
                Dashboard
              </Link>

              <span>/</span>

              <span>
                Candidates
              </span>
            </div>

            <div className="candidates-title-row">

              <div>
                <p className="candidates-eyebrow">
                  Candidate directory
                </p>

                <h1>
                  Candidates
                </h1>

                <p className="candidates-subtitle">
                  Search, filter and manage the
                  candidates available across
                  your polling system.
                </p>
              </div>

              <button
                type="button"
                className="candidates-add-button"
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setShowCreatePanel(true);
                }}
              >
                <span className="candidates-add-icon">
                  +
                </span>

                Add candidate
              </button>

            </div>

          </div>

        </header>

        {/* ================================================================
            NOTICES
            ================================================================ */}

        {error && (
          <div
            className="candidates-notice candidates-notice--error"
            role="alert"
          >
            <div className="candidates-notice-icon">
              !
            </div>

            <div>
              <strong>
                Something went wrong
              </strong>

              <span>
                {error}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div
            className="candidates-notice candidates-notice--success"
            role="status"
          >
            <div className="candidates-notice-icon">
              ✓
            </div>

            <div>
              <strong>
                Completed
              </strong>

              <span>
                {success}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              aria-label="Dismiss success message"
            >
              ×
            </button>
          </div>
        )}

        {/* ================================================================
            DIRECTORY
            ================================================================ */}

        <section className="candidates-directory">

          {/* Directory top bar */}

          <div className="candidates-directory-top">

            <div>
              <span className="candidates-directory-label">
                Candidate directory
              </span>

              <div className="candidates-directory-heading">

                <strong>
                  {totalFiltered.toLocaleString()}
                </strong>

                <span>
                  {hasActiveFilters
                    ? "matching candidates"
                    : "active candidates"}
                </span>

              </div>
            </div>

            <div className="candidates-view-note">
              Showing{" "}
              <strong>
                {rangeStart.toLocaleString()}
              </strong>
              {"–"}
              <strong>
                {rangeEnd.toLocaleString()}
              </strong>
            </div>

          </div>

          {/* ==============================================================
              SEARCH
              ============================================================== */}

          <div className="candidates-search-row">

            <div className="candidates-search">

              <span
                className="candidates-search-icon"
                aria-hidden="true"
              >
                ⌕
              </span>

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  handleSearchChange(
                    event.target.value
                  )
                }
                placeholder="Search by candidate, party, position or location..."
                aria-label="Search candidates"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    handleSearchChange("")
                  }
                  className="candidates-search-clear"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}

            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="candidates-clear-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}

          </div>

          {/* ==============================================================
              FILTER BAR
              ============================================================== */}

          <div className="candidates-filters">

            <div className="candidates-filter-title">
              <span className="filter-funnel">
                ≡
              </span>

              Filters
            </div>

            <div className="candidates-filter">

              <label htmlFor="filter-position">
                Position
              </label>

              <select
                id="filter-position"
                value={filterPositionId}
                onChange={(event) =>
                  handleFilterPositionChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All positions
                </option>

                {positions
                  .filter(
                    (position) =>
                      position.isActive
                  )
                  .map((position) => (
                    <option
                      key={position.id}
                      value={position.id}
                    >
                      {position.name}
                    </option>
                  ))}
              </select>

            </div>

            <div className="candidates-filter">

              <label htmlFor="filter-county">
                County
              </label>

              <select
                id="filter-county"
                value={filterCountyId}
                onChange={(event) =>
                  handleFilterCountyChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All counties
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

            <div className="candidates-filter">

              <label htmlFor="filter-constituency">
                Constituency
              </label>

              <select
                id="filter-constituency"
                value={
                  filterConstituencyId
                }
                disabled={
                  !filterCountyId
                }
                onChange={(event) =>
                  handleFilterConstituencyChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All constituencies
                </option>

                {filterConstituencies.map(
                  (constituency) => (
                    <option
                      key={
                        constituency.id
                      }
                      value={
                        constituency.id
                      }
                    >
                      {constituency.name}
                    </option>
                  )
                )}
              </select>

            </div>

            <div className="candidates-filter">

              <label htmlFor="filter-ward">
                Ward
              </label>

              <select
                id="filter-ward"
                value={filterWardId}
                disabled={
                  !filterConstituencyId
                }
                onChange={(event) =>
                  handleFilterWardChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All wards
                </option>

                {filterWards.map(
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

            <div className="candidates-filter">

              <label htmlFor="filter-party">
                Party
              </label>

              <select
                id="filter-party"
                value={filterParty}
                onChange={(event) =>
                  handlePartyChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All parties
                </option>

                {partyOptions.map(
                  (partyName) => (
                    <option
                      key={partyName}
                      value={partyName}
                    >
                      {partyName}
                    </option>
                  )
                )}
              </select>

            </div>

          </div>

          {/* ==============================================================
              ACTIVE FILTERS
              ============================================================== */}

          {hasActiveFilters && (
            <div className="candidates-active-filters">

              <span>
                Active filters
              </span>

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    handleSearchChange("")
                  }
                >
                  Search: "{search}"
                  <b>×</b>
                </button>
              )}

              {filterPositionId && (
                <button
                  type="button"
                  onClick={() =>
                    handleFilterPositionChange(
                      ""
                    )
                  }
                >
                  {
                    positions.find(
                      (item) =>
                        item.id ===
                        filterPositionId
                    )?.name
                  }
                  <b>×</b>
                </button>
              )}

              {filterCountyId && (
                <button
                  type="button"
                  onClick={() =>
                    handleFilterCountyChange(
                      ""
                    )
                  }
                >
                  {
                    counties.find(
                      (item) =>
                        item.id ===
                        filterCountyId
                    )?.name
                  }
                  <b>×</b>
                </button>
              )}

              {filterConstituencyId && (
                <button
                  type="button"
                  onClick={() =>
                    handleFilterConstituencyChange(
                      ""
                    )
                  }
                >
                  {
                    filterConstituencies.find(
                      (item) =>
                        item.id ===
                        filterConstituencyId
                    )?.name
                  }
                  <b>×</b>
                </button>
              )}

              {filterWardId && (
                <button
                  type="button"
                  onClick={() =>
                    handleFilterWardChange("")
                  }
                >
                  {
                    filterWards.find(
                      (item) =>
                        item.id ===
                        filterWardId
                    )?.name
                  }
                  <b>×</b>
                </button>
              )}

              {filterParty && (
                <button
                  type="button"
                  onClick={() =>
                    handlePartyChange("")
                  }
                >
                  {filterParty}
                  <b>×</b>
                </button>
              )}

            </div>
          )}

          {/* ==============================================================
              TABLE / DIRECTORY
              ============================================================== */}

          <div className="candidates-table">

            <div className="candidates-table-head">

              <span>
                Candidate
              </span>

              <span>
                Position
              </span>

              <span>
                Location
              </span>

              <span>
                Party
              </span>

              <span>
                Actions
              </span>

            </div>

            {paginatedCandidates.length === 0 ? (
              <div className="candidates-empty">

                <div className="candidates-empty-icon">
                  ⌕
                </div>

                <h2>
                  No candidates found
                </h2>

                <p>
                  {hasActiveFilters
                    ? "Try adjusting your search or filters."
                    : "There are no active candidates yet."}
                </p>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                  >
                    Clear all filters
                  </button>
                )}

              </div>
            ) : (
              paginatedCandidates.map(
                (candidate) => (
                  <article
                    key={candidate.id}
                    className="candidate-directory-row"
                  >

                    {/* Candidate */}

                    <div className="candidate-cell candidate-cell--person">

                      <div className="candidate-avatar">

                        {candidate.photoUrl ? (
                          <img
                            src={
                              candidate.photoUrl
                            }
                            alt=""
                          />
                        ) : (
                          <span>
                            {candidate.name
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}

                      </div>

                      <div className="candidate-person-info">

                        <strong>
                          {candidate.name}
                        </strong>

                        <span>
                          ID:{" "}
                          {candidate.id.slice(
                            0,
                            8
                          )}
                        </span>

                      </div>

                    </div>

                    {/* Position */}

                    <div className="candidate-cell">

                      <span className="candidate-mobile-label">
                        Position
                      </span>

                      <strong className="candidate-position">
                        {candidate.position
                          ?.name ||
                          "Unassigned"}
                      </strong>

                      {candidate.position
                        ?.scope && (
                        <small>
                          {
                            candidate.position
                              .scope
                          }
                        </small>
                      )}

                    </div>

                    {/* Location */}

                    <div className="candidate-cell">

                      <span className="candidate-mobile-label">
                        Location
                      </span>

                      <div className="candidate-location">

                        {candidate.ward?.name && (
                          <strong>
                            {candidate.ward.name}
                          </strong>
                        )}

                        {!candidate.ward
                          ?.name &&
                          candidate
                            .constituency
                            ?.name && (
                            <strong>
                              {
                                candidate
                                  .constituency
                                  .name
                              }
                            </strong>
                          )}

                        {!candidate.ward
                          ?.name &&
                          !candidate
                            .constituency
                            ?.name &&
                          candidate.county
                            ?.name && (
                            <strong>
                              {
                                candidate
                                  .county.name
                              }
                            </strong>
                          )}

                        {!candidate.ward
                          ?.name &&
                          !candidate
                            .constituency
                            ?.name &&
                          !candidate.county
                            ?.name && (
                            <span>
                              National
                            </span>
                          )}

                        {candidate.county
                          ?.name && (
                          <small>
                            {
                              candidate
                                .county.name
                            }
                          </small>
                        )}

                      </div>

                    </div>

                    {/* Party */}

                    <div className="candidate-cell">

                      <span className="candidate-mobile-label">
                        Party
                      </span>

                      {candidate.party ? (
                        <span className="candidate-party">
                          {candidate.party}
                        </span>
                      ) : (
                        <span className="candidate-no-party">
                          Independent / not specified
                        </span>
                      )}

                    </div>

                    {/* Actions */}

                    <div className="candidate-cell candidate-cell--actions">

                      <Link
                        to={`/admin/candidates/${candidate.id}/edit`}
                        className="candidate-edit-button"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        className="candidate-deactivate-button"
                        onClick={() =>
                          handleDeactivate(
                            candidate
                          )
                        }
                        disabled={
                          deletingId ===
                          candidate.id
                        }
                      >
                        {deletingId ===
                        candidate.id
                          ? "..."
                          : "Deactivate"}
                      </button>

                    </div>

                  </article>
                )
              )
            )}

          </div>

          {/* ==============================================================
              PAGINATION
              ============================================================== */}

          {totalFiltered > 0 && (
            <div className="candidates-pagination">

              <div className="candidates-page-size">

                <span>
                  Rows per page
                </span>

                <select
                  value={pageSize}
                  onChange={(event) =>
                    handlePageSizeChange(
                      Number(
                        event.target.value
                      )
                    )
                  }
                >
                  {PAGE_SIZE_OPTIONS.map(
                    (size) => (
                      <option
                        key={size}
                        value={size}
                      >
                        {size}
                      </option>
                    )
                  )}
                </select>

              </div>

              <div className="candidates-pagination-controls">

                <span className="candidates-pagination-summary">
                  {rangeStart.toLocaleString()}
                  {"–"}
                  {rangeEnd.toLocaleString()}
                  {" of "}
                  {totalFiltered.toLocaleString()}
                </span>

                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.max(
                          1,
                          current - 1
                        )
                    )
                  }
                  aria-label="Previous page"
                >
                  ←
                </button>

                <span className="candidates-page-number">
                  {page}
                  <small>
                    / {totalPages}
                  </small>
                </span>

                <button
                  type="button"
                  disabled={
                    page >= totalPages
                  }
                  onClick={() =>
                    setPage(
                      (current) =>
                        Math.min(
                          totalPages,
                          current + 1
                        )
                    )
                  }
                  aria-label="Next page"
                >
                  →
                </button>

              </div>

            </div>
          )}

        </section>

      </div>

      {/* ==================================================================
          CREATE CANDIDATE DRAWER
          ================================================================== */}

      {showCreatePanel && (
        <div className="candidate-drawer-layer">

          <button
            type="button"
            className="candidate-drawer-backdrop"
            onClick={() =>
              setShowCreatePanel(false)
            }
            aria-label="Close candidate form"
          />

          <aside
            className="candidate-drawer"
            aria-label="Add candidate"
          >

            <div className="candidate-drawer-header">

              <div>
                <span>
                  New record
                </span>

                <h2>
                  Add candidate
                </h2>

                <p>
                  Create a candidate and
                  assign their polling scope.
                </p>
              </div>

              <button
                type="button"
                className="candidate-drawer-close"
                onClick={() =>
                  setShowCreatePanel(false)
                }
                aria-label="Close"
              >
                ×
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="candidate-drawer-form"
            >

              <div className="candidate-form-section">

                <div className="candidate-form-section-title">
                  Candidate details
                </div>

                <div className="candidate-form-field">

                  <label htmlFor="candidate-name">
                    Full name
                    <b>*</b>
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
                    placeholder="Candidate full name"
                    autoFocus
                  />

                </div>

                <div className="candidate-form-two">

                  <div className="candidate-form-field">

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
                      placeholder="Party"
                    />

                  </div>

                  <div className="candidate-form-field">

                    <label htmlFor="candidate-photo">
                      Photo URL
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

                  </div>

                </div>

              </div>

              <div className="candidate-form-section">

                <div className="candidate-form-section-title">
                  Position & scope
                </div>

                <div className="candidate-form-field">

                  <label htmlFor="candidate-position">
                    Position
                    <b>*</b>
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
                            {
                              position.name
                            }
                          </option>
                        )
                      )}
                  </select>

                </div>

                <div className="candidate-form-field">

                  <label htmlFor="candidate-county">
                    County
                    {requiresCounty && (
                      <b>*</b>
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
                          key={county.id}
                          value={county.id}
                        >
                          {county.name}
                        </option>
                      )
                    )}
                  </select>

                </div>

                <div className="candidate-form-two">

                  <div className="candidate-form-field">

                    <label htmlFor="candidate-constituency">
                      Constituency
                      {requiresConstituency && (
                        <b>*</b>
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

                  <div className="candidate-form-field">

                    <label htmlFor="candidate-ward">
                      Ward
                      {requiresWard && (
                        <b>*</b>
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
                            value={ward.id}
                          >
                            {ward.name}
                          </option>
                        )
                      )}
                    </select>

                  </div>

                </div>

              </div>

              <div className="candidate-form-section">

                <div className="candidate-form-section-title">
                  Additional information
                </div>

                <div className="candidate-form-field">

                  <label htmlFor="candidate-description">
                    Description
                  </label>

                  <textarea
                    id="candidate-description"
                    value={description}
                    onChange={(event) =>
                      setDescription(
                        event.target.value
                      )
                    }
                    placeholder="Optional factual description..."
                    rows={5}
                  />

                </div>

              </div>

              <div className="candidate-drawer-footer">

                <button
                  type="button"
                  className="candidate-cancel-button"
                  onClick={() =>
                    setShowCreatePanel(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="candidate-save-button"
                  disabled={saving}
                >
                  {saving
                    ? "Creating..."
                    : "Create candidate"}
                </button>

              </div>

            </form>

          </aside>

        </div>
      )}

    </main>
  );
}