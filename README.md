# @deathmaz/phosphor-icons-vue-split

Phosphor Icons for Vue 3 with **per-weight components** for optimal tree-shaking.

The original [`@phosphor-icons/vue`](https://github.com/phosphor-icons/vue) bundles all 6 weights inside each icon component. Even if you only use the "regular" weight, the SVG data for all other weights is included in your bundle. This library splits each weight into its own component, so you only pay for what you use.

## Installation

```bash
npm install @deathmaz/phosphor-icons-vue-split
```

Requires Vue 3.2.39 or later as a peer dependency.

## Usage

```vue
<script lang="ts" setup>
import {
  PhHorseRegular,
  PhHeartFill,
  PhCubeDuotone,
} from "@deathmaz/phosphor-icons-vue-split";
</script>

<template>
  <PhHorseRegular />
  <PhHeartFill :size="32" color="hotpink" />
  <PhCubeDuotone :size="48" color="#333" />
</template>
```

Components follow the naming pattern `Ph[IconName][Weight]`, where weight is one of:

| Weight     | Example             |
| ---------- | ------------------- |
| `Thin`     | `PhHeartThin`       |
| `Light`    | `PhHeartLight`      |
| `Regular`  | `PhHeartRegular`    |
| `Bold`     | `PhHeartBold`       |
| `Fill`     | `PhHeartFill`       |
| `Duotone`  | `PhHeartDuotone`    |

All Phosphor icons are available across all 6 weights.

## Props

All props are optional.

| Prop       | Type               | Default          | Description                           |
| ---------- | ------------------ | ---------------- | ------------------------------------- |
| `size`     | `string \| number` | `"1em"`          | Width and height of the SVG           |
| `color`    | `string`           | `"currentColor"` | Fill color of the SVG                 |
| `mirrored` | `boolean`          | —                | Horizontally flip the icon (for RTL)  |

```vue
<PhArrowRightBold :size="24" color="red" :mirrored="true" />
```

## Context provider

Use Vue's `provide` to set defaults for all icons in a subtree, avoiding repetitive props:

```vue
<script lang="ts" setup>
import { provide } from "vue";
import { PhHouseRegular, PhGearRegular } from "@deathmaz/phosphor-icons-vue-split";

provide("size", "24px");
provide("color", "#1a1a1a");
provide("mirrored", false);
</script>

<template>
  <!-- Both icons inherit size="24px" and color="#1a1a1a" -->
  <PhHouseRegular />
  <PhGearRegular />
</template>
```

Props on individual components override the injected context values.

## Slots

Components accept a default slot for injecting arbitrary SVG elements (e.g., `<title>` for accessibility, `<animate>`, `<filter>`):

```vue
<PhHeartFill :size="32" color="red">
  <title>Favorite</title>
</PhHeartFill>
```

## Attrs passthrough

Any additional attributes are forwarded to the root `<svg>` element via `v-bind="$attrs"`:

```vue
<PhStarFill class="icon" data-testid="star" />
```

## Bundle size

Each component contains only its weight's SVG path data. A typical component compiles to ~0.8 KB (gzipped), compared to ~4.4 KB per icon in the original library that bundles all weights.

The library uses `sideEffects: false` and Vite's `preserveModules` output, so bundlers can tree-shake unused components at the module level.

## Development

### Prerequisites

- Node.js >= 18
- npm

### Setup

```bash
npm install
```

### Scripts

| Script              | Description                                   |
| ------------------- | --------------------------------------------- |
| `npm run build`     | Full pipeline: generate components + Vite build + type definitions |
| `npm run assemble`  | Generate Vue SFCs from `@phosphor-icons/core` SVGs |
| `npm run test`      | Run tests with Vitest                         |
| `npm run test:watch`| Run tests in watch mode                       |
| `npm run lint`      | Lint with oxlint                              |
| `npm run typecheck` | Type-check with TypeScript                    |
| `npm run check`     | Run typecheck + lint + test                   |

### How it works

1. **`npm run assemble`** reads SVG files from `@phosphor-icons/core` (installed as a dev dependency) and generates one Vue SFC per icon per weight into `src/icons/`. It also generates `src/index.ts` with named exports for all components, including alias re-exports from the Phosphor icon metadata.

2. **`npm run build`** runs the assemble step, then builds the library with Vite in library mode (`preserveModules: true` so each component is a separate `.mjs` file), and finally generates TypeScript type definitions.

Generated files (`src/icons/`, `src/index.ts`, `dist/`) are gitignored — they are produced fresh from `@phosphor-icons/core` on each build.

## License

MIT — Icon designs by [Phosphor Icons](https://phosphoricons.com).
