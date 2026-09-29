const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api";


export interface StatisticsFilters {
  pollId?: string;
  pollType?: string;
  pollStatus?: string;

  positionId?: string;
  candidateId?: string;
  campaignId?: string;

  countyId?: string;
  constituencyId?: string;
  wardId?: string;

  from?: string;
  to?: string;
}


function getToken() {
  return localStorage.getItem(
    "token"
  );
}


function buildQuery(
  filters: StatisticsFilters
) {
  const params =
    new URLSearchParams();

  Object.entries(
    filters
  ).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null &&
        value !== ""
      ) {
        params.set(
          key,
          value
        );
      }
    }
  );

  const query =
    params.toString();

  return query
    ? `?${query}`
    : "";
}


/*
|--------------------------------------------------------------------------
| FILTER OPTIONS
|--------------------------------------------------------------------------
*/

export async function
getStatisticsFilters() {
  const response =
    await fetch(
      `${API_BASE_URL}/admin/statistics/filters`,
      {
        headers: {
          Authorization:
            `Bearer ${getToken()}`,
        },
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to load filters"
    );
  }

  return data.data;
}


/*
|--------------------------------------------------------------------------
| STATISTICS
|--------------------------------------------------------------------------
*/

export async function
getAdminStatistics(
  filters: StatisticsFilters = {}
) {
  const response =
    await fetch(
      `${API_BASE_URL}/admin/statistics${buildQuery(
        filters
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${getToken()}`,
        },
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to load statistics"
    );
  }

  return data;
}


/*
|--------------------------------------------------------------------------
| EXPORT URLS
|--------------------------------------------------------------------------
*/

export function
getStatisticsCsvUrl(
  filters: StatisticsFilters = {}
) {
  return (
    `${API_BASE_URL}/admin/statistics/export/csv` +
    buildQuery(filters)
  );
}


export function
getStatisticsPdfUrl(
  filters: StatisticsFilters = {}
) {
  return (
    `${API_BASE_URL}/admin/statistics/export/pdf` +
    buildQuery(filters)
  );
}