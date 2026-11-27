# Interface and website

The creator is built around one task: choose a local project and save its app. Project detection, output format, source ownership and creation status stay in the same view. The app has system, light and dark appearance modes; the launch and terminal screens share its typography and materials.

The static website includes an interactive version of the actual creator renderer, coding-tool setup guidance, device compatibility, downloads and FAQs. The browser preview uses clearly labeled sample projects. It cannot read folders, create files or launch project code. Electron's native preload takes precedence over the preview adapter.

## Preview and build

```sh
npm ci
npm run preview:site
```

Open the loopback URL printed by the command (port 5175 by default). The preview server only serves the website and interface assets. Choose another port with `npm run preview:site -- --port=5176`.

```sh
npm run build:site
```

Upload the contents of `web-dist/` to a static HTTPS host. The website works under a subdirectory, including a GitHub Pages project path. It needs no application backend or Make App account. The download chooser checks GitHub's public release API only when opened. Draft assets are never exposed as download links; it explains the review state instead. The browser demo is for HTTP/HTTPS hosting, rather than opening the HTML with a file URL.

Fonts and icons are bundled locally with their original licenses and package integrity records. The site does not use analytics, remote fonts, testimonials or generated usage statistics.

## Verification

`npm run test:design` runs native Electron checks with controlled project IPC and public-release fixtures. It covers light/dark creator layouts from 320 to 1000 CSS pixels and website layouts from 320 to 1440 pixels, automated WCAG A/AA rules, horizontal overflow, creation, cancellation, errors, stale inspection responses, preview resizing, coding-tool tabs, FAQs and draft-download handling. Reports and screenshots go to `qa/design/`, which is excluded from source control. Linux headless environments need a display server such as Xvfb.

This complements native desktop acceptance; a fixture is not evidence that an arbitrary project successfully builds. Automated accessibility rules do not replace manual assistive-technology testing. Physical-device acceptance, publisher signing and macOS notarization remain separate release gates.
