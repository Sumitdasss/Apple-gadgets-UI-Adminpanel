"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
} from "recharts";

const formatDate = (value) => {
  if (!value) return "Unknown date";

  const date = new Date(`${value}T00:00:00+06:00`);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

const formatShortDate = (value) => {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length !== 3) return value;

  const [year, month, day] = parts;

  return `${day}/${month}/${year}`;
};
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-lg">
      <p className="mb-1 text-xs font-semibold text-gray-500">
        {formatDate(label)}
      </p>

      <p className="text-sm font-bold text-red-800">
        Orders: {Number(payload[0]?.value || 0).toLocaleString("en-US")}
      </p>
    </div>
  );
};

export default function OrderActivityChart({
  data = [],
  title = "Order Activity",
  subtitle = "Date-wise order activity",
}) {
  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return [];

    return data
      .map((item) => ({
        date: String(item.date || item._id || item.day || ""),
        count: Number(item.count ?? item.orders ?? item.totalOrders ?? 0),
      }))
      .filter(
        (item) =>
          /^\d{4}-\d{2}-\d{2}$/.test(item.date) && Number.isFinite(item.count),
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  const yAxisMax = useMemo(() => {
    const highest = Math.max(0, ...chartData.map((item) => item.count));

    // Y-axis will start at 30 and expand when necessary.
    return Math.max(30, Math.ceil(highest / 5) * 5);
  }, [chartData]);

  const yTicks = useMemo(() => {
    const ticks = [];

    for (let value = 0; value <= yAxisMax; value += 5) {
      ticks.push(value);
    }

    return ticks;
  }, [yAxisMax]);

  return (
    <div className="w-full min-w-0 rounded-xl border border-gray-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>

        <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-400">
          No order activity available.
        </div>
      ) : (
        <div className="h-[310px] w-full sm:h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 20,
                right: 12,
                left: 0,
                bottom: chartData.length > 7 ? 30 : 8,
              }}
              barCategoryGap={chartData.length > 20 ? "15%" : "35%"}
            >
              <CartesianGrid
                stroke="#e5e7eb"
                strokeDasharray="3 3"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tickFormatter={formatShortDate}
                interval={0}
                angle={chartData.length > 5 ? -45 : 0}
                textAnchor={chartData.length > 5 ? "end" : "middle"}
                height={chartData.length > 5 ? 70 : 35}
                tick={{
                  fontSize: 10,
                  fill: "#64748b",
                }}
                axisLine={false}
                tickLine={false}
                minTickGap={0}
              />
              <YAxis
                domain={[0, yAxisMax]}
                ticks={yTicks}
                allowDecimals={false}
                width={35}
                tick={{
                  fontSize: 11,
                  fill: "#94a3b8",
                }}
                axisLine={false}
                tickLine={false}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "#fef2f2" }}
              />

              <Bar
                dataKey="count"
                name="Orders"
                fill="#a90000"
                radius={[5, 5, 0, 0]}
                maxBarSize={28}
                minPointSize={0}
                isAnimationActive={false}
              >
                <LabelList
                  dataKey="count"
                  position="top"
                  formatter={(value) => Number(value).toLocaleString("en-US")}
                  style={{
                    fontSize: 11,
                    fill: "#334155",
                    fontWeight: 500,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
        <span className="text-xs text-gray-500">
          Total records: {chartData.length}
        </span>

        <span className="text-xs font-semibold text-gray-700">
          Total orders:{" "}
          {chartData
            .reduce((total, item) => total + item.count, 0)
            .toLocaleString("en-US")}
        </span>
      </div>
    </div>
  );
}
