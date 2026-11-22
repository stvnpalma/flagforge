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
  describe('API key scoping', () => {
    const crossProjectRoutes: [string, string][] = [
      ['evaluate all flags', 'evaluate'],
      ['evaluate a single flag', 'evaluate/dark-mode'],
    ];

    it.each(crossProjectRoutes)(
      'returns 403 when a key from another project is used to %s',
      async (_description, routeSuffix) => {
        const otherProjectRes = await managementClient.post<
          ApiResponse<ProjectEntity>
        >('/projects', { name: 'Other Project (scoping test)' });

        const otherProjectId = otherProjectRes.data.data?.projectId ?? '';
        if (!otherProjectId) {
          throw new Error('Other project ID was not returned from setup API');
        }

        const apiKey = await generateFreshApiKey();
        const response = await axios.get<ApiResponse<never>>(
          `${BASE_URL}/projects/${otherProjectId}/environments/${envId}/${routeSuffix}`,
          { headers: { 'x-api-key': apiKey }, validateStatus: () => true },
        );

        expect(response.status).toBe(403);
      },
      15000,
    );

    it('returns 404 when creating a key for a project that does not exist', async () => {
      const response = await managementClient.post<ApiResponse<never>>(
        '/projects/does-not-exist/api-keys',
        undefined,
        { validateStatus: () => true },
      );

      expect(response.status).toBe(404);
    });
  });
});
