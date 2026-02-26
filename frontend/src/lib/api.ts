// API utilities with error handling

const API_BASE_URL = 'http://localhost:5000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public userMessage?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper with user-friendly error handling and timeout support
 */
async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit,
  timeoutMs = 30000 // 30 second default timeout
): Promise<Response> {
  // Create an AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Handle different HTTP error codes with user-friendly messages
      let userMessage = 'Something went wrong. Please try again.';

      if (response.status === 404) {
        userMessage = 'The requested resource was not found.';
      } else if (response.status === 500) {
        userMessage = 'Server error. Please try again later.';
      } else if (response.status === 503) {
        userMessage = 'Service temporarily unavailable. Please try again later.';
      }

      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        userMessage
      );
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle network errors (backend down, no internet, etc.)
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle timeout errors (AbortError)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError(
        'Request timeout',
        undefined,
        'The request took too long to complete. Please try again.'
      );
    }

    // Network errors (connection refused, DNS failures, etc.)
    // Fetch API throws TypeError for network failures
    if (error instanceof TypeError) {
      throw new ApiError(
        'Network error',
        undefined,
        'Unable to connect to the server. Please check your connection and make sure the backend is running.'
      );
    }

    // Generic catch-all for any other errors
    throw new ApiError(
      error instanceof Error ? error.message : 'Unknown error',
      undefined,
      'An unexpected error occurred. Please try again.'
    );
  }
}

// Project API methods
export const projectsApi = {
  async getAll() {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects`);
    return response.json();
  },

  async getById(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/${id}`);
    return response.json();
  },

  async create(data: { name: string; description?: string }) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async update(id: number, data: { name?: string; description?: string }) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async delete(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async export(id: number): Promise<Blob> {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/${id}/export`, {
      method: 'POST',
      headers: {}, // Remove Content-Type header for blob response
    });
    return response.blob();
  },
};

// Floors API methods
export const floorsApi = {
  async getByProject(projectId: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/${projectId}/floors`);
    return response.json();
  },

  async create(projectId: number, data: { name: string; level: number; order_index: number }) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/${projectId}/floors`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async update(id: number, data: { name?: string; level?: number; order_index?: number }) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/floors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async delete(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/floors/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },
};

// Rooms API methods
export const roomsApi = {
  async getByFloor(floorId: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/floors/${floorId}/rooms`);
    return response.json();
  },

  async create(floorId: number, data: {
    name?: string;
    dimensions_json: any;
    floor_material?: string;
    floor_color?: string;
    ceiling_height?: number;
    ceiling_material?: string;
    ceiling_color?: string;
    position_x?: number;
    position_y?: number;
    position_z?: number;
  }) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/floors/${floorId}/rooms`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async update(id: number, data: any) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async delete(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/rooms/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },
};

// Assets API methods
export const assetsApi = {
  async getAll(params?: { category?: string; search?: string; limit?: number }) {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const url = `${API_BASE_URL}/assets${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await fetchWithErrorHandling(url);
    return response.json();
  },

  async getById(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/assets/${id}`);
    return response.json();
  },
};

// Furniture placements API methods
export const furnitureApi = {
  async getByRoom(roomId: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/rooms/${roomId}/furniture`);
    return response.json();
  },

  async create(roomId: number, data: {
    asset_id: number;
    position_x: number;
    position_y: number;
    position_z: number;
    rotation_x?: number;
    rotation_y?: number;
    rotation_z?: number;
    scale_x?: number;
    scale_y?: number;
    scale_z?: number;
  }) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/rooms/${roomId}/furniture`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async update(id: number, data: any) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/furniture/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async delete(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/furniture/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },
};

// Health check
export const healthApi = {
  async check() {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/health`);
    return response.json();
  },
};
