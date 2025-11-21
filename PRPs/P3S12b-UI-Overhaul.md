# P3S12b - UI/UX Overhaul & Voxelito Branding

## 1. Goal
Transform the application's visual identity into "Voxelito" with a cohesive dark theme, retro-futuristic styling (purples, blues, neon accents), and improved responsiveness. Enhance the 3D scene with a visual anchor (grid/floor) to make it look like a diorama editor.

## 2. Scope
-   **Global Styling (`src/index.css`):** Refine the color palette (deep purples, neon blues), update typography handling, and ensure a consistent "cyber/voxel" aesthetic.
-   **Layout (`src/App.tsx`):** Add a responsive header with the "Voxelito" logo/title. Ensure the canvas takes up the remaining space correctly on all devices.
-   **3D Scene (`src/lib/VoxelWorld.ts`):** Add a visual floor/grid helper to ground the scene.
-   **Chat UI (`src/index.css`):** Deeply customize the `CopilotPopup` styles to match the Voxelito theme, overriding default rounded corners and light colors.

## 3. Implementation Steps

### 3.1. Global Styling Update
-   **File:** `src/index.css`
-   **Action:**
    -   Define CSS variables for the theme:
        -   `--bg-primary`: `#0f0f16` (Very dark blue/black)
        -   `--bg-secondary`: `#1a1a24` (Panel background)
        -   --accent-primary`: `#7c3aed` (Vibrant Purple)
        -   `--accent-secondary`: `#00f3ff` (Cyan/Neon Blue)
        -   `--text-primary`: `#ffffff`
        -   `--text-secondary`: `#9ca3af`
    -   Update `button` styles to be blocky (no border-radius) with neon hover effects.
    -   Ensure fonts are consistent.

### 3.2. Layout & Branding
-   **File:** `src/App.tsx`
-   **Action:**
    -   Add a `<header>` component (or inline) with the title "VOXELITO".
    -   Use Flexbox/Grid to ensure the header stays at the top and the canvas fills the rest.
    -   Ensure the chat popup doesn't overlap critical UI elements (though it's a popup, so it's fine, but maybe position it better).

### 3.3. 3D Scene Enhancements
-   **File:** `src/lib/VoxelWorld.ts`
-   **Action:**
    -   Add a `GridHelper` or a custom mesh to act as the "floor".
    -   Set a nice background color for the scene (e.g., dark fog).

### 3.4. CopilotKit Theming
-   **File:** `src/index.css`
-   **Action:**
    -   Target `.copilotKit*` classes.
    -   Remove border-radius to match the voxel theme.
    -   Set backgrounds to dark theme colors.
    -   Style the input field and send button.

## 4. Verification
-   **Visual Check:** Ensure the app looks like a cohesive product ("Voxelito").
-   **Responsiveness:** Check that the header and canvas resize correctly on smaller screens.
-   **Functionality:** Ensure the chat button is still clickable and the popup opens.

## 5. Risk Assessment
-   **CSS Specificity:** Overriding CopilotKit styles might require `!important` or high specificity.
-   **Layout Shifts:** Adding a header might shift the canvas; need to ensure `height: 100%` logic is updated (e.g., `calc(100vh - 60px)`).
