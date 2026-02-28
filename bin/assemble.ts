import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// Resolve @phosphor-icons/core from node_modules
// The main export resolves to dist/index.umd.js, so go up two levels to get package root
const coreMainPath = require.resolve("@phosphor-icons/core");
const coreDir = path.resolve(path.dirname(coreMainPath), "..");
const ASSETS_PATH = path.join(coreDir, "assets");

const __dirname = path.dirname(new URL(import.meta.url).pathname);
const COMPONENTS_PATH = path.join(__dirname, "../src/icons");
const INDEX_PATH = path.join(__dirname, "../src/index.ts");

const WEIGHTS = ["thin", "light", "regular", "bold", "fill", "duotone"] as const;

if (!fs.existsSync(ASSETS_PATH)) {
  console.error(
    `FAIL: Could not find @phosphor-icons/core assets at ${ASSETS_PATH}`
  );
  process.exit(1);
}

// --- Step 1: Read all SVG files ---

interface IconMappings {
  [iconName: string]: { [weight: string]: string };
}

function readSvgContent(filePath: string): string {
  return fs
    .readFileSync(filePath, "utf-8")
    .replace(/<svg[^>]*>/g, "")
    .replace(/<\/svg>/g, "")
    .trim();
}

function readAllIcons(): IconMappings {
  const mappings: IconMappings = {};

  for (const weight of WEIGHTS) {
    const weightDir = path.join(ASSETS_PATH, weight);
    if (!fs.existsSync(weightDir)) {
      console.warn(`WARN: Missing weight directory: ${weight}`);
      continue;
    }

    const files = fs.readdirSync(weightDir).filter((f) => f.endsWith(".svg"));

    for (const file of files) {
      let iconName: string;
      if (weight === "regular") {
        iconName = file.replace(".svg", "");
      } else {
        iconName = file.replace(".svg", "").replace(new RegExp(`-${weight}$`), "");
      }

      if (!mappings[iconName]) {
        mappings[iconName] = {};
      }

      mappings[iconName][weight] = readSvgContent(path.join(weightDir, file));
    }
  }

  return mappings;
}

// --- Step 2: Name conversion utilities ---

function pascalize(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Step 3: Generate per-weight Vue SFC ---

function generateComponent(
  iconName: string,
  weight: string,
  svgContent: string
): string {
  const pascalName = pascalize(iconName);
  const weightSuffix = capitalizeFirst(weight);
  const componentName = `Ph${pascalName}${weightSuffix}`;

  return `\
/* GENERATED FILE */
<script lang="ts">
export default {
  name: "${componentName}"
}
</script>

<script lang="ts" setup>
import { computed, inject } from "vue";

const props = defineProps<{
  size?: string | number;
  color?: string;
  mirrored?: boolean;
}>();

const contextSize = inject("size", "1em")
const contextColor = inject("color", "currentColor")
const contextMirrored = inject("mirrored", false)

const displaySize = computed(() => props.size ?? contextSize)
const displayColor = computed(() => props.color ?? contextColor)
const displayMirrored = computed(() =>
  props.mirrored !== undefined
    ? props.mirrored ? "scale(-1, 1)" : undefined
    : contextMirrored ? "scale(-1, 1)" : undefined
)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    :width="displaySize"
    :height="displaySize"
    :fill="displayColor"
    :transform="displayMirrored"
    v-bind="$attrs"
  >
    <slot />${svgContent}
  </svg>
</template>
`;
}

// --- Step 4: Write all components ---

function generateAllComponents(mappings: IconMappings): string[] {
  const componentNames: string[] = [];
  let passes = 0;
  let fails = 0;

  // Clean and recreate output directory
  if (fs.existsSync(COMPONENTS_PATH)) {
    fs.rmSync(COMPONENTS_PATH, { recursive: true });
  }
  fs.mkdirSync(COMPONENTS_PATH, { recursive: true });

  for (const [iconName, weights] of Object.entries(mappings)) {
    for (const [weight, svgContent] of Object.entries(weights)) {
      const pascalName = pascalize(iconName);
      const weightSuffix = capitalizeFirst(weight);
      const componentName = `Ph${pascalName}${weightSuffix}`;

      const content = generateComponent(iconName, weight, svgContent);
      const filePath = path.join(COMPONENTS_PATH, `${componentName}.vue`);

      try {
        fs.writeFileSync(filePath, content, { flag: "w" });
        componentNames.push(componentName);
        passes++;
      } catch (err) {
        console.error(`FAIL: ${componentName}`);
        console.error(err);
        fails++;
      }
    }
  }

  console.log(
    `Generated ${passes} components` +
      (fails > 0 ? ` (${fails} failures)` : "")
  );

  return componentNames.sort();
}

// --- Step 5: Generate index.ts with named exports and aliases ---

async function generateIndex(
  mappings: IconMappings,
  componentNames: string[]
): Promise<void> {
  // Load icon metadata for aliases
  let aliasMap = new Map<string, { name: string; pascal_name: string }>();
  try {
    const coreModule = await import("@phosphor-icons/core");
    const icons = coreModule.icons || coreModule.default?.icons;
    if (icons) {
      for (const icon of icons) {
        if (icon.alias) {
          aliasMap.set(icon.name, icon.alias);
        }
      }
    }
  } catch {
    console.warn("WARN: Could not load icon metadata for aliases");
  }

  const imports: string[] = [];
  const exports: string[] = [];

  const sortedIconNames = Object.keys(mappings).sort();

  for (const iconName of sortedIconNames) {
    const weights = mappings[iconName];
    const pascalName = pascalize(iconName);

    for (const weight of WEIGHTS) {
      if (!weights[weight]) continue;

      const weightSuffix = capitalizeFirst(weight);
      const componentName = `Ph${pascalName}${weightSuffix}`;

      imports.push(
        `import ${componentName} from "./icons/${componentName}.vue";`
      );
      exports.push(componentName);

      // Handle aliases
      const alias = aliasMap.get(iconName);
      if (alias) {
        const aliasComponentName = `Ph${alias.pascal_name}${weightSuffix}`;
        exports.push(`${componentName} as ${aliasComponentName}`);
      }
    }
  }

  const indexContent = `\
/* GENERATED FILE */

${imports.join("\n")}

export {
  ${exports.join(",\n  ")}
};
`;

  // Ensure src directory exists
  const srcDir = path.dirname(INDEX_PATH);
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  fs.writeFileSync(INDEX_PATH, indexContent, { flag: "w" });
  console.log("Index file generated successfully");
}

// --- Main execution ---

console.log("Reading SVG assets from @phosphor-icons/core...");
const mappings = readAllIcons();

console.log("Generating Vue components...");
const componentNames = generateAllComponents(mappings);

console.log("Generating index file...");
await generateIndex(mappings, componentNames);

const totalIcons = Object.keys(mappings).length;
const totalComponents = Object.values(mappings).reduce(
  (sum, w) => sum + Object.keys(w).length,
  0
);
console.log(
  `Done: ${totalIcons} icons x ${WEIGHTS.length} weights = ${totalComponents} components`
);
