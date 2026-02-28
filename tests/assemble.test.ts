import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  buildIndexContent,
  capitalizeFirst,
  generateAllComponents,
  generateComponent,
  type IconMappings,
  pascalize,
  readAllIcons,
  stripSvgWrapper,
  WEIGHTS,
} from "../bin/assemble.js";

describe("pascalize", () => {
  it("converts single word", () => {
    expect(pascalize("heart")).toBe("Heart");
  });

  it("converts kebab-case", () => {
    expect(pascalize("arrow-down")).toBe("ArrowDown");
  });

  it("converts multi-segment kebab-case", () => {
    expect(pascalize("arrow-bend-down-left")).toBe("ArrowBendDownLeft");
  });

  it("handles single character segments", () => {
    expect(pascalize("x")).toBe("X");
  });

  it("preserves already capitalized segments", () => {
    expect(pascalize("Heart")).toBe("Heart");
  });
});

describe("capitalizeFirst", () => {
  it("capitalizes lowercase", () => {
    expect(capitalizeFirst("regular")).toBe("Regular");
  });

  it("preserves already capitalized", () => {
    expect(capitalizeFirst("Bold")).toBe("Bold");
  });

  it("handles single character", () => {
    expect(capitalizeFirst("a")).toBe("A");
  });
});

describe("stripSvgWrapper", () => {
  it("strips svg tags and keeps inner content", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M100,50"/></svg>';
    expect(stripSvgWrapper(svg)).toBe('<path d="M100,50"/>');
  });

  it("handles duotone with opacity paths", () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M200,100" opacity="0.2"/><path d="M100,50"/></svg>';
    expect(stripSvgWrapper(svg)).toBe(
      '<path d="M200,100" opacity="0.2"/><path d="M100,50"/>'
    );
  });

  it("trims whitespace", () => {
    const svg = '<svg viewBox="0 0 256 256">  <path d="M1,2"/>  </svg>';
    expect(stripSvgWrapper(svg)).toBe('<path d="M1,2"/>');
  });

  it("handles multiple path elements", () => {
    const svg =
      '<svg viewBox="0 0 256 256"><path d="M1,2"/><path d="M3,4"/></svg>';
    expect(stripSvgWrapper(svg)).toBe('<path d="M1,2"/><path d="M3,4"/>');
  });
});

describe("generateComponent", () => {
  const svgContent = '<path d="M100,50"/>';

  it("generates a valid Vue SFC", () => {
    const result = generateComponent("heart", "regular", svgContent);
    expect(result).toContain('<script lang="ts">');
    expect(result).toContain('<script lang="ts" setup>');
    expect(result).toContain("<template>");
  });

  it("includes the correct component name", () => {
    const result = generateComponent("heart", "regular", svgContent);
    expect(result).toContain('name: "PhHeartRegular"');
  });

  it("includes proper naming for multi-segment icon names", () => {
    const result = generateComponent("arrow-down-left", "bold", svgContent);
    expect(result).toContain('name: "PhArrowDownLeftBold"');
  });

  it("includes defineProps with correct types", () => {
    const result = generateComponent("heart", "fill", svgContent);
    expect(result).toContain("PropType<string | number>");
    expect(result).toContain("type: String");
    expect(result).toContain("type: Boolean, default: undefined");
  });

  it("includes inject calls for context", () => {
    const result = generateComponent("heart", "thin", svgContent);
    expect(result).toContain('inject("size", "1em")');
    expect(result).toContain('inject("color", "currentColor")');
    expect(result).toContain('inject("mirrored", false)');
  });

  it("includes the SVG content in the template", () => {
    const result = generateComponent("heart", "regular", svgContent);
    expect(result).toContain(`<slot />${svgContent}`);
  });

  it("includes correct SVG attributes", () => {
    const result = generateComponent("heart", "regular", svgContent);
    expect(result).toContain('viewBox="0 0 256 256"');
    expect(result).toContain(":width=\"displaySize\"");
    expect(result).toContain(":fill=\"displayColor\"");
    expect(result).toContain("v-bind=\"$attrs\"");
  });
});

describe("readAllIcons", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "phosphor-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  function writeSvg(weight: string, filename: string, pathData: string) {
    const dir = path.join(tmpDir, weight);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, filename),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="${pathData}"/></svg>`
    );
  }

  it("reads regular weight icons", () => {
    writeSvg("regular", "heart.svg", "M100,50");
    const mappings = readAllIcons(tmpDir);
    expect(mappings["heart"]).toBeDefined();
    expect(mappings["heart"]["regular"]).toBe('<path d="M100,50"/>');
  });

  it("reads non-regular weight icons and strips weight suffix", () => {
    writeSvg("bold", "heart-bold.svg", "M200,60");
    const mappings = readAllIcons(tmpDir);
    expect(mappings["heart"]).toBeDefined();
    expect(mappings["heart"]["bold"]).toBe('<path d="M200,60"/>');
  });

  it("reads multi-segment icon names correctly", () => {
    writeSvg("fill", "arrow-down-left-fill.svg", "M50,50");
    const mappings = readAllIcons(tmpDir);
    expect(mappings["arrow-down-left"]).toBeDefined();
    expect(mappings["arrow-down-left"]["fill"]).toBe('<path d="M50,50"/>');
  });

  it("groups all weights for the same icon", () => {
    writeSvg("regular", "star.svg", "M1,1");
    writeSvg("bold", "star-bold.svg", "M2,2");
    writeSvg("fill", "star-fill.svg", "M3,3");

    const mappings = readAllIcons(tmpDir);
    expect(Object.keys(mappings["star"])).toHaveLength(3);
    expect(mappings["star"]["regular"]).toBe('<path d="M1,1"/>');
    expect(mappings["star"]["bold"]).toBe('<path d="M2,2"/>');
    expect(mappings["star"]["fill"]).toBe('<path d="M3,3"/>');
  });

  it("skips missing weight directories without error", () => {
    writeSvg("regular", "heart.svg", "M1,1");
    // Only "regular" dir exists, other 5 weights are missing
    const mappings = readAllIcons(tmpDir);
    expect(mappings["heart"]).toBeDefined();
    expect(Object.keys(mappings["heart"])).toHaveLength(1);
  });

  it("ignores non-svg files", () => {
    const dir = path.join(tmpDir, "regular");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "readme.txt"), "not an svg");
    writeSvg("regular", "heart.svg", "M1,1");

    const mappings = readAllIcons(tmpDir);
    expect(Object.keys(mappings)).toHaveLength(1);
    expect(mappings["heart"]).toBeDefined();
  });
});

describe("generateAllComponents", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "phosphor-gen-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it("generates vue files for each icon-weight pair", () => {
    const mappings: IconMappings = {
      heart: {
        regular: '<path d="M1,1"/>',
        bold: '<path d="M2,2"/>',
      },
    };

    const componentsPath = path.join(tmpDir, "icons");
    const names = generateAllComponents(mappings, componentsPath);

    expect(names).toContain("PhHeartBold");
    expect(names).toContain("PhHeartRegular");
    expect(fs.existsSync(path.join(componentsPath, "PhHeartRegular.vue"))).toBe(
      true
    );
    expect(fs.existsSync(path.join(componentsPath, "PhHeartBold.vue"))).toBe(
      true
    );
  });

  it("returns sorted component names", () => {
    const mappings: IconMappings = {
      star: { regular: '<path d="M1"/>'},
      acorn: { regular: '<path d="M2"/>' },
    };

    const componentsPath = path.join(tmpDir, "icons");
    const names = generateAllComponents(mappings, componentsPath);

    expect(names[0]).toBe("PhAcornRegular");
    expect(names[1]).toBe("PhStarRegular");
  });

  it("generates valid vue SFC content in files", () => {
    const mappings: IconMappings = {
      cube: { fill: '<path d="M5,5"/>' },
    };

    const componentsPath = path.join(tmpDir, "icons");
    generateAllComponents(mappings, componentsPath);

    const content = fs.readFileSync(
      path.join(componentsPath, "PhCubeFill.vue"),
      "utf-8"
    );
    expect(content).toContain('name: "PhCubeFill"');
    expect(content).toContain('<path d="M5,5"/>');
  });

  it("cleans existing directory before generating", () => {
    const componentsPath = path.join(tmpDir, "icons");
    fs.mkdirSync(componentsPath, { recursive: true });
    fs.writeFileSync(path.join(componentsPath, "stale.vue"), "old content");

    const mappings: IconMappings = {
      heart: { regular: '<path d="M1"/>' },
    };
    generateAllComponents(mappings, componentsPath);

    expect(fs.existsSync(path.join(componentsPath, "stale.vue"))).toBe(false);
    expect(
      fs.existsSync(path.join(componentsPath, "PhHeartRegular.vue"))
    ).toBe(true);
  });
});

describe("buildIndexContent", () => {
  it("generates imports and exports for all icon-weight pairs", () => {
    const mappings: IconMappings = {
      heart: { regular: "path1", bold: "path2" },
    };
    const aliasMap = new Map<string, { name: string; pascal_name: string }>();

    const content = buildIndexContent(mappings, aliasMap);

    expect(content).toContain(
      'import PhHeartRegular from "./icons/PhHeartRegular.vue"'
    );
    expect(content).toContain(
      'import PhHeartBold from "./icons/PhHeartBold.vue"'
    );
    expect(content).toContain("export {");
    expect(content).toContain("PhHeartRegular");
    expect(content).toContain("PhHeartBold");
  });

  it("sorts icons alphabetically", () => {
    const mappings: IconMappings = {
      star: { regular: "path" },
      acorn: { regular: "path" },
    };
    const aliasMap = new Map<string, { name: string; pascal_name: string }>();

    const content = buildIndexContent(mappings, aliasMap);

    const acornIdx = content.indexOf("PhAcornRegular");
    const starIdx = content.indexOf("PhStarRegular");
    expect(acornIdx).toBeLessThan(starIdx);
  });

  it("follows weight order from WEIGHTS constant", () => {
    const mappings: IconMappings = {
      heart: {
        bold: "path",
        thin: "path",
        regular: "path",
      },
    };
    const aliasMap = new Map<string, { name: string; pascal_name: string }>();

    const content = buildIndexContent(mappings, aliasMap);

    // WEIGHTS order: thin, light, regular, bold, fill, duotone
    const thinIdx = content.indexOf("PhHeartThin");
    const regularIdx = content.indexOf("PhHeartRegular");
    const boldIdx = content.indexOf("PhHeartBold");
    expect(thinIdx).toBeLessThan(regularIdx);
    expect(regularIdx).toBeLessThan(boldIdx);
  });

  it("includes alias re-exports", () => {
    const mappings: IconMappings = {
      asclepius: { regular: "path", bold: "path" },
    };
    const aliasMap = new Map([
      ["asclepius", { name: "caduceus", pascal_name: "Caduceus" }],
    ]);

    const content = buildIndexContent(mappings, aliasMap);

    expect(content).toContain("PhAsclepiusRegular as PhCaduceusRegular");
    expect(content).toContain("PhAsclepiusBold as PhCaduceusBold");
  });

  it("skips weights that don't exist for an icon", () => {
    const mappings: IconMappings = {
      heart: { regular: "path" }, // only regular, not all 6
    };
    const aliasMap = new Map<string, { name: string; pascal_name: string }>();

    const content = buildIndexContent(mappings, aliasMap);

    expect(content).toContain("PhHeartRegular");
    expect(content).not.toContain("PhHeartBold");
    expect(content).not.toContain("PhHeartThin");
  });
});

describe("WEIGHTS", () => {
  it("contains all 6 weights", () => {
    expect(WEIGHTS).toHaveLength(6);
    expect(WEIGHTS).toContain("thin");
    expect(WEIGHTS).toContain("light");
    expect(WEIGHTS).toContain("regular");
    expect(WEIGHTS).toContain("bold");
    expect(WEIGHTS).toContain("fill");
    expect(WEIGHTS).toContain("duotone");
  });
});
