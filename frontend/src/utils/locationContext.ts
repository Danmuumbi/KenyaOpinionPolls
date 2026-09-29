export interface PollLocationContext {
  countyId: string;
  constituencyId: string;
  wardId: string;
}

const STORAGE_KEY =
  "kenya_opinion_poll_location";

const EMPTY_CONTEXT: PollLocationContext = {
  countyId: "",
  constituencyId: "",
  wardId: "",
};

export function getLocationContext(): PollLocationContext {
  try {
    const stored =
      localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return { ...EMPTY_CONTEXT };
    }

    const parsed = JSON.parse(stored);

    return {
      countyId:
        typeof parsed.countyId === "string"
          ? parsed.countyId
          : "",

      constituencyId:
        typeof parsed.constituencyId ===
        "string"
          ? parsed.constituencyId
          : "",

      wardId:
        typeof parsed.wardId === "string"
          ? parsed.wardId
          : "",
    };
  } catch {
    return { ...EMPTY_CONTEXT };
  }
}

export function saveLocationContext(
  context: PollLocationContext
) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(context)
  );
}

export function clearLocationContext() {
  localStorage.removeItem(STORAGE_KEY);
}