import fs from "node:fs";
import path from "node:path";

export function parseExportNames(jsContent: string): string[] {
  const exportMatch = jsContent.match(/export\s*\{([^}]+)\}/s);
  if (!exportMatch) {
    return [];
  }

  return exportMatch[1]
    .split(",")
    .map((e) => {
      const trimmed = e.trim();
      if (trimmed.includes(" as ")) {
        return trimmed.split(" as ")[1].trim();
      }
      return trimmed;
    })
    .filter((e) => e.length > 0);
}

export function buildTypeDefinitions(exportNames: string[]): string {
  return `\
/* GENERATED FILE */
import { DefineComponent } from "vue";

type PhosphorIconComponent = DefineComponent<{
  size?: string | number;
  color?: string;
  mirrored?: boolean;
}>;

${exportNames.map((name) => `export declare const ${name}: PhosphorIconComponent;`).join("\n")}
`;
}

// --- Main execution ---

const isMain =
  process.argv[1] && path.resolve(process.argv[1]).includes("generate-types");

if (isMain) {
  const __dirname = path.dirname(new URL(import.meta.url).pathname);
  const DIST_PATH = path.join(__dirname, "../dist");
  const INDEX_MJS = path.join(DIST_PATH, "index.mjs");

  if (!fs.existsSync(INDEX_MJS)) {
    console.error("FAIL: dist/index.mjs not found. Run vite build first.");
    process.exit(1);
  }

  const indexContent = fs.readFileSync(INDEX_MJS, "utf-8");
  const exportNames = parseExportNames(indexContent);

  if (exportNames.length === 0) {
    console.error("FAIL: Could not parse exports from dist/index.mjs");
    process.exit(1);
  }

  const dtsContent = buildTypeDefinitions(exportNames);

  fs.writeFileSync(path.join(DIST_PATH, "index.d.ts"), dtsContent, {
    flag: "w",
  });
  console.log(`Type definitions generated for ${exportNames.length} exports`);
}
