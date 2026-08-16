# Machwake Site

The public page for Machwake — **https://m6e.org**

Machwake is an open collaboration layer for accountable human-agent
engineering teams: humans and coding agents as first-class participants,
without giving up ownership, provenance, or native agent capabilities.

> **Machine speed. Human accountability.**

```
No agent without a principal.
No run without a pactum.
No change without a wake.
```

## What this repository is

One page and the assets it needs. That is the whole scope.

## What it is not

- **Not the product.** The Machwake repository is under active development and
  not yet public. Nothing here implements pactums, wakes, or agent execution.
- **Not a template.** The layout, the mark, and the type are specific to this
  brand and are not intended to be reused.
- **Not a promise of dates.** The page states what the project is. It does not
  announce a release, and this repository does not track one.

## Why m6e

`m` + six omitted characters + `e` — the shape of `i18n`, `l10n`, `k8s`, but
for Machwake. `m6e` is the domain and will be the CLI. The brand is always
spelled **Machwake**; the short form never replaces it in prose.

## Running it

There is nothing to build.

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

Opening `index.html` directly works too. One HTML file, one stylesheet, one
script, self-hosted fonts, the mark as SVG. No framework, no bundler, no
package manager — the right tool for the size of the job is part of what the
page is saying.

## Layout

```
index.html            the page
styles.css            the whole visual system
404.html              same system, one line of text
assets/
  tunnel.js           the test section: the lattice, and what moves on it
  machwake-mark.svg   the mark
  og.png              social card
  icons/              favicon set and web manifest
  fonts/              latin subsets, with their licences
CNAME                 m6e.org
```

`assets/tunnel.js` draws the lattice that the stylesheet otherwise paints as
repeating gradients, and switches those off when it loads. That is deliberate;
the reason is at the top of the file. It does nothing at all when the visitor
has asked for reduced motion.

## Deployment

Pushing to `main` publishes to GitHub Pages through
[`.github/workflows/pages.yml`](.github/workflows/pages.yml). The custom domain
is set in repository settings; `CNAME` keeps it attached to the artifact.

## Browser support

Evergreen Chrome, Firefox, Safari and their mobile equivalents. The page
degrades honestly: without JavaScript the lattice still renders from CSS and
every word remains readable.

## Licence

Source is [Apache-2.0](./LICENSE).

The bundled typefaces are **not** covered by it — they are under the SIL Open
Font License 1.1, and the name Machwake and the Machwake mark are trademarks
that no licence here grants rights to. See [NOTICE](./NOTICE) for both, and
[`assets/fonts/README.md`](assets/fonts/README.md) for what was subset and from
where.
