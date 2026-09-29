const API_URL = "http://localhost:5000/api";

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    admin: Admin;
  };
}

export async function login(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed");
  }

  return data;
}

export async function getCurrentAdmin(): Promise<Admin> {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("No authentication token");
  }

  const response = await fetch(`${API_URL}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Authentication failed");
  }

  return data.data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("admin");
}