"use client";

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  CartesianGrid,
} from "recharts";

export default function OrderActivityChart({ data = [] }) {
  const chartData = Array.isArray(data) ? data : [];

  return (
    <div className="w-full rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-gray-800">
          Order Activity
        </h2>

        <p className="mt-1 text-sm text-gray-400">
          Hourly order activity
        </p>
      </div>

      {/* Chart */}
      <div className="h-[280px] w-full">
        {chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">
              No order data available
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{
                top: 25,
                right: 10,
                left: -20,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f0f0f0"
              />

              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#9ca3af",
                  fontSize: 10,
                }}
                interval={1}
              />

              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{
                  fill: "#9ca3af",
                  fontSize: 11,
                }}
              />

              <Tooltip
                cursor={{
                  fill: "rgba(0, 0, 0, 0.03)",
                }}
                contentStyle={{
                  borderRadius: "10px",
                  border: "1px solid #f0f0f0",
                  boxShadow:
                    "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(value) => [
                  `${value} Orders`,
                  "Orders",
                ]}
              />

              <Bar
                dataKey="count"
                fill="#990000"
                radius={[4, 4, 0, 0]}
                barSize={18}
              >
                <LabelList
                  dataKey="count"
                  position="top"
                  style={{
                    fill: "#374151",
                    fontSize: "10px",
                    fontWeight: "600",
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}