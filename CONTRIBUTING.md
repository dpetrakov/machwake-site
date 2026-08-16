# Contributing

This repository is one page. Keeping the scope that small is the point, so the
useful contributions are narrow ones.

## Worth opening an issue for

- Something renders wrong: a browser, a screen size, a zoom level, an
  assistive technology.
- A factual error in the text.
- A broken link, a wrong header, a certificate or domain problem.
- An accessibility failure — contrast, focus order, motion, reading order.

## Not worth opening an issue for

- Redesigns, new sections, or new pages. The page says what it needs to say.
- Adding a framework, a bundler, or a package manager. There is no build step
  and that is a decision, not an oversight.
- Questions about the product itself, its roadmap, or its availability. The
  Machwake repository is not public yet; nothing here can answer those.

## If you send a patch

- No dependencies. If a change needs one, it belongs in a different project.
- Keep `index.html` and `styles.css` readable without tooling — that is what
  makes them auditable by anyone who opens the page source.
- Match the surrounding style. Comments explain *why*, not what.
- Test with JavaScript off, and with `prefers-reduced-motion: reduce` on. Both
  must produce a complete, readable page.
- Do not touch `assets/fonts/`. The files there are licensed subsets and their
  licence texts must ship with them.

By contributing you agree that your contribution is licensed under
[Apache-2.0](./LICENSE), the same as the rest of the source.
