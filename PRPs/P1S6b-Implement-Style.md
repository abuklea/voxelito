name: "P1S6b - Implement Retro-Pixel Art UI"
description: |
  Implement the retro-pixel art UI style as defined in the updated STYLE document.

## Goal
To update the application's UI to match the retro-pixel art style defined in `docs/03_STYLE.md`. This will involve updating CSS files and component styles to create a fun, quirky, and visually consistent user experience.

## Why
- To bring the application's visual identity in line with the newly defined style guide.
- To create a more engaging and memorable user experience.
- To ensure a consistent design system is applied across all UI elements.

## What
- Update the global CSS to include the new font, colors, and base styles.
- Update the styles of the main application components to match the retro-pixel art aesthetic.
- Ensure that the UI is visually consistent with the inspirational screenshots and the style guide.

### Success Criteria
- [ ] The application's UI reflects the retro-pixel art style defined in `docs/03_STYLE.md`.
- [ ] The UI is visually consistent with the provided inspirational screenshots.
- [ ] The implementation uses modern and performant CSS techniques.

## All Needed Context

### Documentation & References
```yaml
- file: docs/03_STYLE.md
  why: The style guide to be implemented.
- file: src/index.css
  why: The global CSS file to be updated.
- file: src/App.tsx
  why: The main application component to be styled.
- file: /tmp/file_attachments/Screenshot_20251119_100125_Edge.png
  why: Inspiration for the new retro-pixel art style.
- file: /tmp/file_attachments/Screenshot_20251119_100137_Edge.png
  why: Inspiration for the new retro-pixel art style.
- file: /tmp/file_attachments/Screenshot_20251119_100150_Edge.png
  why: Inspiration for the new retro-pixel art style.
- file: /tmp/file_attachments/Screenshot_20251119_100201_Edge.png
  why: Inspiration for the new retro-pixel art style.
- file: /tmp/file_attachments/Screenshot_20251119_100212_Edge.png
  why: Inspiration for the new retro-pixel art style.
```

### Current Codebase tree
```bash
.
├── PRPs
│   ├── EXAMPLE_multi_agent_prp.md
│   ├── P1S4-Basic-3D-Scene.md
│   ├── P1S5-Chat-UI-Setup.md
│   ├── P1S6-Style-Update.md
│   ├── reports
│   │   ├── P1S1-INITIAL.md
│   │   ├── P1S1-REPORT.md
│   │   ├── P1S2-INITIAL.md
│   │   ├── P1S2-REPORT.md
│   │   ├── P1S3-INITIAL.md
│   │   └── P1S3-REPORT.md
│   └── templates
│       └── prp_base.md
├── README.md
├── api
│   ├── index.py
│   ├── index.ts
│   ├── package-lock.json
│   ├── package.json
│   └── requirements.txt
├── docs
│   ├── 00_BRIEF.md
│   ├── 01_MVP.md
│   ├── 02_STORIES.md
│   ├── 03_STYLE.md
│   ├── 04_UI.md
│   ├── 05_TECH.md
│   └── 06_PLAN.md
├── eslint.config.js
├── index.html
├── memory.md
├── package-lock.json
├── package.json
├── public
│   └── vite.svg
├── src
│   ├── App.tsx
│   ├── features
│   │   └── viewer
│   │       └── Viewer.tsx
│   ├── index.css
│   └── main.tsx
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
├── vercel.json
└── vite.config.ts
```

### Desired Codebase tree with files to be added and responsibility of file
No new files will be added. The following files will be modified:
- `src/index.css`: To add global styles.
- `src/App.tsx`: To update component styles.
- `index.html`: To import the new font.


## Implementation Blueprint

### list of tasks to be completed to fullfill the PRP in the order they should be completed
```yaml
Task 1:
MODIFY index.html:
  - ADD the "Press Start 2P" font from Google Fonts.

Task 2:
MODIFY src/index.css:
  - REPLACE the existing styles with the new global styles defined in the style guide.

Task 3:
MODIFY src/App.tsx:
  - UPDATE the component styles to align with the new retro-pixel art style.
```

## Validation Loop
### Level 1: Syntax & Style
```bash
# Run these FIRST - fix any errors before proceeding
npx eslint src
```

### Level 2: Visual Verification
Since this task is a UI update, the primary validation will be a visual inspection of the application. I will use Playwright to take a screenshot of the updated UI and compare it to the inspirational images.
