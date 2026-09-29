const API_URL = "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("token");
}

async function adminFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getToken();

  if (!token) {
    throw new Error("Authentication required");
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    }
  );

  const data = await response.json();

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");

    window.location.href = "/login";

    throw new Error(
      "Your session has expired"
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message || "Request failed"
    );
  }

  return data;
}

/*
|--------------------------------------------------------------------------
| Types
|--------------------------------------------------------------------------
*/

export type PollType =
  | "GENERAL"
  | "POLITICAL_CAMPAIGN";

export interface AdminPosition {
  id: string;
  name: string;
  scope: string;
  description?: string | null;
  isActive: boolean;
}

export interface AdminCandidate {
  id: string;
  name: string;
  party?: string | null;
  photoUrl?: string | null;
  description?: string | null;
  isActive: boolean;

  positionId: string;

  countyId?: string | null;
  constituencyId?: string | null;
  wardId?: string | null;

  position?: AdminPosition | null;

  county?: {
    id: string;
    code?: number;
    name: string;
  } | null;

  constituency?: {
    id: string;
    code?: string;
    name: string;
  } | null;

  ward?: {
    id: string;
    code?: string;
    name: string;
  } | null;
}

export interface AdminPollOption {
  id: string;
  label: string;
  value?: string | null;
  candidateId?: string | null;
  order: number;
  isActive: boolean;

  candidate?: AdminCandidate | null;
}

export interface AdminPollQuestion {
  id: string;
  question: string;
  description?: string | null;
  order: number;
  isRequired: boolean;

  options: AdminPollOption[];
}

export interface AdminPoll {
  id: string;
  title: string;
  description?: string | null;

  pollType: PollType;

  status: string;

  positionId?: string | null;

  position?: AdminPosition | null;

  targetCountyId?: string | null;
  targetConstituencyId?: string | null;
  targetWardId?: string | null;

  targetCounty?: {
    id: string;
    code: number;
    name: string;
  } | null;

  targetConstituency?: {
    id: string;
    code: string;
    name: string;
  } | null;

  targetWard?: {
    id: string;
    code: string;
    name: string;
  } | null;

  startsAt?: string | null;
  endsAt?: string | null;

  allowResults: boolean;
  isPublic: boolean;

  questions: AdminPollQuestion[];

  _count?: {
    responses: number;
  };

  createdAt: string;
  updatedAt: string;
}

/*
|--------------------------------------------------------------------------
| Positions
|--------------------------------------------------------------------------
*/

export async function getAdminPositions() {
  const data = await adminFetch(
    "/positions"
  );

  return data.data as AdminPosition[];
}

/*
|--------------------------------------------------------------------------
| Polls
|--------------------------------------------------------------------------
*/

export async function getAdminPolls() {
  const data = await adminFetch(
    "/admin/polls"
  );

  return data.data as AdminPoll[];
}

export async function getAdminPoll(
  pollId: string
) {
  const data = await adminFetch(
    `/admin/polls/${pollId}`
  );

  return data.data as AdminPoll;
}

/*
|--------------------------------------------------------------------------
| Create poll
|--------------------------------------------------------------------------
*/

export interface CreatePollQuestion {
  question: string;
  description?: string;
  isRequired: boolean;

  options: {
    label: string;
    value?: string;
    candidateId?: string;
    isActive: boolean;
  }[];
}

export interface CreatePollPayload {
  title: string;
  description?: string;

  pollType: PollType;

  positionId?: string;

  targetCountyId?: string;
  targetConstituencyId?: string;
  targetWardId?: string;

  startsAt?: string;
  endsAt?: string;

  allowResults: boolean;
  isPublic: boolean;

  questions: CreatePollQuestion[];
}

export async function createPoll(
  payload: CreatePollPayload
) {
  const data = await adminFetch(
    "/admin/polls",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return data.data as AdminPoll;
}

/*
|--------------------------------------------------------------------------
| Update poll
|--------------------------------------------------------------------------
*/

export async function updatePoll(
  pollId: string,
  payload: Partial<CreatePollPayload>
) {
  const data = await adminFetch(
    `/admin/polls/${pollId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );

  return data.data as AdminPoll;
}

/*
|--------------------------------------------------------------------------
| Poll status
|--------------------------------------------------------------------------
*/

export async function updatePollStatus(
  pollId: string,
  status: string
) {
  const data = await adminFetch(
    `/admin/polls/${pollId}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    }
  );

  return data.data as AdminPoll;
}

/*
|--------------------------------------------------------------------------
| Candidates
|--------------------------------------------------------------------------
*/

/*
 * Get candidates.
 *
 * Only active candidates are returned by the
 * current backend GET endpoint.
 */
export async function getCandidates(
  positionId?: string
) {
  const query = positionId
    ? `?positionId=${encodeURIComponent(
        positionId
      )}`
    : "";

  const data = await adminFetch(
    `/admin/candidates${query}`
  );

  return data.data as AdminCandidate[];
}

/*
 * Create candidate.
 */
export async function createCandidate(
  payload: {
    name: string;
    party?: string;
    photoUrl?: string;
    description?: string;
    positionId: string;
    countyId?: string;
    constituencyId?: string;
    wardId?: string;
  }
) {
  const data = await adminFetch(
    "/admin/candidates",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return data.data as AdminCandidate;
}

/*
 * Update candidate.
 *
 * Supports:
 * - Name
 * - Party
 * - Photo
 * - Description
 * - Position
 * - County
 * - Constituency
 * - Ward
 * - Active/inactive status
 *
 * Fields are optional so the edit page can update
 * exactly what is required.
 */
export async function updateCandidate(
  candidateId: string,
  payload: {
    name?: string;
    party?: string;
    photoUrl?: string;
    description?: string;

    positionId?: string;
    countyId?: string;
    constituencyId?: string;
    wardId?: string;

    isActive?: boolean;
  }
): Promise<AdminCandidate> {
  const data = await adminFetch(
    `/admin/candidates/${candidateId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );

  return data.data as AdminCandidate;
}

/*
 * Delete/deactivate candidate.
 *
 * The backend performs a soft delete by setting
 * isActive = false, preserving existing votes.
 */
export async function deleteCandidate(
  candidateId: string
): Promise<AdminCandidate> {
  const data = await adminFetch(
    `/admin/candidates/${candidateId}`,
    {
      method: "DELETE",
    }
  );

  return data.data as AdminCandidate;
}

/*
|--------------------------------------------------------------------------
| Questions
|--------------------------------------------------------------------------
*/

export async function addQuestion(
  pollId: string,
  payload: CreatePollQuestion
) {
  const data = await adminFetch(
    `/admin/polls/${pollId}/questions`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return data.data;
}

export async function updateQuestion(
  questionId: string,
  payload: {
    question?: string;
    description?: string;
    order?: number;
    isRequired?: boolean;
  }
) {
  const data = await adminFetch(
    `/admin/questions/${questionId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );

  return data.data;
}

export async function deleteQuestion(
  questionId: string
) {
  return adminFetch(
    `/admin/questions/${questionId}`,
    {
      method: "DELETE",
    }
  );
}

/*
|--------------------------------------------------------------------------
| Options
|--------------------------------------------------------------------------
*/

export async function addOption(
  questionId: string,
  payload: {
    label: string;
    value?: string;
    candidateId?: string;
    order?: number;
    isActive?: boolean;
  }
) {
  const data = await adminFetch(
    `/admin/questions/${questionId}/options`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );

  return data.data;
}

export async function updateOption(
  optionId: string,
  payload: {
    label?: string;
    value?: string;
    candidateId?: string;
    order?: number;
    isActive?: boolean;
  }
) {
  const data = await adminFetch(
    `/admin/options/${optionId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );

  return data.data;
}

export async function deleteOption(
  optionId: string
) {
  return adminFetch(
    `/admin/options/${optionId}`,
    {
      method: "DELETE",
    }
  );
}