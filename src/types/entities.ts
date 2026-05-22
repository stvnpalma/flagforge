export interface ProjectEntity {
  readonly entityType: 'PROJECT';
  readonly PK: `PROJECT#${string}`;
  readonly SK: 'METADATA';
  readonly projectId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EnvironmentEntity {
  readonly entityType: 'ENVIRONMENT';
  readonly PK: `PROJECT#${string}`;
  readonly SK: `ENV#${string}`;
  readonly projectId: string;
  readonly envId: string;
  readonly name: string;
  readonly createdAt: string;
}

export interface FlagEntity {
  readonly entityType: 'FLAG';
  readonly PK: `PROJECT#${string}`;
  readonly SK: `FLAG#${string}`;
  readonly projectId: string;
  readonly flagKey: string;
  readonly name: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FlagEnvironmentEntity {
  readonly entityType: 'FLAG_ENVIRONMENT';
  readonly PK: `PROJECT#${string}`;
  readonly SK: `FLAGENV#${string}#${string}`;
  readonly GSI1PK: `ENV#${string}#${string}`;
  readonly GSI1SK: `FLAG#${string}`;
  readonly projectId: string;
  readonly envId: string;
  readonly flagKey: string;
  readonly enabled: boolean;
  readonly updatedAt: string;
}

export interface ApiKeyEntity {
  readonly entityType: 'API_KEY';
  readonly PK: `APIKEY#${string}`;
  readonly SK: 'METADATA';
  readonly keyHash: string;
  readonly projectId: string;
  readonly createdAt: string;
}

export type FlagForgeEntity =
  | ProjectEntity
  | EnvironmentEntity
  | FlagEntity
  | FlagEnvironmentEntity
  | ApiKeyEntity;
