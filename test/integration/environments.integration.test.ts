import type { ApiResponse } from '@src/types/api';
import type { EnvironmentEntity } from '@src/types/entities';
import axios, { type AxiosResponse } from 'axios';

const BASE_URL = process.env.API_URL ?? '';

describe('Environments API — integration', () => {
  let projectId: string;

  beforeAll(async () => {
    if (!BASE_URL) {
      throw new Error('API_URL environment variable is required');
    }

    const response = await axios.post(`${BASE_URL}/projects`, {
      name: 'Env Integration Test Project',
    });

    projectId =
      (response.data as ApiResponse<{ projectId: string }>).data?.projectId ??
      '';
  });

  describe('POST /projects/:projectId/environments', () => {
    it('creates an environment and returns 201', async () => {
      const response: AxiosResponse<ApiResponse<EnvironmentEntity>> =
        await axios.post(`${BASE_URL}/projects/${projectId}/environments`, {
          name: 'Production',
        });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data?.name).toBe('Production');
      expect(response.data.data?.projectId).toBe(projectId);
    });

    it('returns 404 for non-existent project', async () => {
      try {
        await axios.post(`${BASE_URL}/projects/non-existent/environments`, {
          name: 'Production',
        });
        fail('Expected request to throw');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(404);
        } else {
          throw error;
        }
      }
    });

    it('returns 400 when name is missing', async () => {
      try {
        await axios.post(`${BASE_URL}/projects/${projectId}/environments`, {});
        fail('Expected request to throw');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(400);
        } else {
          throw error;
        }
      }
    });
  });

  describe('GET /projects/:projectId/environments', () => {
    it('returns 200 with array of environments', async () => {
      const response: AxiosResponse<ApiResponse<EnvironmentEntity[]>> =
        await axios.get(`${BASE_URL}/projects/${projectId}/environments`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });
});
