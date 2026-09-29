const API_URL = "http://localhost:5000/api";

export interface County {
  id: string;
  code: number;
  name: string;
}

export interface Constituency {
  id: string;
  code: string;
  name: string;
  countyId: string;
}

export interface Ward {
  id: string;
  code: string;
  name: string;
  constituencyId: string;
}

export async function getCounties(): Promise<
  County[]
> {
  const response = await fetch(
    `${API_URL}/geography/counties`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch counties"
    );
  }

  return data.data;
}

export async function getConstituencies(
  countyId: string
): Promise<Constituency[]> {
  const response = await fetch(
    `${API_URL}/geography/counties/${countyId}/constituencies`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch constituencies"
    );
  }

  return data.data;
}

export async function getWards(
  constituencyId: string
): Promise<Ward[]> {
  const response = await fetch(
    `${API_URL}/geography/constituencies/${constituencyId}/wards`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Failed to fetch wards"
    );
  }

  return data.data;
}