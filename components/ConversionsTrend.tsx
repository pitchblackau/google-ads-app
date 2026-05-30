"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { DailyConversion } from "@/lib/types";
import { format, parseISO } from "date-fns";

interface ConversionsTrendProps {
  data: DailyConversion[];
  title?: string;
  subtitle?: string;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  // Use the raw ISO date from the data point, not the formatted XAxis label
  const rawDate: string = payload[0]?.payload?.date ?? "";
  return (
    <div className="rounded-lg border border-[#1e1e2e] bg-[#0d0d18] px-3 py-2 shadow-xl">
      <p className="text-[11px] text-[#8b8b9a]">
        {rawDate ? format(parseISO(rawDate), "dd MMM yyyy") : ""}
      </p>
      <p className="text-sm font-semibold text-[#00fff9]">
        {payload[0].value.toLocaleString()} conversions
      </p>
    </div>
  );
}

export default function ConversionsTrend({
  data,
  title = "Conversions Trend — All Active Accounts",
  subtitle = "Last 30 days",
}: ConversionsTrendProps) {
  const totalConversions = data.reduce((s, d) => s + d.conversions, 0);
  const avgDaily = data.length ? Math.round(totalConversions / data.length) : 0;

  const chartData = data.map((d) => ({
    ...d,
    displayDate: format(parseISO(d.date), "dd MMM"),
  }));

  return (
    <div className="rounded-xl border border-[#1e1e2e] bg-[#111118] p-5">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-[12px] text-[#4e4e63]">{subtitle}</p>
        </div>
        <div className="flex gap-6">
          <Stat label="Total Conversions" value={totalConversions.toLocaleString()} />
          <Stat label="Daily Average" value={avgDaily.toLocaleString()} />
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00fff9" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#00fff9" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 10, fill: "#4e4e63" }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#4e4e63" }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#2e2e3e" }} />
          <Area
            type="monotone"
            dataKey="conversions"
            stroke="#00fff9"
            strokeWidth={2}
            fill="url(#tealGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#00fff9", stroke: "#0d0d18", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <p className="text-[11px] text-[#4e4e63]">{label}</p>
      <p className="text-lg font-bold text-[#00fff9]">{value}</p>
    </div>
  );
}
