import type { ApiResponse } from '@src/types/api';
import type { ProjectEntity } from '@src/types/entities';
import axios, { type AxiosResponse } from 'axios';

const BASE_URL = process.env.API_URL ?? '';

describe('Projects API — integration', () => {
  let createdProjectId: string;

  beforeAll(() => {
    if (!BASE_URL) {
      throw new Error(
        'API_URL environment variable is required for integration tests. ' +
          'Run: API_URL=https://your-api-id.execute-api.region.amazonaws.com/prod npm run test:integration',
      );
    }
  });

  describe('POST /projects', () => {
    it('creates a project and returns 201', async () => {
      const response: AxiosResponse<ApiResponse<ProjectEntity>> =
        await axios.post(`${BASE_URL}/projects`, {
          name: 'Integration Test Project',
        });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data?.name).toBe('Integration Test Project');
      expect(response.data.data?.projectId).toBeDefined();

      createdProjectId = response.data.data?.projectId ?? '';
    });
  });

  describe('GET /projects', () => {
    it('returns 200 with array of projects', async () => {
      const response: AxiosResponse<ApiResponse<ProjectEntity[]>> =
        await axios.get(`${BASE_URL}/projects`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('GET /projects/:projectId', () => {
    it('returns 200 with project when found', async () => {
      const response: AxiosResponse<ApiResponse<ProjectEntity>> =
        await axios.get(`${BASE_URL}/projects/${createdProjectId}`);

      expect(response.status).toBe(200);
      expect(response.data.data?.projectId).toBe(createdProjectId);
    });

    it('returns 404 for non-existent project', async () => {
      try {
        await axios.get(`${BASE_URL}/projects/non-existent-id`);
        fail('Expected request to throw');
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const responseData = error.response?.data as
            | Record<string, unknown>
            | undefined;
          expect(error.response?.status).toBe(404);
          expect(responseData?.success).toBe(false);
        } else {
          throw error;
        }
      }
    });
  });
});
