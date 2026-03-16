import { StreakInfo, DayData } from "../utils/types";

interface Props {
  streak: StreakInfo;
  todayData: DayData | null;
  weekData: DayData[];
}

export function StatsPanel({ streak, todayData, weekData }: Props) {
  return (
    <div className="stats-panel">
      <h3 className="section-title">Statistiken</h3>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <div>
            <span className="stat-value">{streak.current}</span>
            <span className="stat-label">Tage Streak</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">🏆</span>
          <div>
            <span className="stat-value">{streak.best}</span>
            <span className="stat-label">Bester Streak</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <div>
            <span className="stat-value">
              {todayData ? `${Math.round(todayData.avgHappiness)}%` : "—"}
            </span>
            <span className="stat-label">Heute Ø</span>
          </div>
        </div>

        <div className="stat-card">
          <span className="stat-icon">⚡</span>
          <div>
            <span className="stat-value">
              {todayData ? `${todayData.peakHappiness}%` : "—"}
            </span>
            <span className="stat-label">Peak Heute</span>
          </div>
        </div>
      </div>

      {weekData.length > 0 && (
        <div className="week-bars">
          <h4 className="subsection-title">Letzte 7 Tage</h4>
          <div className="bar-chart">
            {weekData.map((day) => {
              const dayName = new Date(day.date).toLocaleDateString("de-DE", {
                weekday: "short",
              });
              const height = Math.max(4, day.avgHappiness);
              const color =
                day.avgHappiness > 60
                  ? "#34d399"
                  : day.avgHappiness > 35
                    ? "#fbbf24"
                    : "#f87171";
              return (
                <div key={day.date} className="bar-col">
                  <div
                    className="bar"
                    style={{
                      height: `${height}%`,
                      background: color,
                    }}
                  />
                  <span className="bar-label">{dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
