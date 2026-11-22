# Security policy

TydBase sits between people, AI agents and production databases, and it stores database
credentials. We treat a vulnerability here as serious even before a stable release exists.

## Supported versions

TydBase is pre-release. Fixes land on `main` and in the next published binary and image. Older
builds are not patched.

## Reporting a vulnerability

**Do not open a public issue, discussion or pull request for a vulnerability.**

Report it privately through
[GitHub private vulnerability reporting](https://github.com/neeomdumham/tydbase/security/advisories/new).

Include what you can of:

- the version (`tydbase version`) and how it runs (binary `start`/`server`, Docker image, the site);
- the component (engine API, MCP server, credential vault, relay agent, web app, marketing site and
  waitlist);
- steps to reproduce: a request, a query, an MCP tool call, or a configuration;
- what an attacker gains, and what they need first (network reach, an account, a token, the
  ability to put text in front of an AI agent).

## What happens next

| | Within |
| --- | --- |
| Acknowledgement | 3 business days |
| Initial assessment: confirmed or not, and severity | 7 days |
| A fix, or a plan with a date, for a critical or high issue | 30 days |

A confirmed issue is fixed privately, released, and then disclosed in a GitHub security advisory,
with a CVE where one applies. Disclosure is coordinated with you, within 90 days of the report at
most. Reporters are credited unless they would rather not be.

## Scope

Everything in this repository is in scope. These are vulnerabilities in particular:

- reading a stored database credential, or the vault key, without being its owner;
- reaching another workspace's connections, queries, audit log or approvals (IDOR);
- running a write through a read-only path: a query, an MCP tool, or `execute_read_query`;
- bypassing a mutation approval, a guardrail or PII masking;
- reaching a private, loopback or cloud-metadata address from `server` mode (SSRF);
- MCP or API access without the token or session it requires, or beyond its scope;
- a secret written to a log, an error, an audit entry or an AI agent's context;
- a crafted query, result or tool call that stalls or crashes the engine.

Out of scope: self-XSS, missing security headers without a demonstrated impact, issues that need
an already-compromised host, and denial of service by volume alone.
