# Security Practices

## Secrets
- Never commit API keys, tokens, cookies, session data, or private credentials.
- Never put secrets in `VITE_*` variables; these are public browser build values.
- Use Cloudflare Worker secrets for backend credentials.
- Use short-lived, least-privilege credentials.
- Rotate credentials suspected of exposure.

## External data
- Fetch only pre-approved provider domains.
- Never expose an arbitrary URL-fetch endpoint.
- Apply request timeouts and response-size limits.
- Validate content type and parse defensively.
- Treat titles, descriptions, and metadata as untrusted text.
- Never execute scripts or render provider HTML directly.

## API
- Validate query parameters and cap pagination.
- Use parameterized database statements.
- Return generic errors to clients.
- Never log authorization headers, tokens, or secret-bearing URLs.

## Access
The planned deployment is private. Protect static dashboard routes and API routes with Cloudflare Access or an equivalent tested access layer. A public repository does not imply a public dashboard.

## Dependency and CI hygiene
- Keep dependencies minimal and commit the package lockfile.
- Review dependency changes and security advisories.
- Use minimal GitHub Actions permissions.
- Pin third-party Actions to reviewed full commit SHAs before production.
- Do not configure production deployment credentials until deployment is explicitly approved.

## Incident handling
Disable the affected integration, preserve non-secret logs, rotate exposed credentials, and fix the issue before re-enabling it.
