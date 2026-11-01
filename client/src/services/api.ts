import type { ProjectData, VideoMetadata, SubtitleValidationResult, ExportJob } from '../types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed: ${res.status}`);
  }

  return data as T;
}

// ---- Projects ----
export const api = {
  projects: {
    list: () => request<Array<{ id: string; title: string; updatedAt: string; videoName: string | null; cueCount: number }>>('/projects'),
    create: (title: string) => request<ProjectData>('/projects', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
    get: (id: string) => request<ProjectData>(`/projects/${id}`),
    update: (id: string, data: ProjectData) => request<ProjectData>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id: string) => request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),
  },

  upload: {
    video: async (file: File): Promise<VideoMetadata> => {
      const formData = new FormData();
      formData.append('video', file);
      const res = await fetch(`${BASE_URL}/upload/video`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
      return data as VideoMetadata;
    },

    subtitles: async (file: File, videoDuration?: number): Promise<SubtitleValidationResult> => {
      const formData = new FormData();
      formData.append('subtitles', file);
      if (videoDuration) formData.append('videoDuration', String(videoDuration));
      const res = await fetch(`${BASE_URL}/upload/subtitles`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      if (!res.ok) throw new Error(data.error || `Upload failed: ${res.status}`);
      return data as SubtitleValidationResult;
    },
  },

  media: {
    videoUrl: (fileId: string) => `${BASE_URL}/media/${fileId}`,
  },

  export: {
    start: (projectId: string) => request<ExportJob>('/export', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    }),
    status: (jobId: string) => request<ExportJob>(`/export/${jobId}`),
    downloadUrl: (jobId: string) => `${BASE_URL}/export/${jobId}/download`,
    cancel: (jobId: string) => request<{ success: boolean }>(`/export/${jobId}/cancel`, { method: 'POST' }),
  },

  health: () => request<{ status: string; ffmpeg: { version: string; hasLibAss: boolean } }>('/health'),
};
