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

# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run unit tests with the 80% coverage gate (same check CI runs)
npm run test:coverage

# Run integration tests against a deployed stack (needs API_URL and AWS/Cognito credentials)
npm run test:integration

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

Every PR targeting `dev` or `main` runs the **CI** workflow
(`.github/workflows/ci.yml`):

lint → typecheck → unit tests with coverage gate → cdk synth

- **Coverage gate:** Jest enforces an 80% global threshold on statements,
  branches, functions and lines (`jest.config.ts`). A PR that drops below any
  of them fails CI.
- **Integration tests** (`test/integration`) need a deployed stack, so they are
  not part of PR CI. Run them on demand from the **Integration tests** workflow
  (Actions tab → Run workflow, passing the API URL from the `cdk deploy`
  output), or locally with `npm run test:integration`.
- **Least privilege:** PR jobs use a read-only token and no AWS credentials,
  except the `cdk synth` step.

## Project structure

```
flagforge/
├── .github/workflows/   # CI (PR checks) and on-demand integration tests
├── bin/                 # CDK app entry point
├── lib/                 # CDK stack definitions
├── src/                 # Lambda handler source
├── test/                # Unit and integration tests
└── postman/             # API collection (added per ticket)
```

## ⚠️ Cost reminder

Always run `npx cdk destroy` at the end of every session.
