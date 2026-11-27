# Interface and website

The creator is built around one task: choose a local project and save its app. Project detection, output format, source ownership and creation status stay in the same view. Open **Themes** in the top-right corner to choose any of ten Frutiger Aero appearances, or Classic with system, light and dark modes. Your selection is saved locally and can change during creation without resetting your project or progress.

The themes are Midnight Tide, Botanical Canopy, Stratosphere, Pearl Current, Citrus Circuit, Cobalt Hydro, Aurora Lake, Sunset Estuary, Glacial Quartz and Meadow OS. Each has its own bundled artwork, palette and glass materials. Midnight Tide and Pearl Current use a side review, Botanical Canopy adds an illustrated margin, Citrus Circuit uses three columns, Aurora Lake uses wide stacked sections and Glacial Quartz separates the two working surfaces. All retain the same controls, reading order and one-click creation behavior. Artwork is bundled; selecting a theme makes no network request. The launch and terminal screens share the saved palette and artwork within the same app profile.

New profiles start in Midnight Tide. Existing Classic preferences are preserved. Theme IDs and color modes are validated before use, and storage failures fall back to a session-only choice. URL parameters such as `?style=meadow_os` and `?theme=light` are non-persistent preview overrides; omit them to restore the saved selection.

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

## Readability and visual direction

The creator uses 16px inputs, 14px field labels and supporting text, and at least 13px utility text. The website uses 17–20px explanatory text, shorter reading columns and a full-width product preview. The preview retains the actual interface's text scale. Light appearance explicitly sets the browser's color scheme so it cannot acquire a dark canvas with light-theme text. The creation action remains visible on wider desktop layouts while the form scrolls.

The reference review used [Raycast](https://www.raycast.com/) for product hierarchy, [Resend](https://resend.com/) for focused developer-facing storytelling, and [a16z](https://a16z.com/) for editorial scale and deliberate whitespace. [Raycast](https://www.ycombinator.com/companies/raycast) and [Resend](https://www.ycombinator.com/companies/resend) are listed by YC. These are visual references; Make App uses its own brand, content and interface, without their brand assets or endorsements.

## Verification

The 20 design checks include 200% zoom on the creator and website, a 13px minimum visible text size, mobile creation/cancellation controls, the download dialog and an explicitly light preview under a dark system appearance.

`npm run test:aero` adds all ten themed renderers at 1487, 1000, 390 and 320 CSS pixels, their chooser states, narrow chooser layouts, an opposing operating-system palette, 200% zoom, saved selection after reload, Classic fallback, invalid preferences, project preservation and creation through every theme. Reports and captures go to `qa/aero/`. Browser samples are explicitly labeled; native app acceptance remains separate.

`npm run test:design` runs native Electron checks with controlled project IPC and public-release fixtures. It covers light/dark creator layouts from 320 to 1000 CSS pixels and website layouts from 320 to 1440 pixels, automated WCAG A/AA rules, horizontal overflow, creation, cancellation, errors, stale inspection responses, preview resizing, coding-tool tabs, FAQs and draft-download handling. Reports and screenshots go to `qa/design/`, which is excluded from source control. Linux headless environments need a display server such as Xvfb.

This complements native desktop acceptance; a fixture is not evidence that an arbitrary project successfully builds. Automated accessibility rules do not replace manual assistive-technology testing. Physical-device acceptance, publisher signing and macOS notarization remain separate release gates.
