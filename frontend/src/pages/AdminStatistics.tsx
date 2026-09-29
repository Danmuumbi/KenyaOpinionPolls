
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAdminStatistics,
  getStatisticsFilters,
  getStatisticsCsvUrl,
  getStatisticsPdfUrl,
  type StatisticsFilters,
} from "../api/statistics";

export default function AdminStatistics() {
  const [statistics, setStatistics] =
    useState<any>(null);

  const [filterOptions, setFilterOptions] =
    useState<any>({
      polls: [],
      positions: [],
      campaigns: [],
      counties: [],
      constituencies: [],
      wards: [],
      candidates: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [filters, setFilters] =
    useState<StatisticsFilters>({});

  /*
  |--------------------------------------------------------------------------
  | LOAD FILTER OPTIONS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    async function loadFilters() {
      try {
        const data =
          await getStatisticsFilters();

        setFilterOptions(data);
      } catch (error: any) {
        setError(
          error.message ||
            "Failed to load filter options"
        );
      }
    }

    loadFilters();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD STATISTICS
  |--------------------------------------------------------------------------
  */

  async function loadStatistics() {
    try {
      setLoading(true);
      setError("");

      const result =
        await getAdminStatistics(
          filters
        );

      setStatistics(
        result.data
      );
    } catch (error: any) {
      setError(
        error.message ||
          "Failed to load statistics"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatistics();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | FILTER UPDATE
  |--------------------------------------------------------------------------
  */

  function updateFilter(
    key: keyof StatisticsFilters,
    value: string
  ) {
    setFilters(
      (current) => ({
        ...current,
        [key]:
          value || undefined,
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CASCADING CONSTITUENCIES
  |--------------------------------------------------------------------------
  */

  const filteredConstituencies =
    useMemo(() => {
      if (!filters.countyId) {
        return filterOptions.constituencies;
      }

      return filterOptions.constituencies.filter(
        (item: any) =>
          item.county?.id ===
          filters.countyId
      );
    }, [
      filterOptions.constituencies,
      filters.countyId,
    ]);

  /*
  |--------------------------------------------------------------------------
  | CASCADING WARDS
  |--------------------------------------------------------------------------
  */

  const filteredWards =
    useMemo(() => {
      return filterOptions.wards.filter(
        (item: any) => {
          const matchesCounty =
            !filters.countyId ||
            item.constituency
              ?.county?.id ===
              filters.countyId;

          const matchesConstituency =
            !filters.constituencyId ||
            item.constituency?.id ===
              filters.constituencyId;

          return (
            matchesCounty &&
            matchesConstituency
          );
        }
      );
    }, [
      filterOptions.wards,
      filters.countyId,
      filters.constituencyId,
    ]);

  /*
  |--------------------------------------------------------------------------
  | CASCADING CANDIDATES
  |--------------------------------------------------------------------------
  */

  const filteredCandidates =
    useMemo(() => {
      return filterOptions.candidates.filter(
        (candidate: any) => {
          const matchesPosition =
            !filters.positionId ||
            candidate.position?.id ===
              filters.positionId;

          const matchesCounty =
            !filters.countyId ||
            candidate.county?.id ===
              filters.countyId;

          const matchesConstituency =
            !filters.constituencyId ||
            candidate.constituency?.id ===
              filters.constituencyId;

          const matchesWard =
            !filters.wardId ||
            candidate.ward?.id ===
              filters.wardId;

          return (
            matchesPosition &&
            matchesCounty &&
            matchesConstituency &&
            matchesWard
          );
        }
      );
    }, [
      filterOptions.candidates,
      filters.positionId,
      filters.countyId,
      filters.constituencyId,
      filters.wardId,
    ]);

  /*
  |--------------------------------------------------------------------------
  | RESET DEPENDENT FILTERS
  |--------------------------------------------------------------------------
  */

  function handleCountyChange(
    countyId: string
  ) {
    setFilters(
      (current) => ({
        ...current,
        countyId:
          countyId || undefined,
        constituencyId:
          undefined,
        wardId:
          undefined,
        candidateId:
          undefined,
      })
    );
  }

  function handleConstituencyChange(
    constituencyId: string
  ) {
    setFilters(
      (current) => ({
        ...current,
        constituencyId:
          constituencyId ||
          undefined,
        wardId:
          undefined,
        candidateId:
          undefined,
      })
    );
  }

  function handleWardChange(
    wardId: string
  ) {
    setFilters(
      (current) => ({
        ...current,
        wardId:
          wardId || undefined,
        candidateId:
          undefined,
      })
    );
  }

  function handlePositionChange(
    positionId: string
  ) {
    setFilters(
      (current) => ({
        ...current,
        positionId:
          positionId || undefined,
        candidateId:
          undefined,
      })
    );
  }

  /*
  |--------------------------------------------------------------------------
  | CLEAR ALL FILTERS
  |--------------------------------------------------------------------------
  */

  function clearFilters() {
    setFilters({});

    setTimeout(() => {
      getAdminStatistics({})
        .then((result) => {
          setStatistics(
            result.data
          );
        })
        .catch((error) => {
          setError(
            error.message ||
              "Failed to reset statistics"
          );
        });
    }, 0);
  }

  /*
  |--------------------------------------------------------------------------
  | EXPORT
  |--------------------------------------------------------------------------
  */

  async function downloadFile(
    url: string,
    filename: string
  ) {
    try {
      setError("");

      const token =
        localStorage.getItem(
          "token"
        );

      const response =
        await fetch(url, {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        });

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          data?.message ||
            "Download failed"
        );
      }

      const blob =
        await response.blob();

      const downloadUrl =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          "a"
        );

      link.href =
        downloadUrl;

      link.download =
        filename;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        downloadUrl
      );
    } catch (error: any) {
      setError(
        error.message ||
          "Failed to download file"
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | LOADING
  |--------------------------------------------------------------------------
  */

  if (loading && !statistics) {
    return (
      <main className="admin-statistics-page">
        <div className="statistics-loading">
          Loading statistics...
        </div>
      </main>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PAGE
  |--------------------------------------------------------------------------
  */

  const overview =
    statistics?.overview;

  return (
    <main className="admin-statistics-page">

      {/* =========================================================
          HEADER
      ========================================================= */}

      <header className="statistics-header">

        <div>
          <h1>
            Opinion Poll Statistics
          </h1>

          <p>
            Detailed statistical
            analysis of recorded
            poll responses,
            participants and
            geographic participation.
          </p>
        </div>

        <div className="statistics-actions">

          <button
            type="button"
            onClick={
              loadStatistics
            }
          >
            Refresh
          </button>

          <button
            type="button"
            onClick={() =>
              downloadFile(
                getStatisticsCsvUrl(
                  filters
                ),
                "kenya-opinion-polls-statistics.csv"
              )
            }
          >
            Download CSV
          </button>

          <button
            type="button"
            onClick={() =>
              downloadFile(
                getStatisticsPdfUrl(
                  filters
                ),
                "kenya-opinion-polls-statistics.pdf"
              )
            }
          >
            Download PDF
          </button>

        </div>

      </header>


      {/* =========================================================
          ERROR
      ========================================================= */}

      {error && (
        <div className="statistics-error">
          <strong>
            Error:
          </strong>{" "}
          {error}

          <button
            type="button"
            onClick={() =>
              setError("")
            }
          >
            ×
          </button>
        </div>
      )}


      {/* =========================================================
          FILTERS
      ========================================================= */}

      <section className="statistics-section">

        <div className="section-heading">

          <h2>
            Filter Statistics
          </h2>

          <p>
            Combine multiple filters
            to analyse a specific
            position, candidate,
            county, constituency or
            ward.
          </p>

        </div>


        <div className="statistics-filters">

          {/* POLL */}

          <div>
            <label>
              Poll
            </label>

            <select
              value={
                filters.pollId ||
                ""
              }
              onChange={(event) =>
                updateFilter(
                  "pollId",
                  event.target.value
                )
              }
            >
              <option value="">
                All Polls
              </option>

              {filterOptions.polls.map(
                (poll: any) => (
                  <option
                    key={poll.id}
                    value={poll.id}
                  >
                    {poll.title}
                  </option>
                )
              )}

            </select>
          </div>


          {/* POLL TYPE */}

          <div>
            <label>
              Poll Type
            </label>

            <select
              value={
                filters.pollType ||
                ""
              }
              onChange={(event) =>
                updateFilter(
                  "pollType",
                  event.target.value
                )
              }
            >
              <option value="">
                All Types
              </option>

              <option value="GENERAL">
                General
              </option>

              <option value="POLITICAL">
                Political
              </option>

              <option value="CAMPAIGN">
                Campaign
              </option>

              <option value="PUBLIC_SERVICE">
                Public Service
              </option>

              <option value="RESEARCH">
                Research
              </option>

            </select>
          </div>


          {/* STATUS */}

          <div>
            <label>
              Poll Status
            </label>

            <select
              value={
                filters.pollStatus ||
                ""
              }
              onChange={(event) =>
                updateFilter(
                  "pollStatus",
                  event.target.value
                )
              }
            >
              <option value="">
                All Statuses
              </option>

              <option value="DRAFT">
                Draft
              </option>

              <option value="SCHEDULED">
                Scheduled
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="PAUSED">
                Paused
              </option>

              <option value="CLOSED">
                Closed
              </option>

              <option value="ARCHIVED">
                Archived
              </option>

            </select>
          </div>


          {/* POSITION */}

          <div>
            <label>
              Position
            </label>

            <select
              value={
                filters.positionId ||
                ""
              }
              onChange={(event) =>
                handlePositionChange(
                  event.target.value
                )
              }
            >
              <option value="">
                All Positions
              </option>

              {filterOptions.positions.map(
                (position: any) => (
                  <option
                    key={position.id}
                    value={position.id}
                  >
                    {position.name}
                  </option>
                )
              )}

            </select>
          </div>


          {/* CANDIDATE */}

          <div>
            <label>
              Candidate
            </label>

            <select
              value={
                filters.candidateId ||
                ""
              }
              onChange={(event) =>
                updateFilter(
                  "candidateId",
                  event.target.value
                )
              }
            >
              <option value="">
                All Candidates
              </option>

              {filteredCandidates.map(
                (candidate: any) => (
                  <option
                    key={candidate.id}
                    value={candidate.id}
                  >
                    {candidate.name}
                    {candidate.party
                      ? ` — ${candidate.party}`
                      : ""}
                  </option>
                )
              )}

            </select>
          </div>


          {/* CAMPAIGN */}

          <div>
            <label>
              Campaign
            </label>

            <select
              value={
                filters.campaignId ||
                ""
              }
              onChange={(event) =>
                updateFilter(
                  "campaignId",
                  event.target.value
                )
              }
            >
              <option value="">
                All Campaigns
              </option>

              {filterOptions.campaigns.map(
                (campaign: any) => (
                  <option
                    key={campaign.id}
                    value={campaign.id}
                  >
                    {campaign.name}
                  </option>
                )
              )}

            </select>
          </div>


          {/* COUNTY */}

          <div>
            <label>
              County
            </label>

            <select
              value={
                filters.countyId ||
                ""
              }
              onChange={(event) =>
                handleCountyChange(
                  event.target.value
                )
              }
            >
              <option value="">
                All Counties
              </option>

              {filterOptions.counties.map(
                (county: any) => (
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


          {/* CONSTITUENCY */}

          <div>
            <label>
              Constituency
            </label>

            <select
              value={
                filters.constituencyId ||
                ""
              }
              onChange={(event) =>
                handleConstituencyChange(
                  event.target.value
                )
              }
              disabled={
                !filters.countyId
              }
            >
              <option value="">
                {filters.countyId
                  ? "All Constituencies"
                  : "Select County First"}
              </option>

              {filteredConstituencies.map(
                (item: any) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                )
              )}

            </select>
          </div>


          {/* WARD */}

          <div>
            <label>
              Ward
            </label>

            <select
              value={
                filters.wardId ||
                ""
              }
              onChange={(event) =>
                handleWardChange(
                  event.target.value
                )
              }
              disabled={
                !filters.constituencyId
              }
            >
              <option value="">
                {filters.constituencyId
                  ? "All Wards"
                  : "Select Constituency First"}
              </option>

              {filteredWards.map(
                (item: any) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.name}
                  </option>
                )
              )}

            </select>
          </div>


          {/* FROM */}

          <div>
            <label>
              From
            </label>

            <input
              type="date"
              value={
                filters.from ||
                ""
              }
              onChange={(event) =>
                updateFilter(
                  "from",
                  event.target.value
                )
              }
            />
          </div>


          {/* TO */}

          <div>
            <label>
              To
            </label>

            <input
              type="date"
              value={
                filters.to ||
                ""
              }
              onChange={(event) =>
                updateFilter(
                  "to",
                  event.target.value
                )
              }
            />
          </div>

        </div>


        {/* FILTER ACTIONS */}

        <div className="statistics-filter-actions">

          <button
            type="button"
            className="apply-filter-button"
            onClick={
              loadStatistics
            }
          >
            Apply Filters
          </button>

          <button
            type="button"
            onClick={
              clearFilters
            }
          >
            Clear Filters
          </button>

        </div>

      </section>


      {/* =========================================================
          ACTIVE FILTER SUMMARY
      ========================================================= */}

      <section className="active-filter-summary">

        <strong>
          Current Analysis:
        </strong>

        {filters.positionId && (
          <span>
            Position:{" "}
            {
              filterOptions.positions.find(
                (p: any) =>
                  p.id ===
                  filters.positionId
              )?.name
            }
          </span>
        )}

        {filters.candidateId && (
          <span>
            Candidate:{" "}
            {
              filterOptions.candidates.find(
                (c: any) =>
                  c.id ===
                  filters.candidateId
              )?.name
            }
          </span>
        )}

        {filters.countyId && (
          <span>
            County:{" "}
            {
              filterOptions.counties.find(
                (c: any) =>
                  c.id ===
                  filters.countyId
              )?.name
            }
          </span>
        )}

        {filters.constituencyId && (
          <span>
            Constituency:{" "}
            {
              filterOptions.constituencies.find(
                (c: any) =>
                  c.id ===
                  filters.constituencyId
              )?.name
            }
          </span>
        )}

        {filters.wardId && (
          <span>
            Ward:{" "}
            {
              filterOptions.wards.find(
                (w: any) =>
                  w.id ===
                  filters.wardId
              )?.name
            }
          </span>
        )}

        {!Object.values(
          filters
        ).some(Boolean) && (
          <span>
            All available data
          </span>
        )}

      </section>


      {/* =========================================================
          OVERVIEW
      ========================================================= */}

      <section className="statistics-cards">

        <div className="statistics-card">
          <span>
            Participants
          </span>

          <strong>
            {
              overview
                ?.uniqueParticipants ??
              0
            }
          </strong>
        </div>

        <div className="statistics-card">
          <span>
            Answers
          </span>

          <strong>
            {
              overview
                ?.totalResponses ??
              0
            }
          </strong>
        </div>

        <div className="statistics-card">
          <span>
            Polls
          </span>

          <strong>
            {overview?.polls ?? 0}
          </strong>
        </div>

        <div className="statistics-card">
          <span>
            Questions
          </span>

          <strong>
            {
              overview?.questions ??
              0
            }
          </strong>
        </div>

        <div className="statistics-card">
          <span>
            Counties
          </span>

          <strong>
            {
              overview?.counties ??
              0
            }
          </strong>
        </div>

        <div className="statistics-card">
          <span>
            Wards
          </span>

          <strong>
            {overview?.wards ?? 0}
          </strong>
        </div>

      </section>


      {/* =========================================================
          POLL OVERVIEW
      ========================================================= */}

      <section className="statistics-section">

        <div className="section-heading">
          <h2>
            Poll Overview
          </h2>
        </div>

        <div className="statistics-table-wrapper">

          <table>

            <thead>
              <tr>
                <th>
                  Poll
                </th>

                <th>
                  Type
                </th>

                <th>
                  Status
                </th>

                <th>
                  Position
                </th>

                <th>
                  County
                </th>

                <th>
                  Participants
                </th>

                <th>
                  Answers
                </th>

                <th>
                  Latest Response
                </th>
              </tr>
            </thead>

            <tbody>

              {statistics?.polls
                ?.length ? (

                statistics.polls.map(
                  (poll: any) => (
                    <tr
                      key={poll.id}
                    >

                      <td>
                        {poll.title}
                      </td>

                      <td>
                        {poll.type}
                      </td>

                      <td>
                        {poll.status}
                      </td>

                      <td>
                        {
                          poll.position
                            ?.name ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          poll.target
                            ?.county
                            ?.name ||
                          "All"
                        }
                      </td>

                      <td>
                        {
                          poll.participants
                        }
                      </td>

                      <td>
                        {
                          poll.responses
                        }
                      </td>

                      <td>
                        {poll.latestResponse
                          ? new Date(
                              poll.latestResponse
                            ).toLocaleString()
                          : "—"}
                      </td>

                    </tr>
                  )
                )

              ) : (

                <tr>
                  <td
                    colSpan={8}
                  >
                    No responses found
                    for the selected
                    filters.
                  </td>
                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* =========================================================
          QUESTION RESULTS
      ========================================================= */}

      <section className="statistics-section">

        <div className="section-heading">
          <h2>
            Question Results
          </h2>

          <p>
            Exact response counts
            are available to
            authorized administrators.
          </p>
        </div>


        {statistics?.questions
          ?.length ? (

          statistics.questions.map(
            (question: any) => (

              <article
                className="question-result"
                key={
                  question.id
                }
              >

                <h3>
                  {
                    question.question
                  }
                </h3>

                <p>
                  {
                    question.pollTitle
                  }
                </p>


                <div className="question-results">

                  {question.options.map(
                    (option: any) => (

                      <div
                        className="result-row"
                        key={
                          option.id
                        }
                      >

                        <div className="result-row-header">

                          <span>

                            <strong>
                              {
                                option.label
                              }
                            </strong>

                            {option
                              .candidate && (
                              <small>
                                {" "}
                                —{" "}
                                {
                                  option
                                    .candidate
                                    .name
                                }

                                {option
                                  .candidate
                                  .party &&
                                  ` (${option.candidate.party})`}
                              </small>
                            )}

                          </span>

                          <strong>
                            {
                              option.percentage
                            }
                            %
                          </strong>

                        </div>


                        <div className="result-bar">

                          <div
                            className="result-bar-fill"
                            style={{
                              width: `${option.percentage}%`,
                            }}
                          />

                        </div>


                        <small>
                          {
                            option.responses
                          }{" "}
                          responses
                        </small>

                      </div>

                    )
                  )}

                </div>

              </article>

            )

          )

        ) : (

          <p>
            No question results
            available.
          </p>

        )}

      </section>


      {/* =========================================================
          GEOGRAPHIC PARTICIPATION
      ========================================================= */}

      <section className="statistics-section">

        <div className="section-heading">
          <h2>
            Geographic Participation
          </h2>
        </div>


        <div className="geography-grid">

          <div>

            <h3>
              Counties
            </h3>

            <LocationTable
              items={
                statistics
                  ?.geography
                  ?.counties
              }
            />

          </div>


          <div>

            <h3>
              Constituencies
            </h3>

            <LocationTable
              items={
                statistics
                  ?.geography
                  ?.constituencies
              }
            />

          </div>


          <div>

            <h3>
              Wards
            </h3>

            <LocationTable
              items={
                statistics
                  ?.geography
                  ?.wards
              }
            />

          </div>

        </div>

      </section>


      {/* =========================================================
          CANDIDATE RESULTS
      ========================================================= */}

      <section className="statistics-section">

        <div className="section-heading">

          <h2>
            Candidate Results
          </h2>

        </div>


        <div className="statistics-table-wrapper">

          <table>

            <thead>

              <tr>

                <th>
                  Candidate
                </th>

                <th>
                  Party
                </th>

                <th>
                  Position
                </th>

                <th>
                  County
                </th>

                <th>
                  Constituency
                </th>

                <th>
                  Ward
                </th>

                <th>
                  Responses
                </th>

              </tr>

            </thead>


            <tbody>

              {statistics?.candidates
                ?.length ? (

                statistics.candidates.map(
                  (candidate: any) => (

                    <tr
                      key={
                        candidate.id
                      }
                    >

                      <td>
                        {
                          candidate.name
                        }
                      </td>

                      <td>
                        {
                          candidate.party ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          candidate
                            .position
                            ?.name ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          candidate
                            .county
                            ?.name ||
                          "National"
                        }
                      </td>

                      <td>
                        {
                          candidate
                            .constituency
                            ?.name ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          candidate
                            .ward
                            ?.name ||
                          "—"
                        }
                      </td>

                      <td>
                        {
                          candidate.responses
                        }
                      </td>

                    </tr>

                  )

                )

              ) : (

                <tr>

                  <td
                    colSpan={7}
                  >
                    No candidate
                    responses found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* =========================================================
          REPORT PERIOD
      ========================================================= */}

      <section className="statistics-section">

        <div className="section-heading">

          <h2>
            Report Information
          </h2>

        </div>

        <div className="report-information">

          <p>
            <strong>
              First recorded response:
            </strong>{" "}

            {overview?.oldestResponse
              ? new Date(
                  overview.oldestResponse
                ).toLocaleString()
              : "—"}
          </p>

          <p>
            <strong>
              Latest recorded response:
            </strong>{" "}

            {overview?.latestResponse
              ? new Date(
                  overview.latestResponse
                ).toLocaleString()
              : "—"}
          </p>

          <p>
            <strong>
              Current filters:
            </strong>{" "}

            {Object.values(
              filters
            ).filter(Boolean).length
              ? Object.values(
                  filters
                )
                  .filter(Boolean)
                  .join(" • ")
              : "None — all data"}
          </p>

          <p className="statistics-note">
            These statistics describe
            recorded responses in the
            selected dataset. They should
            not be interpreted as
            population estimates unless
            the underlying poll methodology
            supports that interpretation.
          </p>

        </div>

      </section>

    </main>
  );
}


/*
|--------------------------------------------------------------------------
| LOCATION TABLE
|--------------------------------------------------------------------------
*/

function LocationTable({
  items,
}: {
  items?: any[];
}) {
  return (
    <div className="statistics-table-wrapper">

      <table>

        <thead>

          <tr>

            <th>
              Location
            </th>

            <th>
              Participants
            </th>

            <th>
              Answers
            </th>

            <th>
              %
            </th>

          </tr>

        </thead>


        <tbody>

          {items?.length ? (

            items.map(
              (item) => (

                <tr
                  key={
                    item.id
                  }
                >

                  <td>
                    {item.name}
                  </td>

                  <td>
                    {
                      item.participants
                    }
                  </td>

                  <td>
                    {
                      item.responses
                    }
                  </td>

                  <td>
                    {
                      item.percentage
                    }
                    %
                  </td>

                </tr>

              )
            )

          ) : (

            <tr>

              <td
                colSpan={4}
              >
                No data
              </td>

            </tr>

          )}

        </tbody>

      </table>

    </div>
  );
}

