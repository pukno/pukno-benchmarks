# pukno-benchmarks

Catalog of open-weight models for local use: license, hardware fit, speed, and quality. The public site is [benchmarks.pukno.com](https://benchmarks.pukno.com).

GitHub Pages serves one file, [docs/index.html](docs/index.html). The rest of this repository is the source you edit. Pages does not run the React app.

## Update the catalog

1. Edit [src/data/workbook.ts](src/data/workbook.ts).
   - New model: copy an object in the `"models"` array and change the values. Keep every key. `"Model ID"` must be unique.
   - A published score: add an object to `"quality"`. `"Model ID"` must match a model row. Put the source URL and the date in the row.
   - A speed run: add an object to `"speed"`. One row is one model on one machine, quantization, runtime, and context length. A bare tokens-per-second number is not comparable, so leave this empty until you have that run.
2. Rebuild the page from the repository root:

   ```bash
   node scripts/render-ledger-html.mjs
   ```

   This rewrites `docs/index.html`. It does not need `npm install`. It does not touch `docs/CNAME`.
3. Commit and push:

   ```bash
   git add src/data/workbook.ts docs/index.html
   git commit -m "Add model rows"
   git push
   ```

Pages republishes the `main` branch, folder `/docs`, within a few minutes. Hard-refresh the site. The previous HTML stays cached until you do.

The Import button on the live site writes only to that browser. It does not change the published catalog. Reset throws those rows away.

## What not to change

- Do not delete [docs/CNAME](docs/CNAME). That file is the line `benchmarks.pukno.com` and is what keeps the subdomain attached. GitHub writes it when you set the custom domain.
- Do not delete [docs/.nojekyll](docs/.nojekyll). It stops GitHub from running the page through Jekyll.
- Do not commit `node_modules`.
- Do not switch Pages to the repository root. There is no `index.html` there. Settings stay: branch `main`, folder `/docs`.

## Domain

DNS for `pukno.com`:

| Type | Name | Value |
|---|---|---|
| CNAME | `benchmarks` | `<github-user>.github.io` |

The value is the account that owns this repo, not `github.io/pukno-benchmarks`. In the repository: **Settings → Pages → Custom domain** is `benchmarks.pukno.com`. Turn on **Enforce HTTPS** only after the DNS check is green.

## Layout

| Path | Role |
|---|---|
| `src/data/workbook.ts` | The catalog. This is the file you edit. |
| `scripts/render-ledger-html.mjs` | Copies that catalog into the static page. |
| `docs/index.html` | The site GitHub Pages publishes. |
| `src/` | The same catalog as a React app, used for local preview only. |

Starter rows are a snapshot of public model cards and secondary score summaries. They are not measurements and not legal advice. Confirm the checkpoint name, file size, and `LICENSE` file before relying on a row. Do not compare an LLM score with a speech, image, or embedding score.
