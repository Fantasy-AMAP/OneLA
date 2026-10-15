# OneLA project page

Static academic project page for **OneLA: Learning Many Worlds from Latent Actions**.

## Preview

Run `npm run dev`, then open http://127.0.0.1:4173. The server binds to localhost and serves only public page files. Set `PORT` for a different port.

## Build and publish

```bash
npm run check
npm run build
npm test
```

**Publish only the contents of `dist/`.** Each build recreates that directory from the assets referenced by `index.html`, excluding development tools, dependency files, review artifacts, and unused media. Relative URLs support hosting under a subdirectory.

`npm run preview` serves the built files. This project does not automatically deploy.

## Editing

- `index.html`: paper metadata, explanation, results, and media.
- `style.css`: responsive layout.
- `app.js`: accessible tabs, paired-video controls, captions, and citation copy.
- `assets/`: public figures, images, captions, and videos.
- `public-files.mjs`: public-file allowlist shared by the builder and preview server.

Dynamic media switches reuse files declared in the HTML. Add a matching static reference when introducing another media file. Restart the preview server after changing the set of public assets.

Node.js is sufficient for preview and build. Install dev dependencies with `npm ci` for browser verification:

```bash
mkdir -p .cache/runtime
TMPDIR="$PWD/.cache/runtime" node tests/browser.mjs
```

Browser checks use installed Google Chrome, save artifacts under `.cache/qa`, and support `TEST_URL` and `QA_OUTPUT_DIR` overrides. The page respects reduced-motion preferences. Qualitative videos retain original aspect ratios and playback speeds; they are distinct from the quantitative evaluation.

## Research and media scope

Paper: https://arxiv.org/abs/2610.20160. This repository contains the project website, not model training code, weights, or datasets. Generated examples are labeled separately from reference clips. Quantitative results follow the linked paper.

No blanket reuse license is granted for third-party reference clips, game imagery, or soundtrack by this repository. A paper license should not be assumed to cover these separate media assets.
