import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

export const WEIGHTS = [
  "thin",
  "light",
  "regular",
  "bold",
  "fill",
  "duotone",
] as const;

export interface IconMappings {
  [iconName: string]: { [weight: string]: string };
}

// --- Pure functions ---

export function pascalize(str: string): string {
  return str
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function stripSvgWrapper(svg: string): string {
  return svg
    .replace(/<svg[^>]*>/g, "")
    .replace(/<\/svg>/g, "")
    .trim();
}

export function generateComponent(
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
import { computed, inject, type PropType } from "vue";

const props = defineProps({
  size: { type: [String, Number] as PropType<string | number> },
  color: { type: String },
  mirrored: { type: Boolean, default: undefined },
})

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

// --- I/O functions ---

export function readAllIcons(assetsPath: string): IconMappings {
  const mappings: IconMappings = {};

  for (const weight of WEIGHTS) {
    const weightDir = path.join(assetsPath, weight);
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
        iconName = file
          .replace(".svg", "")
          .replace(new RegExp(`-${weight}$`), "");
      }

      if (!mappings[iconName]) {
        mappings[iconName] = {};
      }

      const raw = fs.readFileSync(path.join(weightDir, file), "utf-8");
      mappings[iconName][weight] = stripSvgWrapper(raw);
    }
  }

  return mappings;
}

export function generateAllComponents(
  mappings: IconMappings,
  componentsPath: string
): string[] {
  const componentNames: string[] = [];
  let passes = 0;
  let fails = 0;

  if (fs.existsSync(componentsPath)) {
    fs.rmSync(componentsPath, { recursive: true });
  }
  fs.mkdirSync(componentsPath, { recursive: true });

  for (const [iconName, weights] of Object.entries(mappings)) {
    for (const [weight, svgContent] of Object.entries(weights)) {
      const pascalName = pascalize(iconName);
      const weightSuffix = capitalizeFirst(weight);
      const componentName = `Ph${pascalName}${weightSuffix}`;

      const content = generateComponent(iconName, weight, svgContent);
      const filePath = path.join(componentsPath, `${componentName}.vue`);

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

export function buildIndexContent(
  mappings: IconMappings,
  aliasMap: Map<string, { name: string; pascal_name: string }>
): string {
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

      const alias = aliasMap.get(iconName);
      if (alias) {
        const aliasComponentName = `Ph${alias.pascal_name}${weightSuffix}`;
        exports.push(`${componentName} as ${aliasComponentName}`);
      }
    }
  }

  return `\
/* GENERATED FILE */

${imports.join("\n")}

export {
  ${exports.join(",\n  ")}
};
`;
}

export async function loadAliasMap(): Promise<
  Map<string, { name: string; pascal_name: string }>
> {
  const aliasMap = new Map<string, { name: string; pascal_name: string }>();
  try {
    const coreModule = await import("@phosphor-icons/core");
    const icons = coreModule.icons || coreModule.default?.icons;
    if (icons) {
      for (const icon of icons) {
        if ("alias" in icon && icon.alias) {
          aliasMap.set(icon.name, icon.alias);
        }
      }
    }
  } catch {
    console.warn("WARN: Could not load icon metadata for aliases");
  }
  return aliasMap;
}

export async function generateIndex(
  mappings: IconMappings,
  indexPath: string
): Promise<void> {
  const aliasMap = await loadAliasMap();
  const indexContent = buildIndexContent(mappings, aliasMap);

  const srcDir = path.dirname(indexPath);
  if (!fs.existsSync(srcDir)) {
    fs.mkdirSync(srcDir, { recursive: true });
  }

  fs.writeFileSync(indexPath, indexContent, { flag: "w" });
  console.log("Index file generated successfully");
}

// --- Main execution ---

const isMain =
  process.argv[1] && path.resolve(process.argv[1]).includes("assemble");

if (isMain) {
  const require = createRequire(import.meta.url);
  const coreMainPath = require.resolve("@phosphor-icons/core");
  const coreDir = path.resolve(path.dirname(coreMainPath), "..");
  const assetsPath = path.join(coreDir, "assets");

  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const componentsPath = path.join(__dirname, "../src/icons");
  const indexPath = path.join(__dirname, "../src/index.ts");

  if (!fs.existsSync(assetsPath)) {
    console.error(
      `FAIL: Could not find @phosphor-icons/core assets at ${assetsPath}`
    );
    process.exit(1);
  }

  console.log("Reading SVG assets from @phosphor-icons/core...");
  const mappings = readAllIcons(assetsPath);

  console.log("Generating Vue components...");
  generateAllComponents(mappings, componentsPath);

  console.log("Generating index file...");
  await generateIndex(mappings, indexPath);

  const totalIcons = Object.keys(mappings).length;
  const totalComponents = Object.values(mappings).reduce(
    (sum, w) => sum + Object.keys(w).length,
    0
  );
  console.log(
    `Done: ${totalIcons} icons x ${WEIGHTS.length} weights = ${totalComponents} components`
  );
}
