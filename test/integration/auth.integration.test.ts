import axios from 'axios';
import {
  createApiKeyClient,
  createAuthenticatedClient,
} from '../setup/apiClient';
import { getTestUserToken } from '../setup/auth';

const BASE_URL = process.env.API_URL ?? '';

describe('Authentication — integration', () => {
  beforeAll(() => {
    if (!BASE_URL) {
      throw new Error('API_URL environment variable is required');
    }
  });

  describe('Management endpoints — Cognito JWT', () => {
    it('returns 401 with no Authorization header', async () => {
      expect.assertions(1);
      try {
        await axios.post(`${BASE_URL}/projects`, { name: 'Should fail' });
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
        } else {
          throw error;
        }
      }
    });

    it('returns 401 with an invalid token', async () => {
      expect.assertions(1);
      try {
        await axios.post(
          `${BASE_URL}/projects`,
          { name: 'Should fail' },
          { headers: { Authorization: 'Bearer not-a-real-token' } },
        );
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
        } else {
          throw error;
        }
      }
    });

    it('returns 201 with a valid Cognito token', async () => {
      const token = await getTestUserToken();
      const client = createAuthenticatedClient(BASE_URL, token);

      const response = await client.post('/projects', {
        name: 'Authenticated Project',
      });

      expect(response.status).toBe(201);

      const body = response.data as { data: { name: string } };
      expect(body.data.name).toBe('Authenticated Project');
    });
  });

  describe('Evaluation endpoints — API key', () => {
    let projectId: string;
    let envId: string;
    let apiKey: string;

    beforeAll(async () => {
      const token = await getTestUserToken();
      const client = createAuthenticatedClient(BASE_URL, token);

      const projectRes = await client.post('/projects', {
        name: 'API Key Test Project',
      });
      const projectBody = projectRes.data as { data: { projectId: string } };
      projectId = projectBody.data.projectId;

      const envRes = await client.post(`/projects/${projectId}/environments`, {
        name: 'production',
      });
      const envBody = envRes.data as { data: { envId: string } };
      envId = envBody.data.envId;

      const keyRes = await client.post(`/projects/${projectId}/api-keys`);
      const keyBody = keyRes.data as { data: { apiKey: string } };
      apiKey = keyBody.data.apiKey;
    });

    it('returns 401 with no x-api-key header', async () => {
      expect.assertions(1);
      try {
        await axios.get(
          `${BASE_URL}/projects/${projectId}/environments/${envId}/evaluate`,
        );
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
        } else {
          throw error;
        }
      }
    });

    it('returns 401 with an invalid x-api-key', async () => {
      expect.assertions(1);
      try {
        await axios.get(
          `${BASE_URL}/projects/${projectId}/environments/${envId}/evaluate`,
          { headers: { 'x-api-key': 'ffk_not_a_real_key' } },
        );
      } catch (error) {
        if (axios.isAxiosError(error)) {
          expect(error.response?.status).toBe(401);
        } else {
          throw error;
        }
      }
    });

    it('returns 200 with a valid x-api-key', async () => {
      const client = createApiKeyClient(BASE_URL, apiKey);
      const response = await client.get(
        `/projects/${projectId}/environments/${envId}/evaluate`,
      );

      expect(response.status).toBe(200);

      const body = response.data as { success: boolean };
      expect(body.success).toBe(true);
    });
  });
});
