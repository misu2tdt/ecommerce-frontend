import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// Mojibake is UTF-8 text that was read as Latin-1 / Windows-1252 and saved again:
// an en dash turns into three odd characters, an arrow into three others, and so
// on. This file never writes those characters out: the pattern uses escapes and the
// examples are built from code points, so the scan below does not trip over itself.
//
// A damaged character starts with one of three lead characters (U+00C3, U+00C2,
// U+00E2) followed by a character from the Latin-1 or Windows-1252 "second byte"
// range. A replacement character (U+FFFD) or a C1 control character in source
// text is the same kind of damage.
const MOJIBAKE = new RegExp(
  [
    "[\\u00C2\\u00C3\\u00E2]" +
      "[\\u0080-\\u00BF\\u0152\\u0153\\u0160\\u0161\\u0178\\u017D\\u017E\\u0192\\u02C6\\u02DC" +
      "\\u2013\\u2014\\u2018-\\u201E\\u2020-\\u2022\\u2026\\u2030\\u2039\\u203A\\u20AC\\u2122]",
    "\\uFFFD",
    "[\\u0080-\\u009F]",
  ].join("|"),
);

const ROOT = process.cwd();
// Where text for shoppers, the staff and readers of the project lives.
const SCANNED = ["src", "tests", "README.md"];
const TEXT_FILE = /\.(ts|tsx|js|mjs|json|md|css|svg)$/;

function listFiles(target: string): string[] {
  const full = path.join(ROOT, target);
  if (!statSync(full).isDirectory()) return [full];
  return readdirSync(full, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(target, entry.name);
    return entry.isDirectory() ? listFiles(child) : [path.join(ROOT, child)];
  });
}

const text = (...codePoints: number[]) => String.fromCodePoint(...codePoints);

test.describe("Text encoding", () => {
  test("no source, test or README text contains mojibake", () => {
    const damaged: string[] = [];
    let scanned = 0;
    for (const target of SCANNED) {
      for (const file of listFiles(target)) {
        if (!TEXT_FILE.test(file)) continue;
        scanned += 1;
        const lines = readFileSync(file, "utf8").split(/\r?\n/);
        lines.forEach((line, index) => {
          if (MOJIBAKE.test(line)) {
            const relative = path.relative(ROOT, file).replaceAll("\\", "/");
            damaged.push(`${relative}:${index + 1}: ${line.trim().slice(0, 80)}`);
          }
        });
      }
    }
    // A scan that found no files would pass for the wrong reason.
    expect(scanned).toBeGreaterThan(100);
    expect(damaged, `mojibake found:\n${damaged.join("\n")}`).toEqual([]);
  });

  test("the pattern catches the damage that was found before", () => {
    const damaged = {
      "en dash": text(0xe2, 0x20ac, 0x201c),
      "em dash": text(0xe2, 0x20ac, 0x201d),
      "minus sign": text(0xe2, 0x2c6, 0x2019),
      "right arrow": text(0xe2, 0x2020, 0x2019),
      "e acute read as Latin-1": text(0xc3, 0xa9),
      "no-break space read as Latin-1": text(0xc2, 0xa0),
      "replacement character": `price ${text(0xfffd)} 100`,
    };
    for (const [name, sample] of Object.entries(damaged)) {
      expect(MOJIBAKE.test(sample), name).toBe(true);
    }
  });

  test("the pattern leaves correct text alone", () => {
    const fine = {
      "en dash": text(0x2013),
      "em dash": text(0x2014),
      "minus sign": text(0x2212),
      "right arrow": text(0x2192),
      "e acute": `caf${text(0xe9)}`,
      "A grave": `${text(0xc0)} la carte`,
      "Vietnamese": `Qu${text(0x1ea7)}n ${text(0xe1)}o`,
      "c cedilla": `Fran${text(0xe7)}ais`,
      "bullet between digits": `100 ${text(0x2022)} 200`,
    };
    for (const [name, sample] of Object.entries(fine)) {
      expect(MOJIBAKE.test(sample), name).toBe(false);
    }
  });
});
