# Voxelito

A Three.js + TypeScript project for creating voxel-based 3D graphics.

![Voxelito Demo](https://github.com/user-attachments/assets/1c3228bc-dca2-446e-9210-6e5fb46ffde9)

## Features

- ✨ Three.js for 3D rendering
- 🎯 TypeScript for type safety
- ⚡ Vite for fast development and building
- 🎨 Basic voxel scene with lighting and animation

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/abuklea/voxelito.git
cd voxelito
```

2. Install dependencies:
```bash
npm install
```

## Development

Start the development server with hot reload:
```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

## Build

Create a production build:
```bash
npm run build
```

The built files will be in the `dist/` directory.

## Preview Production Build

Preview the production build locally:
```bash
npm run preview
```

## Project Structure

```
voxelito/
├── src/
│   └── main.ts          # Main application entry point
├── public/              # Static assets
├── index.html           # HTML entry point
├── tsconfig.json        # TypeScript configuration
├── package.json         # Project dependencies and scripts
└── README.md           # This file
```

## Technologies Used

- [Three.js](https://threejs.org/) - 3D graphics library
- [TypeScript](https://www.typescriptlang.org/) - Typed JavaScript
- [Vite](https://vitejs.dev/) - Next generation frontend tooling

## License

ISC