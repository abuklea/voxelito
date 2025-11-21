# P3S13 - Neon Logo & Flicker Effects

## 1. Goal
Replace the static "VOXELITO" header text with a high-quality, animated "Voxelito" neon logo. The logo should mimic realistic neon tubes (bulb style) with randomized flickering and "off" states.

## 2. Scope
-   **Font:** Import a suitable neon-style font (e.g., "Tilt Neon" or "Beon"-like) via Google Fonts.
-   **Component:** Create `src/components/NeonLogo.tsx` to encapsulate the SVG/CSS logic.
-   **Animation:** Implement "realistic" flickering using CSS `@keyframes`.
-   **Integration:** Update `src/App.tsx` to display the new logo.

## 3. Implementation Details

### 3.1. Font Selection
-   We will add `Tilt Neon` from Google Fonts to `index.html`. It balances readability with the "tube" aesthetic.

### 3.2. CSS Animations (`src/index.css` or styled-component)
-   **Keyframes:**
    -   `neon-flicker`: Rapid changes in `opacity` and `text-shadow`.
    -   `neon-glitch`: Occasional complete blackout of specific letters (e.g., the "i" or "o").
    -   `tube-off`: Style for unlit segments.

### 3.3. SVG Approach
-   Using SVG `text` elements allows for granular control over stroke (tube glass) and fill (gas).
-   We can apply multiple `drop-shadow` filters to simulate the glow spreading on the wall behind.

## 4. Verification
-   Visual inspection via Playwright screenshot.
-   Ensure transparency works (the grid floor should be visible behind the glow).

## 5. Note on "Nano Banana Model"
-   As no image generation tool is available in this environment, this "generated image" will be a procedurally generated SVG component. This ensures infinite scalability, editability (tinting), and performance, satisfying the "high quality" requirement better than a raster image.
