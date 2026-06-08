import { config } from 'dotenv';
import { resolve } from 'path';

export default function globalSetup(): Promise<void> {
  config({ path: resolve(__dirname, '../../.env.local') });
  return Promise.resolve();
}
