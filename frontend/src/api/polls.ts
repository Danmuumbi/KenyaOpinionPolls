const API_URL = "http://localhost:5000/api";

export interface Candidate {
  id: string;
  name: string;
  party?: string | null;
  photoUrl?: string | null;
  description?: string | null;
}

export interface PollOption {
  id: string;
  label: string;
  value?: string | null;
  candidateId?: string | null;
  candidate?: Candidate | null;
  order: number;
  isActive: boolean;
}

export interface PollQuestion {
  id: string;
  question: string;
  description?: string | null;
  order: number;
  isRequired: boolean;
  options: PollOption[];
}

export interface Position {
  id: string;
  name: string;
  scope: string;
  description?: string | null;
}

export interface Poll {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  positionId?: string | null;
  position?: Position | null;
  startsAt?: string | null;
  endsAt?: string | null;
  allowResults: boolean;
  isPublic: boolean;
  questions: PollQuestion[];
  createdAt: string;
  updatedAt: string;
}

export async function getPublicPolls(): Promise<Poll[]> {
  const response = await fetch(
    `${API_URL}/polls`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch polls"
    );
  }

  return data.data;
}

export async function getPoll(
  pollId: string
): Promise<Poll> {
  const response = await fetch(
    `${API_URL}/polls/${pollId}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch poll"
    );
  }

  return data.data;
}

export interface SubmitAnswer {
  questionId: string;
  optionId: string;
}

export interface SubmitResponsePayload {
  pollId: string;
  countyId: string;
  constituencyId: string;
  wardId: string;
  answers: SubmitAnswer[];
}

export async function submitResponse(
  payload: SubmitResponsePayload
) {
  const response = await fetch(
    `${API_URL}/responses`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to submit response"
    );
  }

  return data;
}