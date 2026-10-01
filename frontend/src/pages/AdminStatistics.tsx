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

import "./AdminStatistics.css";

interface FilterOptions {
  polls: any[];
  positions: any[];
  campaigns: any[];
  counties: any[];
  constituencies: any[];
  wards: any[];
  candidates: any[];
}

const EMPTY_FILTER_OPTIONS: FilterOptions = {
  polls: [],
  positions: [],
  campaigns: [],
  counties: [],
  constituencies: [],
  wards: [],
  candidates: [],
};

const POLL_TYPES = [
  ["GENERAL", "General"],
  ["POLITICAL", "Political"],
  ["CAMPAIGN", "Campaign"],
  ["PUBLIC_SERVICE", "Public service"],
  ["RESEARCH", "Research"],
];

const POLL_STATUSES = [
  ["DRAFT", "Draft"],
  ["SCHEDULED", "Scheduled"],
  ["ACTIVE", "Active"],
  ["PAUSED", "Paused"],
  ["CLOSED", "Closed"],
  ["ARCHIVED", "Archived"],
];

export default function AdminStatistics() {
  const [statistics, setStatistics] =
    useState<any>(null);

  const [filterOptions, setFilterOptions] =
    useState<FilterOptions>(
      EMPTY_FILTER_OPTIONS
    );

  const [loading, setLoading] =
    useState(true);

  const [filters, setFilters] =
    useState<StatisticsFilters>({});

  const [error, setError] =
    useState("");

  const [filtersOpen, setFiltersOpen] =
    useState(true);

  const [exporting, setExporting] =
    useState<"csv" | "pdf" | "">("");

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

  useEffect(() => {
    loadStatistics();
  }, []);

  async function loadStatistics(
    suppliedFilters?: StatisticsFilters
  ) {
    try {
      setLoading(true);
      setError("");

      const result =
        await getAdminStatistics(
          suppliedFilters ?? filters
        );

      setStatistics(result.data);
    } catch (error: any) {
      setError(
        error.message ||
          "Failed to load statistics"
      );
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(
    key: keyof StatisticsFilters,
    value: string
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value || undefined,
    }));
  }

  function handlePositionChange(
    positionId: string
  ) {
    setFilters((current) => ({
      ...current,
      positionId:
        positionId || undefined,
      candidateId: undefined,
    }));
  }

  function handleCountyChange(
    countyId: string
  ) {
    setFilters((current) => ({
      ...current,
      countyId:
        countyId || undefined,
      constituencyId: undefined,
      wardId: undefined,
      candidateId: undefined,
    }));
  }

  function handleConstituencyChange(
    constituencyId: string
  ) {
    setFilters((current) => ({
      ...current,
      constituencyId:
        constituencyId || undefined,
      wardId: undefined,
      candidateId: undefined,
    }));
  }

  function handleWardChange(
    wardId: string
  ) {
    setFilters((current) => ({
      ...current,
      wardId:
        wardId || undefined,
      candidateId: undefined,
    }));
  }

  async function clearFilters() {
    const emptyFilters: StatisticsFilters = {};

    setFilters(emptyFilters);

    await loadStatistics(
      emptyFilters
    );
  }

  async function downloadFile(
    url: string,
    filename: string,
    type: "csv" | "pdf"
  ) {
    try {
      setExporting(type);
      setError("");

      const token =
        localStorage.getItem("token");

      const response = await fetch(url, {
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
        document.createElement("a");

      link.href = downloadUrl;
      link.download = filename;

      document.body.appendChild(link);
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
    } finally {
      setExporting("");
    }
  }

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

  const filteredWards =
    useMemo(() => {
      return filterOptions.wards.filter(
        (item: any) => {
          const countyMatch =
            !filters.countyId ||
            item.constituency?.county?.id ===
              filters.countyId;

          const constituencyMatch =
            !filters.constituencyId ||
            item.constituency?.id ===
              filters.constituencyId;

          return (
            countyMatch &&
            constituencyMatch
          );
        }
      );
    }, [
      filterOptions.wards,
      filters.countyId,
      filters.constituencyId,
    ]);

  const filteredCandidates =
    useMemo(() => {
      return filterOptions.candidates.filter(
        (candidate: any) => {
          const positionMatch =
            !filters.positionId ||
            candidate.position?.id ===
              filters.positionId;

          const countyMatch =
            !filters.countyId ||
            candidate.county?.id ===
              filters.countyId;

          const constituencyMatch =
            !filters.constituencyId ||
            candidate.constituency?.id ===
              filters.constituencyId;

          const wardMatch =
            !filters.wardId ||
            candidate.ward?.id ===
              filters.wardId;

          return (
            positionMatch &&
            countyMatch &&
            constituencyMatch &&
            wardMatch
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

  const activeFilterCount =
    Object.values(filters).filter(Boolean)
      .length;

  const overview =
    statistics?.overview;

  const selectedPoll =
    filterOptions.polls.find(
      (item: any) =>
        item.id === filters.pollId
    );

  const selectedPosition =
    filterOptions.positions.find(
      (item: any) =>
        item.id === filters.positionId
    );

  const selectedCandidate =
    filterOptions.candidates.find(
      (item: any) =>
        item.id === filters.candidateId
    );

  const selectedCampaign =
    filterOptions.campaigns.find(
      (item: any) =>
        item.id === filters.campaignId
    );

  const selectedCounty =
    filterOptions.counties.find(
      (item: any) =>
        item.id === filters.countyId
    );

  const selectedConstituency =
    filterOptions.constituencies.find(
      (item: any) =>
        item.id === filters.constituencyId
    );

  const selectedWard =
    filterOptions.wards.find(
      (item: any) =>
        item.id === filters.wardId
    );

  function getPollTypeLabel(
    value?: string
  ) {
    return (
      POLL_TYPES.find(
        ([key]) => key === value
      )?.[1] ||
      value ||
      "All types"
    );
  }

  function getStatusLabel(
    value?: string
  ) {
    return (
      POLL_STATUSES.find(
        ([key]) => key === value
      )?.[1] ||
      value ||
      "All statuses"
    );
  }

  function getLocationLabel(
    poll: any
  ) {
    const parts = [
      poll?.target?.ward?.name,
      poll?.target?.constituency?.name,
      poll?.target?.county?.name,
    ].filter(Boolean);

    return parts.length
      ? parts.join(" → ")
      : "National / unrestricted";
  }

  if (loading && !statistics) {
    return (
      <main className="admin-statistics-page">
        <div className="statistics-loading-page">
          <div className="loading-mark">
            <span />
            <span />
            <span />
          </div>

          <strong>
            Preparing statistics
          </strong>

          <p>
            Loading the latest recorded
            poll data...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-statistics-page">
      <header className="statistics-hero">
        <div className="statistics-hero-copy">
          <span className="statistics-eyebrow">
            SFD INSIGHTS · ADMIN ANALYTICS
          </span>

          <h1>
            Statistics
            <span> & analysis</span>
          </h1>

          <p>
            Explore recorded poll activity,
            response distributions and
            geographic participation using
            a single analysis workspace.
          </p>
        </div>

        <div className="statistics-hero-actions">
          <button
            type="button"
            className="secondary-action"
            onClick={() =>
              loadStatistics()
            }
            disabled={loading}
          >
            <span className="action-icon">
              ↻
            </span>

            {loading
              ? "Refreshing..."
              : "Refresh data"}
          </button>
        </div>
      </header>

      {error && (
        <div className="statistics-error">
          <div>
            <strong>
              Something went wrong
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      <section className="analysis-toolbar">
        <div>
          <span className="toolbar-label">
            CURRENT ANALYSIS
          </span>

          <strong>
            {activeFilterCount
              ? `${activeFilterCount} filter${
                  activeFilterCount === 1
                    ? ""
                    : "s"
                } applied`
              : "All recorded data"}
          </strong>
        </div>

        <div className="toolbar-actions">
          {activeFilterCount > 0 && (
            <button
              type="button"
              className="text-button"
              onClick={clearFilters}
            >
              Clear all
            </button>
          )}

          <button
            type="button"
            className="filter-toggle"
            onClick={() =>
              setFiltersOpen(
                (current) => !current
              )
            }
          >
            <span>Filter workspace</span>
            <b>
              {filtersOpen ? "−" : "+"}
            </b>
          </button>
        </div>
      </section>

      {filtersOpen && (
        <section className="filter-workspace">
          <div className="filter-workspace-heading">
            <div>
              <span className="section-kicker">
                ANALYSIS CONTROLS
              </span>

              <h2>
                Define your dataset
              </h2>

              <p>
                Combine poll, position,
                candidate and geographic
                filters before running the
                analysis.
              </p>
            </div>

            <div className="filter-count">
              {activeFilterCount}
              <span>
                active
              </span>
            </div>
          </div>

          <div className="filter-grid">
            <FilterField
              label="Poll"
              hint="Specific poll"
            >
              <select
                value={
                  filters.pollId || ""
                }
                onChange={(event) =>
                  updateFilter(
                    "pollId",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All polls
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
            </FilterField>

            <FilterField
              label="Poll type"
              hint="Category"
            >
              <select
                value={
                  filters.pollType || ""
                }
                onChange={(event) =>
                  updateFilter(
                    "pollType",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All types
                </option>

                {POLL_TYPES.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </FilterField>

            <FilterField
              label="Poll status"
              hint="Lifecycle"
            >
              <select
                value={
                  filters.pollStatus || ""
                }
                onChange={(event) =>
                  updateFilter(
                    "pollStatus",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All statuses
                </option>

                {POLL_STATUSES.map(
                  ([value, label]) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {label}
                    </option>
                  )
                )}
              </select>
            </FilterField>

            <FilterField
              label="Position"
              hint="Elective / survey position"
            >
              <select
                value={
                  filters.positionId || ""
                }
                onChange={(event) =>
                  handlePositionChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All positions
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
            </FilterField>

            <FilterField
              label="Candidate"
              hint={
                filters.positionId
                  ? `${filteredCandidates.length} matching`
                  : "Optional"
              }
            >
              <select
                value={
                  filters.candidateId || ""
                }
                onChange={(event) =>
                  updateFilter(
                    "candidateId",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All candidates
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
            </FilterField>

            <FilterField
              label="Campaign"
              hint="Campaign grouping"
            >
              <select
                value={
                  filters.campaignId || ""
                }
                onChange={(event) =>
                  updateFilter(
                    "campaignId",
                    event.target.value
                  )
                }
              >
                <option value="">
                  All campaigns
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
            </FilterField>

            <FilterField
              label="County"
              hint="Geographic level 1"
            >
              <select
                value={
                  filters.countyId || ""
                }
                onChange={(event) =>
                  handleCountyChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All counties
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
            </FilterField>

            <FilterField
              label="Constituency"
              hint={
                filters.countyId
                  ? "Geographic level 2"
                  : "Select county first"
              }
            >
              <select
                value={
                  filters.constituencyId || ""
                }
                disabled={
                  !filters.countyId
                }
                onChange={(event) =>
                  handleConstituencyChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  {filters.countyId
                    ? "All constituencies"
                    : "Select county first"}
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
            </FilterField>

            <FilterField
              label="Ward"
              hint={
                filters.constituencyId
                  ? "Geographic level 3"
                  : "Select constituency first"
              }
            >
              <select
                value={
                  filters.wardId || ""
                }
                disabled={
                  !filters.constituencyId
                }
                onChange={(event) =>
                  handleWardChange(
                    event.target.value
                  )
                }
              >
                <option value="">
                  {filters.constituencyId
                    ? "All wards"
                    : "Select constituency first"}
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
            </FilterField>

            <FilterField
              label="From"
              hint="Start date"
            >
              <input
                type="date"
                value={
                  filters.from || ""
                }
                onChange={(event) =>
                  updateFilter(
                    "from",
                    event.target.value
                  )
                }
              />
            </FilterField>

            <FilterField
              label="To"
              hint="End date"
            >
              <input
                type="date"
                value={
                  filters.to || ""
                }
                onChange={(event) =>
                  updateFilter(
                    "to",
                    event.target.value
                  )
                }
              />
            </FilterField>
          </div>

          <div className="filter-footer">
            <span>
              Filters are only applied when
              you run the analysis.
            </span>

            <button
              type="button"
              className="apply-button"
              onClick={() =>
                loadStatistics()
              }
              disabled={loading}
            >
              {loading
                ? "Analysing..."
                : "Run analysis"}
              <span>→</span>
            </button>
          </div>
        </section>
      )}

      <section className="active-analysis">
        <div className="active-analysis-title">
          <span className="analysis-dot" />
          <strong>
            Analysis scope
          </strong>
        </div>

        <div className="analysis-chips">
          {selectedPoll && (
            <AnalysisChip
              label="Poll"
              value={
                selectedPoll.title
              }
            />
          )}

          {filters.pollType && (
            <AnalysisChip
              label="Type"
              value={getPollTypeLabel(
                filters.pollType
              )}
            />
          )}

          {filters.pollStatus && (
            <AnalysisChip
              label="Status"
              value={getStatusLabel(
                filters.pollStatus
              )}
            />
          )}

          {selectedPosition && (
            <AnalysisChip
              label="Position"
              value={
                selectedPosition.name
              }
            />
          )}

          {selectedCandidate && (
            <AnalysisChip
              label="Candidate"
              value={
                selectedCandidate.name
              }
            />
          )}

          {selectedCampaign && (
            <AnalysisChip
              label="Campaign"
              value={
                selectedCampaign.name
              }
            />
          )}

          {selectedCounty && (
            <AnalysisChip
              label="County"
              value={
                selectedCounty.name
              }
            />
          )}

          {selectedConstituency && (
            <AnalysisChip
              label="Constituency"
              value={
                selectedConstituency.name
              }
            />
          )}

          {selectedWard && (
            <AnalysisChip
              label="Ward"
              value={
                selectedWard.name
              }
            />
          )}

          {filters.from && (
            <AnalysisChip
              label="From"
              value={filters.from}
            />
          )}

          {filters.to && (
            <AnalysisChip
              label="To"
              value={filters.to}
            />
          )}

          {!activeFilterCount && (
            <span className="all-data-chip">
              All available recorded data
            </span>
          )}
        </div>
      </section>

      <section className="metric-grid">
        <MetricCard
          label="Participants"
          value={
            overview?.uniqueParticipants ??
            0
          }
          detail="Distinct participant identifiers"
          accent="blue"
        />

        <MetricCard
          label="Answers"
          value={
            overview?.totalResponses ??
            0
          }
          detail="Recorded answer submissions"
          accent="orange"
        />

        <MetricCard
          label="Polls"
          value={
            overview?.polls ?? 0
          }
          detail="Included in this dataset"
          accent="slate"
        />

        <MetricCard
          label="Questions"
          value={
            overview?.questions ?? 0
          }
          detail="Questions represented"
          accent="blue"
        />

        <MetricCard
          label="Counties"
          value={
            overview?.counties ?? 0
          }
          detail="Geographic coverage"
          accent="orange"
        />

        <MetricCard
          label="Wards"
          value={
            overview?.wards ?? 0
          }
          detail="Recorded ward coverage"
          accent="slate"
        />
      </section>

      <section className="report-section">
        <SectionHeader
          eyebrow="DATASET"
          title="Poll overview"
          description="A high-level view of the polls represented in the current analysis."
        />

        <div className="table-shell">
          <div className="table-scroll">
            <table className="statistics-table">
              <thead>
                <tr>
                  <th>Poll</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Position</th>
                  <th>Target</th>
                  <th>Participants</th>
                  <th>Answers</th>
                  <th>Latest response</th>
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
                          <div className="table-primary">
                            {poll.title}
                          </div>
                        </td>

                        <td>
                          <span className="type-label">
                            {getPollTypeLabel(
                              poll.type
                            )}
                          </span>
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              poll.status
                            }
                          />
                        </td>

                        <td>
                          {poll.position
                            ?.name || "—"}
                        </td>

                        <td>
                          <span className="target-cell">
                            {getLocationLabel(
                              poll
                            )}
                          </span>
                        </td>

                        <td className="number-cell">
                          {poll.participants}
                        </td>

                        <td className="number-cell">
                          {poll.responses}
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
                  <EmptyTableRow
                    colSpan={8}
                    text="No poll data matches the selected analysis."
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="report-section">
        <SectionHeader
          eyebrow="QUESTION ANALYSIS"
          title="Question results"
          description="Response distributions for each question in the selected dataset."
        />

        <div className="question-results-list">
          {statistics?.questions
            ?.length ? (
            statistics.questions.map(
              (question: any) => (
                <article
                  className="question-result-card"
                  key={question.id}
                >
                  <div className="question-result-top">
                    <div>
                      <span className="question-index">
                        QUESTION
                      </span>

                      <h3>
                        {question.question}
                      </h3>

                      <p>
                        {question.pollTitle}
                      </p>
                    </div>
                  </div>

                  <div className="question-options">
                    {question.options.map(
                      (option: any) => (
                        <div
                          className="result-option"
                          key={
                            option.id
                          }
                        >
                          <div className="result-option-heading">
                            <div>
                              <strong>
                                {
                                  option.label
                                }
                              </strong>

                              {option.candidate && (
                                <span>
                                  {
                                    option
                                      .candidate
                                      .name
                                  }

                                  {option
                                    .candidate
                                    .party &&
                                    ` · ${option.candidate.party}`}
                                </span>
                              )}
                            </div>

                            <strong className="percentage">
                              {
                                option.percentage
                              }
                              %
                            </strong>
                          </div>

                          <div className="result-track">
                            <div
                              className="result-fill"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    Number(
                                      option.percentage
                                    ) || 0
                                  )
                                )}%`,
                              }}
                            />
                          </div>

                          <span className="response-count">
                            {
                              option.responses
                            }{" "}
                            recorded responses
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </article>
              )
            )
          ) : (
            <div className="empty-panel">
              <strong>
                No question results
              </strong>

              <span>
                There are no question-level
                results for the current
                analysis.
              </span>
            </div>
          )}
        </div>
      </section>

      <section className="report-section">
        <SectionHeader
          eyebrow="GEOGRAPHIC PARTICIPATION"
          title="Where responses were recorded"
          description="Participation distribution across the geographic levels represented by the selected dataset."
        />

        <div className="geography-columns">
          <LocationTable
            title="Counties"
            items={
              statistics?.geography
                ?.counties
            }
          />

          <LocationTable
            title="Constituencies"
            items={
              statistics?.geography
                ?.constituencies
            }
          />

          <LocationTable
            title="Wards"
            items={
              statistics?.geography?.wards
            }
          />
        </div>
      </section>

      <section className="report-section">
        <SectionHeader
          eyebrow="CANDIDATE DATA"
          title="Candidate results"
          description="Recorded response totals for candidates represented in the selected dataset."
        />

        <div className="table-shell">
          <div className="table-scroll">
            <table className="statistics-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Party</th>
                  <th>Position</th>
                  <th>County</th>
                  <th>Constituency</th>
                  <th>Ward</th>
                  <th>Responses</th>
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
                          <div className="candidate-table-name">
                            <span className="candidate-marker" />

                            <strong>
                              {
                                candidate.name
                              }
                            </strong>
                          </div>
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
                              ?.name || "—"
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
                              ?.name || "—"
                          }
                        </td>

                        <td>
                          {
                            candidate.ward
                              ?.name || "—"
                          }
                        </td>

                        <td className="number-cell">
                          {
                            candidate.responses
                          }
                        </td>
                      </tr>
                    )
                  )
                ) : (
                  <EmptyTableRow
                    colSpan={7}
                    text="No candidate responses match the selected analysis."
                  />
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="export-panel">
        <div className="export-copy">
          <span className="section-kicker">
            REPORTING
          </span>

          <h2>
            Take this analysis with you.
          </h2>

          <p>
            Export the current analysis
            using the same filters shown
            above. The PDF is intended for
            presentation and reporting, while
            CSV is intended for further
            analysis.
          </p>

          <div className="export-scope">
            <span className="analysis-dot" />

            <span>
              {activeFilterCount
                ? "Current filtered dataset"
                : "Complete available dataset"}
            </span>
          </div>
        </div>

        <div className="export-actions">
          <button
            type="button"
            className="export-button export-button--primary"
            disabled={Boolean(exporting)}
            onClick={() =>
              downloadFile(
                getStatisticsPdfUrl(
                  filters
                ),
                `sfd-insights-statistics-${new Date()
                  .toISOString()
                  .slice(0, 10)}.pdf`,
                "pdf"
              )
            }
          >
            <span className="export-icon">
              PDF
            </span>

            <span>
              {exporting === "pdf"
                ? "Preparing PDF..."
                : "Download PDF"}
            </span>
          </button>

          <button
            type="button"
            className="export-button"
            disabled={Boolean(exporting)}
            onClick={() =>
              downloadFile(
                getStatisticsCsvUrl(
                  filters
                ),
                `sfd-insights-statistics-${new Date()
                  .toISOString()
                  .slice(0, 10)}.csv`,
                "csv"
              )
            }
          >
            <span className="export-icon">
              CSV
            </span>

            <span>
              {exporting === "csv"
                ? "Preparing CSV..."
                : "Download CSV"}
            </span>
          </button>
        </div>
      </section>

      <section className="report-information">
        <div>
          <span className="section-kicker">
            REPORT CONTEXT
          </span>

          <h2>
            About this dataset
          </h2>
        </div>

        <div className="report-meta-grid">
          <MetaItem
            label="First recorded response"
            value={
              overview?.oldestResponse
                ? new Date(
                    overview.oldestResponse
                  ).toLocaleString()
                : "—"
            }
          />

          <MetaItem
            label="Latest recorded response"
            value={
              overview?.latestResponse
                ? new Date(
                    overview.latestResponse
                  ).toLocaleString()
                : "—"
            }
          />

          <MetaItem
            label="Current scope"
            value={
              activeFilterCount
                ? `${activeFilterCount} active filters`
                : "All available data"
            }
          />
        </div>

        <div className="methodology-note">
          <strong>
            Interpretation note
          </strong>

          <p>
            These statistics describe
            recorded responses in the selected
            dataset. They should not be
            interpreted as population estimates
            unless the underlying poll
            methodology supports that
            interpretation.
          </p>

          <p>
            Percentages represent the
            distribution within the applicable
            question or selected dataset.
          </p>
        </div>
      </section>
    </main>
  );
}

function FilterField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="filter-field">
      <div className="filter-field-label">
        <label>{label}</label>

        {hint && (
          <span>{hint}</span>
        )}
      </div>

      {children}
    </div>
  );
}

function AnalysisChip({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <span className="analysis-chip">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: number;
  detail: string;
  accent:
    | "blue"
    | "orange"
    | "slate";
}) {
  return (
    <article
      className={`metric-card metric-card--${accent}`}
    >
      <div className="metric-card-top">
        <span>{label}</span>
        <i />
      </div>

      <strong>
        {Number(value || 0).toLocaleString()}
      </strong>

      <small>
        {detail}
      </small>
    </article>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="section-heading">
      <span className="section-kicker">
        {eyebrow}
      </span>

      <h2>{title}</h2>

      <p>{description}</p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={`status-badge status-badge--${status
        .toLowerCase()
        .replace("_", "-")}`}
    >
      {status}
    </span>
  );
}

function LocationTable({
  title,
  items,
}: {
  title: string;
  items?: any[];
}) {
  return (
    <article className="geography-card">
      <div className="geography-card-heading">
        <div>
          <span className="section-kicker">
            GEOGRAPHY
          </span>

          <h3>{title}</h3>
        </div>

        <span className="geography-count">
          {items?.length || 0}
        </span>
      </div>

      <div className="location-table">
        {items?.length ? (
          items.map((item: any) => (
            <div
              className="location-row"
              key={item.id || item.name}
            >
              <div className="location-row-main">
                <strong>
                  {item.name}
                </strong>

                <span>
                  {item.participants}{" "}
                  participants ·{" "}
                  {item.responses} answers
                </span>
              </div>

              <div className="location-row-right">
                <strong>
                  {item.percentage}%
                </strong>

                <div className="mini-track">
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(
                          0,
                          Number(
                            item.percentage
                          ) || 0
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="location-empty">
            No geographic data available.
          </div>
        )}
      </div>
    </article>
  );
}

function EmptyTableRow({
  colSpan,
  text,
}: {
  colSpan: number;
  text: string;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="table-empty"
      >
        {text}
      </td>
    </tr>
  );
}

function MetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}