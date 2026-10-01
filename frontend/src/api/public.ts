const API_URL =
"https://kenyaopinionpolls.onrender.com";
  // "http://localhost:5000/api";

/**
 * ============================================================================
 * PUBLIC TYPES
 * ============================================================================
 */

export interface PublicPositionCandidate {
  id: string;
  name: string;
  party?: string | null;
  photoUrl?: string | null;
  description?: string | null;

  county?: {
    id: string;
    name: string;
  } | null;

  constituency?: {
    id: string;
    name: string;
  } | null;

  ward?: {
    id: string;
    name: string;
  } | null;
}

export interface PublicPosition {
  id: string;
  name: string;
  scope: string;
  description?: string | null;
  isActive: boolean;
  pollCount?: number;
  responseCount?: number;

  candidates?: PublicPositionCandidate[];
}

// export interface PublicPosition {
//   id: string;
//   name: string;
//   scope: string;
//   description?: string | null;
//   isActive: boolean;
//   pollCount?: number;
//   responseCount?: number;
// }

export interface PublicPoll {
  id: string;
  title: string;
  description?: string | null;
  type?: string;
  status: string;

  position?: {
    id: string;
    name: string;
    scope: string;
  } | null;

  targetCounty?: {
    id: string;
    name: string;
    code: number;
  } | null;

  targetConstituency?: {
    id: string;
    name: string;
  } | null;

  targetWard?: {
    id: string;
    name: string;
  } | null;

  startsAt?: string | null;
  endsAt?: string | null;

  allowResults: boolean;
  isPublic: boolean;

  questions: {
    id: string;
    question: string;
    order: number;
  }[];

  _count?: {
    responses: number;
  };

  createdAt?: string;
  updatedAt?: string;
}

export interface PublicPollDetails
  extends PublicPoll {
  disclosureNote?: string | null;
  methodologyNote?: string | null;

  questions: {
    id: string;
    question: string;
    description?: string | null;
    order: number;
    isRequired: boolean;

    options: {
      id: string;
      label: string;
      value?: string | null;

      candidate?: {
        id: string;
        name: string;
        party?: string | null;
        photoUrl?: string | null;
      } | null;
    }[];
  }[];
}

export interface PollAnswer {
  questionId: string;
  optionId: string;
}

export interface PollResults {
  poll: {
    id: string;
    title: string;
    description?: string | null;
  };

  totalResponses: number;

  questions: {
    id: string;
    question: string;
    totalResponses: number;

    options: {
      id: string;
      label: string;

      candidate?: {
        id: string;
        name: string;
        party?: string | null;
        photoUrl?: string | null;
      } | null;

      count: number;
      percentage: number;
    }[];
  }[];
}

/**
 * ============================================================================
 * QUICK VOTE TYPES
 * ============================================================================
 */

export interface QuickVoteCandidate {
  optionId: string;
  candidateId?: string | null;
  name: string;
  party?: string | null;
  photoUrl?: string | null;
}

export interface QuickVote {
  position: {
    id: string;
    name: string;
    scope: string;
    description?: string | null;
  };

  poll: {
    id: string;
    title: string;
    description?: string | null;
    allowResults: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  };

  question: {
    id: string;
    question: string;
  };

  candidates: QuickVoteCandidate[];
}

/**
 * ============================================================================
 * GET REQUEST DEDUPLICATION
 * ============================================================================
 *
 * Prevents multiple identical GET requests from being sent simultaneously.
 *
 * This is useful during React development where components/effects can
 * sometimes execute more than once.
 *
 * IMPORTANT:
 * This does NOT cache completed responses.
 * It only prevents duplicate requests while the same request is already
 * running.
 */

const pendingGetRequests =
  new Map<
    string,
    Promise<unknown>
  >();

/**
 * ============================================================================
 * PUBLIC FETCH
 * ============================================================================
 */

async function publicFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const method =
    options.method?.toUpperCase() ||
    "GET";

  const isGet =
    method === "GET";

  /**
   * Only deduplicate GET requests.
   *
   * POST requests such as submitting a vote
   * must never be deduplicated here.
   */
  if (isGet) {
    const existingRequest =
      pendingGetRequests.get(
        endpoint
      );

    if (existingRequest) {
      return existingRequest;
    }
  }

  const requestPromise =
    (async () => {
      let response: Response;

      try {
        response = await fetch(
          `${API_URL}${endpoint}`,
          {
            ...options,

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",

              ...(options.headers || {}),
            },
          }
        );
      } catch (error) {
        throw new Error(
          error instanceof Error
            ? error.message
            : "Unable to connect to the API"
        );
      }

      /**
       * Do not blindly call response.json().
       *
       * Express rate-limit responses may be
       * plain text, and other server errors may
       * also return non-JSON responses.
       */
      const contentType =
        response.headers.get(
          "content-type"
        ) || "";

      let data: unknown;

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        try {
          data =
            await response.json();
        } catch {
          throw new Error(
            "The server returned invalid JSON"
          );
        }
      } else {
        data =
          await response.text();
      }

      if (!response.ok) {
        /**
         * Rate-limit response.
         */
        if (
          response.status === 429
        ) {
          throw new Error(
            "Too many requests. Please wait a moment and try again."
          );
        }

        /**
         * JSON error response.
         */
        if (
          typeof data ===
            "object" &&
          data !== null &&
          "message" in data
        ) {
          const message =
            (
              data as {
                message?: unknown;
              }
            ).message;

          if (
            typeof message ===
            "string"
          ) {
            throw new Error(
              message
            );
          }
        }

        /**
         * Plain-text error response.
         */
        if (
          typeof data ===
            "string" &&
          data.trim()
        ) {
          throw new Error(
            data.trim()
          );
        }

        throw new Error(
          "Request failed"
        );
      }

      return data;
    })();

  /**
   * Store only GET requests that are
   * currently in progress.
   */
  if (isGet) {
    pendingGetRequests.set(
      endpoint,
      requestPromise
    );

    requestPromise.finally(() => {
      /**
       * Only remove this request if it is
       * still the same request stored in
       * the map.
       */
      if (
        pendingGetRequests.get(
          endpoint
        ) === requestPromise
      ) {
        pendingGetRequests.delete(
          endpoint
        );
      }
    });
  }

  return requestPromise;
}

/**
 * ============================================================================
 * PUBLIC HOME
 * ============================================================================
 */

export async function getPublicHome() {
  const data =
    await publicFetch(
      "/public/home"
    );

  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data)
  ) {
    throw new Error(
      "Invalid home response from server"
    );
  }

  return (
    data as {
      data: {
        positions: PublicPosition[];
        generalPolls: PublicPoll[];
      };
    }
  ).data;
}

/**
 * ============================================================================
 * PUBLIC POSITIONS
 * ============================================================================
 */

export async function getPublicPositions() {
  const data =
    await publicFetch(
      "/public/positions"
    );

  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data)
  ) {
    throw new Error(
      "Invalid positions response from server"
    );
  }

  return (
    data as {
      data: PublicPosition[];
    }
  ).data;
}

/**
 * ============================================================================
 * PUBLIC POLLS
 * ============================================================================
 */

export async function getPublicPolls(
  filters?: {
    countyId?: string;
    constituencyId?: string;
    wardId?: string;
  }
): Promise<PublicPoll[]> {
  const params =
    new URLSearchParams();

  if (filters?.countyId) {
    params.set(
      "countyId",
      filters.countyId
    );
  }

  if (filters?.constituencyId) {
    params.set(
      "constituencyId",
      filters.constituencyId
    );
  }

  if (filters?.wardId) {
    params.set(
      "wardId",
      filters.wardId
    );
  }

  const query =
    params.toString();

  const data =
    await publicFetch(
      `/public/polls${
        query
          ? `?${query}`
          : ""
      }`
    );

  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data)
  ) {
    throw new Error(
      "Invalid polls response from server"
    );
  }

  return (
    data as {
      data: PublicPoll[];
    }
  ).data;
}

/**
 * ============================================================================
 * PUBLIC POSITION POLLS
 * ============================================================================
 */

export async function getPublicPositionPolls(
  positionId: string,
  filters?: {
    countyId?: string;
    constituencyId?: string;
    wardId?: string;
  }
): Promise<PublicPoll[]> {
  const params =
    new URLSearchParams();

  if (filters?.countyId) {
    params.set(
      "countyId",
      filters.countyId
    );
  }

  if (filters?.constituencyId) {
    params.set(
      "constituencyId",
      filters.constituencyId
    );
  }

  if (filters?.wardId) {
    params.set(
      "wardId",
      filters.wardId
    );
  }

  const query =
    params.toString();

  const data =
    await publicFetch(
      `/public/positions/${positionId}/polls${
        query
          ? `?${query}`
          : ""
      }`
    );

  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data)
  ) {
    throw new Error(
      "Invalid position polls response from server"
    );
  }

  return (
    data as {
      data: PublicPoll[];
    }
  ).data;
}

/**
 * ============================================================================
 * PUBLIC POLL DETAILS
 * ============================================================================
 */

export async function getPublicPoll(
  pollId: string
): Promise<PublicPollDetails> {
  const data =
    await publicFetch(
      `/public/polls/${pollId}`
    );

  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data)
  ) {
    throw new Error(
      "Invalid poll response from server"
    );
  }

  return (
    data as {
      data: PublicPollDetails;
    }
  ).data;
}

/**
 * ============================================================================
 * SUBMIT POLL RESPONSES
 * ============================================================================
 */

export async function submitPollResponses(
  pollId: string,
  payload: {
    countyId?: string;
    constituencyId?: string;
    wardId?: string;
    answers: PollAnswer[];
  }
) {
  return publicFetch(
    `/public/polls/${pollId}/responses`,
    {
      method: "POST",

      body: JSON.stringify(
        payload
      ),
    }
  );
}

/**
 * ============================================================================
 * POLL RESULTS
 * ============================================================================
 */

export async function getPollResults(
  pollId: string
): Promise<PollResults> {
  const data =
    await publicFetch(
      `/public/polls/${pollId}/results`
    );

  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data)
  ) {
    throw new Error(
      "Invalid poll results response from server"
    );
  }

  return (
    data as {
      data: PollResults;
    }
  ).data;
}

/**
 * ============================================================================
 * QUICK VOTE
 * ============================================================================
 */

export async function getQuickVotes(
  filters?: {
    countyId?: string;
    constituencyId?: string;
    wardId?: string;
  }
): Promise<QuickVote[]> {
  const params =
    new URLSearchParams();

  if (filters?.countyId) {
    params.set(
      "countyId",
      filters.countyId
    );
  }

  if (filters?.constituencyId) {
    params.set(
      "constituencyId",
      filters.constituencyId
    );
  }

  if (filters?.wardId) {
    params.set(
      "wardId",
      filters.wardId
    );
  }

  const query =
    params.toString();

  const data =
    await publicFetch(
      `/public/quick-vote${
        query
          ? `?${query}`
          : ""
      }`
    );

  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data)
  ) {
    throw new Error(
      "Invalid quick vote response from server"
    );
  }

  return (
    data as {
      data: QuickVote[];
    }
  ).data;
}

export interface PublicAddedCandidate {
  id: string;
  name: string;
  party?: string | null;
  photoUrl?: string | null;
  description?: string | null;
  positionId: string;
  countyId?: string | null;
  constituencyId?: string | null;
  wardId?: string | null;
}

export interface PublicAddedCandidateResponse {
  candidate: PublicAddedCandidate;
  option: {
    id: string;
    questionId: string;
    label: string;
    value?: string | null;
    candidateId?: string | null;
    order: number;
    isActive: boolean;
  };
  existing?: boolean;
}


export async function addOtherCandidate(
  pollId: string,
  name: string
): Promise<PublicAddedCandidateResponse> {
  const data = await publicFetch(
    `/public/polls/${pollId}/other-candidate`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
      }),
    }
  );

  if (
    typeof data !== "object" ||
    data === null ||
    !("data" in data)
  ) {
    throw new Error(
      "Invalid candidate response from server"
    );
  }

  return (
    data as {
      data: PublicAddedCandidateResponse;
    }
  ).data;
}



// export async function addOtherCandidate(
//   pollId: string,
//   name: string
// ): Promise<PublicAddedCandidateResponse> {
//   return publicFetch(
//     `/public/polls/${pollId}/other-candidate`,
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         name,
//       }),
//     }
//   );
