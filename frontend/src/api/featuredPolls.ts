const API_URL =
  "https://kenyaopinionpolls.onrender.com/api";

function getToken() {
  return localStorage.getItem("token");
}

async function featuredAdminFetch(
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
| Public Featured Polls
|--------------------------------------------------------------------------
*/

export async function getFeaturedPolls() {
  const response = await fetch(
    `${API_URL}/public/featured-polls`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to load featured polls"
    );
  }

  return data.data;
}

/*
|--------------------------------------------------------------------------
| Admin Featured Polls
|--------------------------------------------------------------------------
*/

export async function getAdminFeaturedPolls() {
  const data = await featuredAdminFetch(
    "/admin/featured-polls"
  );

  return data.data;
}

/*
|--------------------------------------------------------------------------
| Available Polls
|--------------------------------------------------------------------------
*/

export async function getAvailableFeaturedPolls() {
  const data = await featuredAdminFetch(
    "/admin/featured-polls/available"
  );

  return data.data;
}

/*
|--------------------------------------------------------------------------
| Feature Poll
|--------------------------------------------------------------------------
*/

export async function featurePoll(
  pollId: string
) {
  const data = await featuredAdminFetch(
    `/admin/featured-polls/${pollId}`,
    {
      method: "POST",
    }
  );

  return data.data;
}

/*
|--------------------------------------------------------------------------
| Remove Featured Poll
|--------------------------------------------------------------------------
*/

export async function removeFeaturedPoll(
  pollId: string
) {
  const data = await featuredAdminFetch(
    `/admin/featured-polls/${pollId}`,
    {
      method: "DELETE",
    }
  );

  return data.data;
}

/*
|--------------------------------------------------------------------------
| Update Featured Order
|--------------------------------------------------------------------------
*/

export async function updateFeaturedPollOrder(
  pollId: string,
  featuredOrder: number
) {
  const data = await featuredAdminFetch(
    `/admin/featured-polls/${pollId}/order`,
    {
      method: "PUT",

      body: JSON.stringify({
        featuredOrder,
      }),
    }
  );

  return data.data;
}