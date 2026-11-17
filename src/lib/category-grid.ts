// How the home page's category cards sit in a grid, for any number of
// categories (the shop shows 5 before the catalog expansion is seeded and 7
// after, and a failed lookup or a deleted category can give others).
//
// From md the grid has 6 columns, from lg a column count of its own. Every row
// of the plan is full: no card is left alone in a row. Below md the cards are a
// horizontal scroller and this plan does not apply.
//
//   cards   md (768-1023), 6 columns     lg and up
//   5       2 2 2 / 3 3                  5 in one row
//   6       2 2 2 / 2 2 2                3 / 3
//   7       3 3 / 3 3 / 2 2 2            4 / 3 (the last three are wider)

export interface CategoryGridPlan {
  // Columns each card spans at md, in a grid of MD_COLUMNS.
  mdSpans: number[];
  lgColumns: number;
  // Columns each card spans at lg, in a grid of lgColumns.
  lgSpans: number[];
}

export const MD_COLUMNS = 6;

const ones = (count: number) => Array<number>(count).fill(1);
const repeat = (span: number, count: number) => Array<number>(count).fill(span);

export function categoryGridPlan(count: number): CategoryGridPlan {
  switch (count) {
    case 0:
      return { mdSpans: [], lgColumns: 1, lgSpans: [] };
    case 1:
      return { mdSpans: [6], lgColumns: 1, lgSpans: [1] };
    case 2:
      return { mdSpans: repeat(3, 2), lgColumns: 2, lgSpans: ones(2) };
    case 3:
      return { mdSpans: repeat(2, 3), lgColumns: 3, lgSpans: ones(3) };
    case 4:
      return { mdSpans: repeat(3, 4), lgColumns: 4, lgSpans: ones(4) };
    case 5:
      return { mdSpans: [2, 2, 2, 3, 3], lgColumns: 5, lgSpans: ones(5) };
    case 6:
      return { mdSpans: repeat(2, 6), lgColumns: 3, lgSpans: ones(6) };
    case 7:
      return {
        mdSpans: [3, 3, 3, 3, 2, 2, 2],
        lgColumns: 12,
        lgSpans: [3, 3, 3, 3, 4, 4, 4],
      };
    default:
      // More than the shop has a presentation for: rows of three and four, the
      // last one possibly short. Not reachable with the categories in
      // lib/catalog-nav.
      return {
        mdSpans: repeat(2, count),
        lgColumns: 4,
        lgSpans: ones(count),
      };
  }
}

// How many cards each row holds when the cards are placed one after another in a
// grid of `columns` (what CSS grid does with spans). Used to check a plan.
export function cardsPerRow(
  spans: readonly number[],
  columns: number,
): number[] {
  const rows: number[] = [];
  let used = 0;
  let inRow = 0;
  for (const span of spans) {
    if (used + span > columns) {
      rows.push(inRow);
      used = 0;
      inRow = 0;
    }
    used += span;
    inRow += 1;
  }
  if (inRow > 0) rows.push(inRow);
  return rows;
}

// Whether every row of the cards fills all its columns.
export function rowsAreFull(
  spans: readonly number[],
  columns: number,
): boolean {
  let used = 0;
  for (const span of spans) {
    if (used + span > columns) return false;
    used += span;
    if (used === columns) used = 0;
  }
  return used === 0;
}

// Full class names, written out so Tailwind finds them.
const MD_SPAN_CLASS: Record<number, string> = {
  2: "md:col-span-2",
  3: "md:col-span-3",
  6: "md:col-span-6",
};
const LG_SPAN_CLASS: Record<number, string> = {
  1: "lg:col-span-1",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
};
const LG_COLUMNS_CLASS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  12: "lg:grid-cols-12",
};

export function categoryGridClasses(count: number): {
  list: string;
  items: string[];
} {
  const plan = categoryGridPlan(count);
  return {
    list: LG_COLUMNS_CLASS[plan.lgColumns],
    items: plan.mdSpans.map(
      (span, index) =>
        `${MD_SPAN_CLASS[span]} ${LG_SPAN_CLASS[plan.lgSpans[index]]}`,
    ),
  };
}
