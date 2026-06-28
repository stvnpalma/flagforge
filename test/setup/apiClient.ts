import axios, { type AxiosInstance } from 'axios';

export function createAuthenticatedClient(
  baseURL: string,
  token: string,
): AxiosInstance {
  return axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function createApiKeyClient(
  baseURL: string,
  apiKey: string,
): AxiosInstance {
  return axios.create({
    baseURL,
    headers: { 'x-api-key': apiKey },
  });
}
