# AFTERDAY — Black Map UI image resource kit v101

This pack contains nine freshly generated transparent PNG source resources and nine optimized production WebP files (all local, no external CDN). They are placed in `public/assets/exploration/ui-v101/`.

| Asset | Purpose |
| --- | --- |
| `modal_shell.webp` | Entire exploration overlay chassis |
| `title_header.webp` | Title/header banner |
| `status_rail.webp` | Chapter, daily operations, travel/read-only cards |
| `map_panel.webp` | Map scene + legend surrounding frame |
| `site_card.webp` | Location detail/photo split frame |
| `primary_button.webp` | Active, clickable expedition CTA |
| `secondary_tab.webp` | Passive/secondary control, inactive tabs |
| `active_tab.webp` | Currently selected near/far region tab |
| `close_button.webp` | Close button art including its icon |

Production CSS: `src/blackMapResourceSkinV101.css` appended **after** V100 (preserves previous game scripts and event handlers). Each panel image is applied using a 9-slice `border-image` to retain the metal corners and limit distortion. The close-button image is a standalone background asset.

The style intentionally reduces extra nested borders: one shell, a header, readable function panels, a map surround, one site detail card, and tactile buttons. It does not adjust coordinates of pins, fog stage, progression, RNG, health/supplies, current saves, or the main game's HUD.

**Validation:** `node --test tests/black-map-resource-skin-v101.test.mjs` plus existing suite. Browser visual mock files are included only in the downloadable pack as a design preview, not inside the production bundle.