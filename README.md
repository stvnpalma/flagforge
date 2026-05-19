# FlagForge

A high-performance, real-time Feature Flag SaaS API built with AWS CDK,
TypeScript, API Gateway, Lambda, and DynamoDB.

## Prerequisites

| Tool        | Version                           |
| ----------- | --------------------------------- |
| Node.js     | >= 22.0.0                         |
| npm         | >= 10.0.0                         |
| AWS CDK CLI | >= 2.0.0                          |
| AWS CLI     | Configured with valid credentials |

## Local development

```bash
# Install dependencies
npm ci

# Run linter
npm run lint

# Auto-fix lint issues
npm run lint:fix

# Type-check without emitting
npm run typecheck

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Synthesise CloudFormation template (no deployment)
npx cdk synth

# Deploy to AWS (dev stage)
npx cdk deploy

# Destroy all deployed resources
npx cdk destroy
```

## Branch strategy

```
main        ← production, locked, tagged with semantic versions
dev         ← integration branch, all PRs merge here first
feature/*   ← new work, branched from dev
bugfix/*    ← bug fixes, branched from dev
```

## Commit convention

```
feat:      new feature
fix:       bug fix
chore:     tooling, config, dependencies
test:      adding or updating tests
docs:      documentation only
refactor:  code change with no behavior change
```

## CI/CD

Every PR targeting `dev` or `main` triggers the GitHub Actions pipeline:
lint → typecheck → test → cdk synth.

## Project structure

```
flagforge/
├── .github/workflows/   # CI pipeline
├── bin/                 # CDK app entry point
├── lib/                 # CDK stack definitions
├── src/                 # Lambda handler source
├── test/                # Unit and integration tests
└── postman/             # API collection (added per ticket)
```

## ⚠️ Cost reminder

Always run `npx cdk destroy` at the end of every session.
