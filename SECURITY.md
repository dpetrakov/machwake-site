# Security

This is a static page. It has no backend, no database, no accounts, no
cookies, no analytics, and no third-party requests at runtime — everything it
loads is served from this repository.

That leaves a small surface, and it is worth reporting:

- domain, DNS, or TLS misconfiguration on `m6e.org`
- anything served from the site that this repository does not contain
- a compromised or unexpected asset in the repository itself
- a supply-chain problem in the GitHub Actions workflow

## Reporting

Use **Report a vulnerability** under this repository's Security tab, which
opens a private advisory. Please do not open a public issue for anything you
believe is exploitable.

There is no bug bounty. Expect a first reply within a week.
