import { describe, expect, it } from "vitest";
import {
  buildTypeDefinitions,
  detectWeight,
  parseExportNames,
} from "../bin/generate-types.js";

describe("parseExportNames", () => {
  it("parses simple named exports", () => {
    const js = `export { Foo, Bar, Baz };`;
    expect(parseExportNames(js)).toEqual(["Foo", "Bar", "Baz"]);
  });

  it("handles aliased exports", () => {
    const js = `export { Foo as Bar, Baz };`;
    expect(parseExportNames(js)).toEqual(["Bar", "Baz"]);
  });

  it("handles mixed direct and aliased exports", () => {
    const js = `export { PhHeartRegular, PhAsclepiusBold as PhCaduceusBold, PhStarFill };`;
    expect(parseExportNames(js)).toEqual([
      "PhHeartRegular",
      "PhCaduceusBold",
      "PhStarFill",
    ]);
  });

  it("handles multiline export blocks", () => {
    const js = `export {\n  Foo,\n  Bar,\n  Baz\n};`;
    expect(parseExportNames(js)).toEqual(["Foo", "Bar", "Baz"]);
  });

  it("returns empty array when no export block found", () => {
    const js = `const x = 1;`;
    expect(parseExportNames(js)).toEqual([]);
  });

  it("handles whitespace in export entries", () => {
    const js = `export {  Foo ,  Bar  as  Baz  };`;
    expect(parseExportNames(js)).toEqual(["Foo", "Baz"]);
  });

  it("filters out empty entries from trailing commas", () => {
    const js = `export { Foo, Bar, };`;
    expect(parseExportNames(js)).toEqual(["Foo", "Bar"]);
  });

  it("handles content before and after export block", () => {
    const js = `import { x } from "vue";\nconst y = 1;\nexport { Foo, Bar };\nconsole.log("done");`;
    expect(parseExportNames(js)).toEqual(["Foo", "Bar"]);
  });
});

describe("detectWeight", () => {
  it("detects each weight suffix", () => {
    expect(detectWeight("PhHeartThin")).toBe("PhosphorThinIcon");
    expect(detectWeight("PhHeartLight")).toBe("PhosphorLightIcon");
    expect(detectWeight("PhHeartRegular")).toBe("PhosphorRegularIcon");
    expect(detectWeight("PhHeartBold")).toBe("PhosphorBoldIcon");
    expect(detectWeight("PhHeartFill")).toBe("PhosphorFillIcon");
    expect(detectWeight("PhHeartDuotone")).toBe("PhosphorDuotoneIcon");
  });

  it("returns null for names without a weight suffix", () => {
    expect(detectWeight("PhHeart")).toBeNull();
    expect(detectWeight("SomeOtherComponent")).toBeNull();
  });
});

describe("buildTypeDefinitions", () => {
  it("generates correct d.ts content with weight-specific types", () => {
    const result = buildTypeDefinitions(["PhHeartRegular", "PhStarBold"]);

    expect(result).toContain('import { DefineComponent } from "vue"');
    expect(result).toContain("export type PhosphorIconComponent");
    expect(result).toContain("size?: string | number");
    expect(result).toContain("color?: string");
    expect(result).toContain("mirrored?: boolean");
    expect(result).toContain("export type PhosphorThinIcon");
    expect(result).toContain("export type PhosphorRegularIcon");
    expect(result).toContain("export type PhosphorBoldIcon");
    expect(result).toContain(
      "export declare const PhHeartRegular: PhosphorRegularIcon"
    );
    expect(result).toContain(
      "export declare const PhStarBold: PhosphorBoldIcon"
    );
  });

  it("uses PhosphorIconComponent for names without a weight suffix", () => {
    const result = buildTypeDefinitions(["PhHeart"]);
    expect(result).toContain(
      "export declare const PhHeart: PhosphorIconComponent"
    );
  });

  it("generates one export per name", () => {
    const names = ["A", "B", "C"];
    const result = buildTypeDefinitions(names);
    const exportLines = result
      .split("\n")
      .filter((l) => l.startsWith("export declare const"));
    expect(exportLines).toHaveLength(3);
  });

  it("handles empty export list", () => {
    const result = buildTypeDefinitions([]);
    expect(result).toContain("export type PhosphorIconComponent");
    const exportLines = result
      .split("\n")
      .filter((l) => l.startsWith("export declare const"));
    expect(exportLines).toHaveLength(0);
  });
});
