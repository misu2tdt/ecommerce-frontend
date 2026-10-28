import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Guards the design system: all colour, type and brand decisions live in the
// tokens in src/app/globals.css and the primitives in src/components/ui.
// A rule listed here fails the build as soon as a forbidden pattern returns.

const SOURCE_ROOT = path.resolve(process.cwd(), "src");
const SOURCE_FILE = /\.(tsx?|css)$/;

const RULES: Array<{ name: string; pattern: RegExp; hint: string }> = [
  {
    name: "arbitrary text size",
    pattern: /text-\[\d+(?:\.\d+)?px\]/g,
    hint: "use a type token: text-caption, text-body-sm, text-body, text-title, text-heading, text-display",
  },
  {
    name: "default Tailwind type size",
    pattern: /(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g,
    hint: "use the type tokens instead of the default Tailwind sizes",
  },
  {
    name: "large radius",
    pattern: /\brounded(?:-[trbl]{1,2})?-(?:lg|xl|2xl|3xl)\b/g,
    hint: "buttons, inputs and cards use rounded-md; pills are only for badges and chips",
  },
  {
    name: "off-palette colour",
    pattern: /\b(?:fuchsia|sky|violet|cyan|blue|indigo|purple|teal|pink|rose|orange|lime|stone|zinc|gray|yellow)-\d/g,
    hint: "status colours are green (success token), amber, red; everything else is neutral",
  },
  {
    name: "font-black",
    pattern: /\bfont-black\b/g,
    hint: "only weights 400, 600 and 700 are loaded: use font-bold",
  },
  {
    name: "font-extrabold",
    pattern: /\bfont-extrabold\b/g,
    hint: "only weights 400, 600 and 700 are loaded: use font-bold",
  },
  {
    name: "font-medium",
    pattern: /\bfont-medium\b/g,
    hint: "only weights 400, 600 and 700 are loaded: use font-normal or font-semibold",
  },
  {
    name: "slate palette",
    pattern: /\bslate-\d/g,
    hint: "use the neutral palette or a semantic token (brand, line, surface-muted)",
  },
  {
    name: "emerald palette",
    pattern: /\bemerald-\d/g,
    hint: "emerald is no longer the brand colour: use brand tokens, or success for status",
  },
  {
    name: "hard-coded Arial",
    pattern: /Arial/g,
    hint: "the font comes from next/font through --font-sans",
  },
  {
    name: "old store name",
    pattern: /Evergreen Store/g,
    hint: "import SITE_NAME from src/lib/site.ts",
  },
];

// Explicit allowlist: file (relative to the repository root, forward slashes)
// -> rule names that are legitimately allowed there, with the reason.
// It is intentionally empty. Add an entry only with a written justification.
const ALLOWLIST: Record<string, { rules: string[]; reason: string }> = {};

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    return SOURCE_FILE.test(entry.name) ? [fullPath] : [];
  });
}

function findViolations() {
  const violations: string[] = [];
  for (const file of listSourceFiles(SOURCE_ROOT)) {
    const relative = path.relative(process.cwd(), file).replaceAll("\\", "/");
    const allowed = ALLOWLIST[relative]?.rules ?? [];
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (allowed.includes(rule.name)) continue;
        rule.pattern.lastIndex = 0;
        const match = rule.pattern.exec(line);
        if (match)
          violations.push(
            `${relative}:${index + 1}  ${rule.name} "${match[0]}"  (${rule.hint})`,
          );
      }
    });
  }
  return violations;
}

test.describe("design system source rules", () => {
  test("no forbidden classes, fonts or strings remain in src/", () => {
    const violations = findViolations();
    expect(violations, violations.join("\n")).toEqual([]);
  });

  test("the allowlist stays honest: every entry has a reason and a real file", () => {
    for (const [file, entry] of Object.entries(ALLOWLIST)) {
      expect(entry.reason.length, `${file} needs a reason`).toBeGreaterThan(10);
      expect(() =>
        readFileSync(path.resolve(process.cwd(), file), "utf8"),
      ).not.toThrow();
    }
  });
});
