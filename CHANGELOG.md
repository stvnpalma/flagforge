# Changelog

## v0.1.0 — MVP release

First public release. Full project → environment → flag management
with two-tier authentication and a sub-3-second evaluation hot path.

### Added

- **FF-001** Repository bootstrap: strict TypeScript, ESLint flat config,
  Jest 30, GitHub Actions CI (lint, typecheck, test, cdk synth)
- **FF-002** DynamoDB single-table schema — Project, Environment, Flag,
  FlagEnvironment, ApiKey entities with GSI1 for environment-scoped lookups
- **FF-003** API Gateway + Lambda foundation — typed HTTP responses,
  typed error hierarchy, DynamoDB client singleton
- **FF-004** `POST /projects` — create project
- **FF-005** `GET /projects`, `GET /projects/:projectId` — structured
  JSON logging, least-privilege IAM, X-Ray tracing introduced
- **FF-006** Environments CRUD — `TransactWriteItems` enforces referential
  integrity (no orphaned environments)
- **FF-007** Feature Flags CRUD — flag definitions decoupled from
  per-environment state
- **FF-008** Flag evaluation endpoint — GSI1-backed bulk read, 3s timeout,
  fail-open (unknown env → `200` + `{}`) / fail-closed (unknown flag →
  `enabled: false`)
- **FF-009** Authentication — Cognito JWT for management endpoints,
  SHA-256-hashed API keys for evaluation endpoints

### Infrastructure

- AWS CDK (TypeScript), API Gateway, Lambda (ARM_64/Graviton2), DynamoDB
  (on-demand billing), Cognito User Pool, CloudWatch (30-day retention),
  X-Ray active tracing
