import type { ApiResponse } from '@src/types/api';
import type { EnvironmentEntity, ProjectEntity } from '@src/types/entities';
import axios, { type AxiosResponse } from 'axios';

const BASE_URL = process.env.API_URL ?? '';

describe('Evaluation API — integration', () => {
  let projectId: string;
  let envId: string;

  beforeAll(async () => {
    if (!BASE_URL) {
      throw new Error('API_URL environment variable is required');
    }

    const projectRes: AxiosResponse<ApiResponse<ProjectEntity>> =
      await axios.post(`${BASE_URL}/projects`, {
        name: 'Evaluation Integration Test Project',
      });

    if (!projectRes.data.data) {
      throw new Error('Failed to create project: API response data is missing');
    }
    projectId = projectRes.data.data.projectId;

    const envRes: AxiosResponse<ApiResponse<EnvironmentEntity>> =
      await axios.post(`${BASE_URL}/projects/${projectId}/environments`, {
        name: 'production',
      });

    if (!envRes.data.data) {
      throw new Error(
        'Failed to create environment: API response data is missing',
      );
    }
    envId = envRes.data.data.envId;

    await axios.post(`${BASE_URL}/projects/${projectId}/flags`, {
      flagKey: 'dark-mode',
      name: 'Dark mode',
    });

    await axios.put(
      `${BASE_URL}/projects/${projectId}/flags/dark-mode/environments/${envId}`,
      { enabled: true },
    );
  });

  describe('GET /projects/:projectId/environments/:envId/evaluate', () => {
    it('returns 200 with the flag map for the environment', async () => {
      const response: AxiosResponse<ApiResponse<Record<string, boolean>>> =
        await axios.get(
          `${BASE_URL}/projects/${projectId}/environments/${envId}/evaluate`,
        );

      expect(response.status).toBe(200);
      expect(response.data.data).toEqual({ 'dark-mode': true });
    });

    it('returns 200 with an empty object for an unknown environment (fail open)', async () => {
      const response: AxiosResponse<ApiResponse<Record<string, boolean>>> =
        await axios.get(
          `${BASE_URL}/projects/${projectId}/environments/does-not-exist/evaluate`,
        );

      expect(response.status).toBe(200);
      expect(response.data.data).toEqual({});
    });
  });

  describe('GET /projects/:projectId/environments/:envId/evaluate/:flagKey', () => {
    it('returns enabled true for a known, enabled flag', async () => {
      const response: AxiosResponse<
        ApiResponse<{ flagKey: string; enabled: boolean }>
      > = await axios.get(
        `${BASE_URL}/projects/${projectId}/environments/${envId}/evaluate/dark-mode`,
      );

      expect(response.status).toBe(200);
      expect(response.data.data?.enabled).toBe(true);
    });

    it('returns enabled false (fail closed) for an unknown flag', async () => {
      const response: AxiosResponse<
        ApiResponse<{ flagKey: string; enabled: boolean }>
      > = await axios.get(
        `${BASE_URL}/projects/${projectId}/environments/${envId}/evaluate/unknown-flag`,
      );

      expect(response.status).toBe(200);
      expect(response.data.data?.enabled).toBe(false);
    });
  });
});
