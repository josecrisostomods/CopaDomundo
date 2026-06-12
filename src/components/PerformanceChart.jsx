import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { scorePrediction, DEFAULT_SCORING } from "../lib/scoring";
import { formatDate } from "../utils/formatters";

// Generate colors for lines
const COLORS = [
  "#2563eb", // blue-600
  "#dc2626", // red-600
  "#16a34a", // green-600
  "#ca8a04", // yellow-600
  "#9333ea", // purple-600
  "#0891b2", // cyan-600
  "#ea580c", // orange-600
  "#e11d48", // rose-600
];

export function PerformanceChart({ users, fixtures, predictions, settings }) {
  const chartData = useMemo(() => {
    // 1. Get finished fixtures only
    const finishedFixtures = fixtures.filter((f) => f.status === "FINISHED");
    if (!finishedFixtures.length) return [];

    // 2. Group by date (YYYY-MM-DD)
    const dates = new Set();
    finishedFixtures.forEach((f) => {
      dates.add(f.kickoff.substring(0, 10));
    });
    
    const sortedDates = Array.from(dates).sort((a, b) => new Date(a) - new Date(b));

    // 3. Keep track of running totals for each user
    const runningTotals = {};
    users.forEach((u) => {
      runningTotals[u.id] = 0;
    });

    // 4. Build chart data
    return sortedDates.map((dateStr) => {
      const fixturesOnDate = finishedFixtures.filter((f) => f.kickoff.startsWith(dateStr));
      
      const dataPoint = {
        name: formatDate(dateStr).split(",")[0], // Just the day/month part
        rawDate: dateStr,
      };

      users.forEach((user) => {
        let pointsEarnedOnDate = 0;
        fixturesOnDate.forEach((fixture) => {
          const userPred = predictions.find(
            (p) => p.userId === user.id && p.fixtureId === fixture.id
          );
          if (userPred) {
            pointsEarnedOnDate += scorePrediction(fixture, userPred, settings || DEFAULT_SCORING).total;
          }
        });

        runningTotals[user.id] += pointsEarnedOnDate;
        dataPoint[user.name] = runningTotals[user.id];
      });

      return dataPoint;
    });
  }, [users, fixtures, predictions, settings]);

  if (!chartData.length) {
    return (
      <div className="empty-state">
        <p>Nenhum jogo finalizado ainda para gerar o grafico.</p>
      </div>
    );
  }

  return (
    <div className="chart-container" style={{ width: "100%", height: 350, marginTop: "16px" }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke="#888" 
            fontSize={12} 
            tickMargin={10} 
          />
          <YAxis 
            stroke="#888" 
            fontSize={12} 
            tickMargin={10} 
            allowDecimals={false}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "#1e1e1e", border: "1px solid #333", borderRadius: "8px" }}
            itemStyle={{ fontSize: "14px", fontWeight: "bold" }}
          />
          <Legend 
            wrapperStyle={{ paddingTop: "20px" }}
            iconType="circle"
          />
          {users.map((user, index) => (
            <Line
              key={user.id}
              type="monotone"
              dataKey={user.name}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
