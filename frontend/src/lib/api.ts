// API utilities with error handling

const API_BASE_URL = 'http://localhost:5001/api';

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
 * Fetch wrapper with user-friendly error handling
 */
async function fetchWithErrorHandling(
  url: string,
  options?: RequestInit
): Promise<Response> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

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
    // Handle network errors (backend down, no internet, etc.)
    if (error instanceof ApiError) {
      throw error;
    }

    // Network errors (connection refused, timeout, DNS failures, etc.)
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
};

// Health check
export const healthApi = {
  async check() {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/health`);
    return response.json();
  },
};
