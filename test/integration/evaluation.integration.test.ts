import type { ApiResponse } from '@src/types/api';
import type { EnvironmentEntity, ProjectEntity } from '@src/types/entities';
import axios, { type AxiosInstance, type AxiosResponse } from 'axios';
import { getTestUserToken } from '../setup/auth';

const BASE_URL = process.env.API_URL ?? '';

describe('Evaluation API — integration', () => {
  let projectId: string;
  let envId: string;
  let managementClient: AxiosInstance;

  beforeAll(async () => {
    if (!BASE_URL) {
      throw new Error('API_URL environment variable is required');
    }

    const token = await getTestUserToken();
    managementClient = axios.create({
      baseURL: BASE_URL,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const projectRes: AxiosResponse<ApiResponse<ProjectEntity>> =
      await managementClient.post('/projects', {
        name: 'Evaluation Integration Test Project',
      });

    projectId = projectRes.data.data?.projectId ?? '';
    if (!projectId)
      throw new Error('Project ID was not returned from setup API');

    const envRes: AxiosResponse<ApiResponse<EnvironmentEntity>> =
      await managementClient.post(`/projects/${projectId}/environments`, {
        name: 'production',
      });

    envId = envRes.data.data?.envId ?? '';
    if (!envId)
      throw new Error('Environment ID was not returned from setup API');

    await managementClient.post(`/projects/${projectId}/flags`, {
      flagKey: 'dark-mode',
      name: 'Dark mode',
    });

    await managementClient.put(
      `/projects/${projectId}/flags/dark-mode/environments/${envId}`,
      { enabled: true },
    );
  }, 15000);

  async function generateFreshApiKey(): Promise<string> {
    const keyRes = await managementClient.post(
      `/projects/${projectId}/api-keys`,
    );
    return (keyRes.data as { data: { apiKey: string } }).data.apiKey;
  }

  describe('GET /projects/:projectId/environments/:envId/evaluate', () => {
    it('returns 200 with the flag map for the environment', async () => {
      const apiKey = await generateFreshApiKey();
      const response: AxiosResponse<ApiResponse<Record<string, boolean>>> =
        await axios.get(
          `${BASE_URL}/projects/${projectId}/environments/${envId}/evaluate`,
          { headers: { 'x-api-key': apiKey } },
        );

      expect(response.status).toBe(200);
      expect(response.data.data).toEqual({ 'dark-mode': true });
    });

    it('returns 200 with an empty object for an unknown environment (fail open)', async () => {
      const apiKey = await generateFreshApiKey();
      const response: AxiosResponse<ApiResponse<Record<string, boolean>>> =
        await axios.get(
          `${BASE_URL}/projects/${projectId}/environments/does-not-exist/evaluate`,
          { headers: { 'x-api-key': apiKey } },
        );

      expect(response.status).toBe(200);
      expect(response.data.data).toEqual({});
    });
  });

  describe('GET /projects/:projectId/environments/:envId/evaluate/:flagKey', () => {
    it('returns enabled true for a known, enabled flag', async () => {
      const apiKey = await generateFreshApiKey();
      const response: AxiosResponse<
        ApiResponse<{ flagKey: string; enabled: boolean }>
      > = await axios.get(
        `${BASE_URL}/projects/${projectId}/environments/${envId}/evaluate/dark-mode`,
        { headers: { 'x-api-key': apiKey } },
      );

      expect(response.status).toBe(200);
      expect(response.data.data?.enabled).toBe(true);
    });

    it('returns enabled false (fail closed) for an unknown flag', async () => {
      const apiKey = await generateFreshApiKey();
      const response: AxiosResponse<
        ApiResponse<{ flagKey: string; enabled: boolean }>
      > = await axios.get(
        `${BASE_URL}/projects/${projectId}/environments/${envId}/evaluate/unknown-flag`,
        { headers: { 'x-api-key': apiKey } },
      );

      expect(response.status).toBe(200);
      expect(response.data.data?.enabled).toBe(false);
    });
  });
});
