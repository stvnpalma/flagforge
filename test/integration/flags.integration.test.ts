import type { ApiResponse } from '@src/types/api';
import type {
  EnvironmentEntity,
  FlagEntity,
  FlagEnvironmentEntity,
  ProjectEntity,
} from '@src/types/entities';
import axios, { type AxiosResponse } from 'axios';

const BASE_URL = process.env['API_URL'] ?? '';

describe('Flags API — integration', () => {
  let projectId: string;
  let envId: string;

  beforeAll(async () => {
    if (!BASE_URL) {
      throw new Error('API_URL environment variable is required');
    }

    const projectRes: AxiosResponse<ApiResponse<ProjectEntity>> =
      await axios.post(`${BASE_URL}/projects`, {
        name: 'Flags Integration Test Project',
      });
    projectId = projectRes.data.data!.projectId;

    const envRes: AxiosResponse<ApiResponse<EnvironmentEntity>> =
      await axios.post(`${BASE_URL}/projects/${projectId}/environments`, {
        name: 'staging',
      });
    envId = envRes.data.data!.envId;
  });

  it('creates a flag, sets its state, and verifies the state — full lifecycle', async () => {
    const createRes: AxiosResponse<ApiResponse<FlagEntity>> = await axios.post(
      `${BASE_URL}/projects/${projectId}/flags`,
      {
        flagKey: 'new-checkout-flow',
        name: 'New checkout flow',
        description: 'Rolls out the redesigned checkout',
      },
    );

    expect(createRes.status).toBe(201);
    expect(createRes.data.data?.flagKey).toBe('new-checkout-flow');

    const setRes: AxiosResponse<ApiResponse<FlagEnvironmentEntity>> =
      await axios.put(
        `${BASE_URL}/projects/${projectId}/flags/new-checkout-flow/environments/${envId}`,
        { enabled: true },
      );

    expect(setRes.status).toBe(200);
    expect(setRes.data.data?.enabled).toBe(true);

    const getRes: AxiosResponse<ApiResponse<FlagEnvironmentEntity>> =
      await axios.get(
        `${BASE_URL}/projects/${projectId}/flags/new-checkout-flow/environments/${envId}`,
      );

    expect(getRes.status).toBe(200);
    expect(getRes.data.data?.enabled).toBe(true);
  });

  it('returns 400 for an invalid flagKey format', async () => {
    try {
      await axios.post(`${BASE_URL}/projects/${projectId}/flags`, {
        flagKey: 'Invalid Key!',
        name: 'Bad key',
      });
      throw new Error('Expected request to throw 400 Bad Request');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        expect(error.response?.status).toBe(400);
      } else {
        throw error;
      }
    }
  });

  it('returns 409 when flag key already exists', async () => {
    await axios.post(`${BASE_URL}/projects/${projectId}/flags`, {
      flagKey: 'duplicate-flag',
      name: 'First',
    });

    try {
      await axios.post(`${BASE_URL}/projects/${projectId}/flags`, {
        flagKey: 'duplicate-flag',
        name: 'Second',
      });
      throw new Error('Expected request to throw 409 Conflict');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        expect(error.response?.status).toBe(409);
      } else {
        throw error;
      }
    }
  });

  it('returns 404 when setting state for a non-existent flag', async () => {
    try {
      await axios.put(
        `${BASE_URL}/projects/${projectId}/flags/does-not-exist/environments/${envId}`,
        { enabled: true },
      );
      throw new Error('Expected request to throw 404 Not Found');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        expect(error.response?.status).toBe(404);
      } else {
        throw error;
      }
    }
  });
});
