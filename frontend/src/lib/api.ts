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

  async duplicate(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/${id}/duplicate`, {
      method: 'POST',
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

  async import(zipFile: File) {
    const formData = new FormData();
    formData.append('zipFile', zipFile);

    const response = await fetchWithErrorHandling(`${API_BASE_URL}/projects/import`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type with boundary for multipart/form-data
      body: formData,
    });
    return response.json();
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

  async reorder(floors: Array<{ id: number; order_index: number }>) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/floors/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ floors }),
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

// Walls API methods
export const wallsApi = {
  async getByRoomId(roomId: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/rooms/${roomId}/walls`);
    return response.json();
  },

  async update(id: number, data: { color?: string; material?: string }) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/walls/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },
};

// Assets API methods
export const assetsApi = {
  async getAll(params?: { category?: string; search?: string; limit?: number; favorite?: boolean }) {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.favorite) queryParams.append('favorite', 'true');

    const url = `${API_BASE_URL}/assets${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await fetchWithErrorHandling(url);
    return response.json();
  },

  async getById(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/assets/${id}`);
    return response.json();
  },

  async toggleFavorite(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/assets/${id}/favorite`, {
      method: 'PUT',
    });
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

// Settings API methods
export const settingsApi = {
  async getAll() {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/settings`);
    return response.json();
  },

  async update(settings: Record<string, string>) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/settings`, {
      method: 'PUT',
      body: JSON.stringify({ settings }),
    });
    return response.json();
  },

  async getApiKey(keyName: string) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/settings/api-key/${keyName}`);
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

// Lights API methods
export const lightsApi = {
  async getByRoom(roomId: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/rooms/${roomId}/lights`);
    return response.json();
  },

  async getByFloor(floorId: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/floors/${floorId}/lights`);
    return response.json();
  },

  async create(roomId: number, data: {
    type?: 'point' | 'spot' | 'area' | 'floor_lamp' | 'ceiling' | 'wall_sconce' | 'table_lamp' | 'pendant';
    name?: string;
    position_x?: number;
    position_y?: number;
    position_z?: number;
    intensity?: number;
    color?: string;
    cone_angle?: number;
    distance?: number;
    decay?: number;
    cast_shadow?: boolean;
    color_temperature?: number;
    target_x?: number;
    target_y?: number;
    target_z?: number;
    width?: number;
    height?: number;
    penumbra?: number;
  }) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/rooms/${roomId}/lights`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async update(id: number, data: any) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/lights/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async delete(id: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/lights/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },
};

// AI API methods
export const aiApi = {
  /**
   * Generate a 3D model from a photo using TRELLIS
   */
  async generateFromPhoto(formData: FormData) {
    const response = await fetch(`${API_BASE_URL}/ai/generate-from-photo`, {
      method: 'POST',
      body: formData, // Don't set Content-Type, let browser set it with boundary
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || 'Failed to generate model',
        response.status,
        errorData.error?.details || 'AI generation failed. Please try again.'
      );
    }

    return response.json();
  },

  /**
   * Get status of an AI generation
   */
  async getGenerationStatus(generationId: number) {
    const response = await fetchWithErrorHandling(`${API_BASE_URL}/ai/generation/${generationId}`);
    return response.json();
  },

  /**
   * Import product from URL by scraping image and specifications
   */
  async importFromUrl(url: string) {
    const response = await fetchWithErrorHandling(
      `${API_BASE_URL}/ai/url-import`,
      {
        method: 'POST',
        body: JSON.stringify({ url }),
      },
      60000 // 60 second timeout for scraping
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || 'Failed to import from URL',
        response.status,
        errorData.error?.details || 'URL import failed. Please try again.'
      );
    }

    return response.json();
  },

  /**
   * Confirm and save imported product as an asset
   */
  async confirmUrlImport(data: {
    name: string;
    category: string;
    subcategory?: string;
    imageUrl: string;
    dimensions: { width: number; height: number; depth: number };
    sourceUrl: string;
    generationId?: number;
  }) {
    const response = await fetchWithErrorHandling(
      `${API_BASE_URL}/ai/url-import/confirm`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || 'Failed to confirm import',
        response.status,
        errorData.error?.details || 'Failed to save imported asset. Please try again.'
      );
    }

    return response.json();
  }
};

/**
 * Export API methods
 */
export const exportApi = {
  /**
   * Export floor plan as PDF
   */
  async exportFloorPlan(projectId: number, floorId?: number, format: 'pdf' = 'pdf'): Promise<Blob> {
    const response = await fetchWithErrorHandling(
      `${API_BASE_URL}/export/floorplan`,
      {
        method: 'POST',
        body: JSON.stringify({ projectId, floorId, format }),
      },
      60000 // 60 second timeout for PDF generation
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || 'Failed to export floor plan',
        response.status,
        'Failed to generate floor plan. Please try again.'
      );
    }

    return response.blob();
  }
};
