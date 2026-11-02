# Threat Model

Scope: dashboard, Worker API, scheduled collectors, D1, CI, and provider integrations.

## Assets
- Cloudflare account and deployment credentials.
- GitHub repository and CI permissions.
- D1 integrity and availability.
- Provider credentials, if introduced later.
- User access sessions.
- Source provenance and event integrity.

## Trust boundaries
1. External provider -> collector.
2. Collector -> validation/normalization -> database.
3. Browser -> Worker API.
4. GitHub Actions -> Cloudflare deployment.
5. Private user -> protected dashboard.

## Threats and controls

| Threat | Example | Required controls |
|---|---|---|
| SSRF | Feed or config triggers fetch to internal IP | Fixed provider allowlist; validate hostname/IP; block loopback, private, link-local and reserved ranges; revalidate redirects; no user-supplied fetch URL |
| XSS | RSS title contains script | Render untrusted content as text; no raw HTML; sanitize any explicitly allowed markup |
| SQL injection | Query parameter concatenated into SQL | Prepared statements and strict validation |
| API abuse | Excessive polling exhausts quotas | Rate limits, cache, bounded pagination, request budgets |
| Data poisoning | False report enters event feed | Preserve original source; corroboration labels; corrections and stale markers |
| Secret leakage | Token committed or bundled | Worker secrets only; no secrets in VITE variables; secret scanning; least privilege |
| Dependency compromise | Vulnerable or malicious npm package | Minimal dependencies, lockfile, automated audit, review updates |
| Unauthorized access | Private dashboard/API exposed | Cloudflare Access or equivalent; protect both page and API |
| Resource exhaustion | Huge/malformed feed | Timeouts, response-size caps, parser limits, bounded retries |
| CI compromise | Workflow token too powerful | Minimal GitHub token permissions; pin Actions to reviewed commit SHAs before production |

## Confidence labels
- `unverified`: newly received report without independent corroboration.
- `corroborated`: supported by multiple independent sources.
- `official_source`: published by an identified official provider.
- `disputed`: credible sources materially conflict.

These labels describe provenance and corroboration, not absolute truth.

## Release gates
- No unresolved critical/high findings.
- SSRF tests cover redirects and private IP ranges.
- XSS tests cover titles, descriptions, and publisher names.
- API authorization is tested for every route.
- Secrets are absent from repository history and built assets.
- Dependency/workflow permissions are reviewed.
- Retention and incident response are documented.

## Residual risks
Feeds may be delayed, incomplete, manipulated, or unavailable. Geographic precision varies. Free-tier limits and terms may change. Access controls do not replace secure application code.
