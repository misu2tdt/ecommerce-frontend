"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { SectionEmpty, SkeletonBlock } from "@/components/analytics-section";
import { buttonStyles } from "@/components/ui/button";
import {
  barLayout,
  indexAtX,
  labelIndexes,
  maxLabelsFor,
  niceScale,
  stepIndex,
  summarizeDays,
} from "@/lib/analytics-chart";
import { formatCompactVnd, formatCount } from "@/lib/analytics";
import {
  formatCalendarDayLong,
  formatCalendarDayShort,
} from "@/lib/dates";
import { formatVnd } from "@/lib/money";
import type { RevenueByDay, RevenueDay } from "@/types/analytics";

const HEIGHT = 260;
const MARGIN = { left: 52, right: 8, top: 12, bottom: 30 };
const FALLBACK_WIDTH = 640;

export function RevenueChartSkeleton() {
  return <SkeletonBlock className="h-72" />;
}

const ordersText = (orders: number) =>
  `${formatCount(orders)} paid ${orders === 1 ? "order" : "orders"}`;

const dayText = (day: RevenueDay) =>
  `${formatCalendarDayLong(day.date)}: ${formatVnd(day.revenue)} from ${ordersText(day.orders)}`;

// Revenue for every day of the range as bars, drawn as inline SVG (no chart
// library). Every day has a slot, so a day without orders is a visible gap. It
// can be read three ways: by pointer (the readout above the bars), by keyboard
// (arrow keys, Home and End on the chart), and as a table.
export function RevenueChart({ data }: { data: RevenueByDay }) {
  const { days } = data;
  const summary = summarizeDays(days);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [tableOpen, setTableOpen] = useState(false);
  const tableId = useId();
  const hintId = useId();

  useEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      setWidth(Math.floor(entries[0].contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (!summary.hasOrders) {
    return (
      <SectionEmpty
        title="No paid orders in this period"
        description="No order was confirmed, shipped or delivered on these days, so there is no revenue to chart."
      />
    );
  }

  const chartWidth = width > 0 ? width : FALLBACK_WIDTH;
  const plot = {
    left: MARGIN.left,
    top: MARGIN.top,
    width: Math.max(1, chartWidth - MARGIN.left - MARGIN.right),
    height: HEIGHT - MARGIN.top - MARGIN.bottom,
  };
  const scale = niceScale(Math.max(...days.map((day) => day.revenue)));
  const bars = barLayout(
    days.map((day) => day.revenue),
    plot,
    scale.top,
  );
  const labels = labelIndexes(days.length, maxLabelsFor(plot.width, 72));
  const yOf = (value: number) =>
    plot.top + plot.height - (value / scale.top) * plot.height;
  const activeDay = active === null ? null : days[active];

  const readout = activeDay
    ? dayText(activeDay)
    : `Total ${formatVnd(summary.total)} from ${ordersText(summary.paidOrders)}` +
      (summary.best
        ? `. Best day: ${formatCalendarDayLong(summary.best.date)}, ${formatVnd(summary.best.revenue)}.`
        : ".");

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    const key = event.key;
    if (
      key !== "ArrowLeft" &&
      key !== "ArrowRight" &&
      key !== "Home" &&
      key !== "End"
    ) {
      return;
    }
    event.preventDefault();
    setActive(stepIndex(active, key, days.length));
  }

  function onPointer(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const x = ((event.clientX - rect.left) / rect.width) * chartWidth;
    setActive(indexAtX(x, plot, days.length));
  }

  return (
    <div>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-chart-readout
        className="min-h-16 text-body-sm font-semibold text-brand-strong"
      >
        {readout}
      </p>

      <div
        ref={boxRef}
        role="group"
        tabIndex={0}
        aria-label="Revenue by day chart"
        aria-describedby={hintId}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
        className="mt-2 rounded-md border border-line bg-surface p-2 focus-visible:outline-2 focus-visible:outline-brand"
      >
        <svg
          role="img"
          aria-label={`Bar chart of revenue for each of ${days.length} days, from ${formatCalendarDayShort(days[0].date)} to ${formatCalendarDayShort(days[days.length - 1].date)}. The axis is in VND.`}
          viewBox={`0 0 ${chartWidth} ${HEIGHT}`}
          width="100%"
          height={HEIGHT}
          preserveAspectRatio="none"
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") setActive(null);
          }}
          className="block touch-pan-y select-none"
        >
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={plot.left}
                x2={plot.left + plot.width}
                y1={yOf(tick)}
                y2={yOf(tick)}
                className={tick === 0 ? "stroke-neutral-400" : "stroke-neutral-200"}
              />
              <text
                x={plot.left - 8}
                y={yOf(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-neutral-600 text-caption"
              >
                {formatCompactVnd(tick)}
              </text>
            </g>
          ))}
          {bars.map((bar, index) => (
            <rect
              key={days[index].date}
              x={bar.x}
              y={bar.y}
              width={bar.width}
              height={bar.height}
              className={
                index === active
                  ? "fill-brand"
                  : bar.empty
                    ? "fill-neutral-300"
                    : "fill-neutral-500"
              }
            />
          ))}
          {labels.map((index) => (
            <text
              key={days[index].date}
              x={bars[index].x + bars[index].width / 2}
              y={HEIGHT - 8}
              textAnchor="middle"
              className="fill-neutral-600 text-caption"
            >
              {formatCalendarDayShort(days[index].date)}
            </text>
          ))}
        </svg>
      </div>
      <p id={hintId} className="mt-2 text-body-sm text-neutral-600">
        Point at a bar, or focus the chart and use the arrow keys, to read a
        day. Axis in VND (K thousand, M million, B billion). Days without paid
        orders have no bar.
      </p>

      <button
        type="button"
        aria-expanded={tableOpen}
        aria-controls={tableId}
        onClick={() => setTableOpen((open) => !open)}
        className={buttonStyles({ variant: "secondary", size: "md", className: "mt-3" })}
      >
        {tableOpen ? "Hide data table" : "Show data table"}
      </button>
      <div
        id={tableId}
        hidden={!tableOpen}
        className="relative mt-3 max-h-96 overflow-auto rounded-md border border-line bg-surface"
      >
        <table className="min-w-full divide-y divide-line">
          <caption className="sr-only">Revenue by day</caption>
          <thead className="sticky top-0 bg-surface-muted">
            <tr>
              {["Date", "Paid orders", "Revenue"].map((heading) => (
                <th
                  key={heading}
                  scope="col"
                  className={`px-4 py-3 text-caption font-semibold uppercase tracking-eyebrow text-neutral-600 ${heading === "Date" ? "text-left" : "text-right"}`}
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {days.map((day) => (
              <tr key={day.date}>
                <th
                  scope="row"
                  className="whitespace-nowrap px-4 py-2 text-left text-body-sm font-normal text-neutral-700"
                >
                  {formatCalendarDayLong(day.date)}
                </th>
                <td className="px-4 py-2 text-right text-body-sm text-neutral-700">
                  {formatCount(day.orders)}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-right text-body-sm font-semibold text-brand-strong">
                  {formatVnd(day.revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
