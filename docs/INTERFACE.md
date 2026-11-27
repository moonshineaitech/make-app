# Interface and website

The creator is built around one task: choose a local project and save its app. Project detection, output format, source ownership and creation status stay in the same view. In a photographic theme, click the **Make App** wordmark or press **Alt+T** to open Themes. Classic has a labeled Themes button. Choose any of twenty Frutiger Aero appearances, or Classic with system, light and dark modes. Your selection is saved locally and can change during creation without resetting your project or progress.

The original themes are Midnight Tide, Botanical Canopy, Stratosphere, Pearl Current, Citrus Circuit, Cobalt Hydro, Aurora Lake, Sunset Estuary, Glacial Quartz and Meadow OS. Each has its own bundled artwork, palette and glass materials. Midnight Tide and Pearl Current use a side review, Botanical Canopy uses a broad illustrated sidebar, Citrus Circuit uses three columns, Aurora Lake uses wide stacked sections and Glacial Quartz separates the two working surfaces. All retain the same controls, reading order and one-click creation behavior. The desktop creator uses the original concept artwork and cropped blank control materials at measured 1487 × 1058 coordinates. All lettering, values, selected states and actions are live HTML. The native window uses working illustrated caption buttons and a draggable titlebar. Click the detected project to open its requirements and entry-point controls. Artwork is bundled; selecting a theme makes no network request. The launch and terminal screens share the saved palette and artwork within the same app profile.

New profiles start in Midnight Tide. Existing Classic preferences are preserved. Theme IDs and color modes are validated before use, and storage failures fall back to a session-only choice. URL parameters such as `?style=meadow_os` and `?theme=light` are non-persistent preview overrides; omit them to restore the saved selection.

The static website includes an interactive version of the actual creator renderer, coding-tool setup guidance, device compatibility, downloads and FAQs. The browser preview uses clearly labeled sample projects. It cannot read folders, create files or launch project code. Electron's native preload takes precedence over the preview adapter.

## Views and the second collection

**Views** (Alt+G) opens overview, projects, project details, output formats, first launch, build activity, recent apps, coding tools, appearance, preferences, help and about. Project search, local pins, build status and cancellation, recent output paths, integration instructions and theme selection share the existing creator state. Recent outputs store paths and names locally; clearing that list does not delete files. Browser sample results are never added to the saved output history.

Ten additional appearances use original photorealistic generated art and new responsive compositions: Sapphire Reef, Sakura Glass, Solar Atelier, Jade Observatory, Lunar Archive, Rainforest Lab, Lavender Signal, Pacific Terminal, Champagne Orbit and Arctic Iris. Both collections retain native text, fields and actions. Theme search, a random theme button, compact spacing and reduced motion are available. Keyboard focus and Escape use native dialog behavior.

## Complete original interfaces

The **Original designs** shortcut opens the ten original designs directly. The chooser separates **Original collection**, **Studio collection** and **All 20**. Selecting an original carries its original glass, source illustrations and window materials through all twelve utility screens. The measured creator composition is retained. The original families keep distinct navigation and pane structures: side navigation for Botanical Canopy and Meadow OS; glass review panes for Midnight Tide, Pearl Current and Cobalt Hydro; wide navigation for Stratosphere and Aurora Lake; three-column Citrus Circuit; warm Sunset Estuary; and separated Glacial Quartz panes.

The original shells include a live project receipt where the composition has room for it, a return-to-creator action, theme switching and native window controls. At narrow widths, navigation becomes horizontally scrollable and content stacks. Non-persistent URLs such as `?style=botanical_canopy&view=projects` open a particular complete original screen for review.

`npm run test:originals` is a bounded check of all 120 utility screens at desktop and mobile widths (240 view states), the ten original creators, collection filtering, creation and ten overview accessibility scans. It does not replace native engine or physical-device acceptance.

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

Photographic desktop text follows the selected render, with large headlines, measured label bounds and original control sizes. The 1487 × 1058 composition scales together from 860 CSS pixels wide; smaller windows and forced-color mode use the responsive form. That form uses 16px inputs, 14px field labels and supporting text, and at least 13px utility text. The website uses 17–20px explanatory text, shorter reading columns and a full-width product preview. The preview retains the actual interface's text scale. Light appearance explicitly sets the browser's color scheme so it cannot acquire a dark canvas with light-theme text. The creation action remains visible on wider desktop layouts while the form scrolls.

The reference review used [Raycast](https://www.raycast.com/) for product hierarchy, [Resend](https://resend.com/) for focused developer-facing storytelling, and [a16z](https://a16z.com/) for editorial scale and deliberate whitespace. [Raycast](https://www.ycombinator.com/companies/raycast) and [Resend](https://www.ycombinator.com/companies/resend) are listed by YC. These are visual references; Make App uses its own brand, content and interface, without their brand assets or endorsements.

## Verification

`npm run test:views` is a bounded 90-second smoke for all twenty designs and twelve utility views. The 0.12 local run completed in seconds with 54 layout checks, 22 automated WCAG A/AA scans, creation/cancellation and project search passing. This iteration uses focused renderer checks; it does not repeat the previous release matrix or claim new physical-device acceptance.


The 21 design checks include 200% zoom on the creator and website, a 13px minimum visible text size, mobile creation/cancellation controls, the download dialog and an explicitly light preview under a dark system appearance.

`npm run test:aero` covers the original ten themed renderers at 1487, 1000, 390 and 320 CSS pixels, their chooser states, narrow chooser layouts, an opposing operating-system palette, 200% zoom, saved selection after reload, Classic fallback, invalid preferences, project preservation and creation through every theme. Reports and captures go to `qa/aero/`. Browser samples are explicitly labeled; native app acceptance remains separate.

`npm run test:design` runs native Electron checks with controlled project IPC and public-release fixtures. It covers light/dark creator layouts from 320 to 1000 CSS pixels and website layouts from 320 to 1440 pixels, automated WCAG A/AA rules, horizontal overflow, creation, cancellation, errors, stale inspection responses, preview resizing, coding-tool tabs, FAQs and draft-download handling. Reports and screenshots go to `qa/design/`, which is excluded from source control. Linux headless environments need a display server such as Xvfb.

This complements native desktop acceptance; a fixture is not evidence that an arbitrary project successfully builds. Automated accessibility rules do not replace manual assistive-technology testing. Physical-device acceptance, publisher signing and macOS notarization remain separate release gates.
