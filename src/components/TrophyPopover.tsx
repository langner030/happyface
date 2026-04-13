import { GamificationState, StreakInfo } from "../utils/types";
import { getLevelForXP, getXPToNextLevel } from "../utils/levels";
import { ACHIEVEMENTS } from "../utils/achievements";

interface Props {
  gamification: GamificationState;
  streak: StreakInfo;
  onClose: () => void;
}

export function TrophyPopover({ gamification, streak, onClose }: Props) {
  const level = getLevelForXP(gamification.xp);
  const progress = getXPToNextLevel(gamification.xp);
  const unlockedCount = Object.values(gamification.achievements).filter((v) => v != null).length;

  return (
    <>
      <div className="popover-backdrop" onClick={onClose} />
      <div className="trophy-popover">
        {/* Level & XP */}
        <div className="popover-section">
          <div className="popover-level">
            <span className="popover-level-emoji">{level.emoji}</span>
            <div>
              <span className="popover-level-title">{level.title}</span>
              <span className="popover-level-xp">{gamification.xp} XP</span>
            </div>
          </div>
          <div className="popover-xp-bar">
            <div className="popover-xp-fill" style={{ width: `${Math.round(progress.progress * 100)}%` }} />
          </div>
          <span className="popover-xp-label">{progress.current} / {progress.next} XP to Lv.{level.level + 1}</span>
        </div>

        {/* Streak */}
        <div className="popover-section">
          <div className="popover-stat-row">
            <span>🔥 Streak</span>
            <strong>{streak.current} Tage</strong>
          </div>
          <div className="popover-stat-row">
            <span>🏆 Bester Streak</span>
            <strong>{streak.best} Tage</strong>
          </div>
          <div className="popover-stat-row">
            <span>📸 Scans gesamt</span>
            <strong>{gamification.counters.totalScans}</strong>
          </div>
          <div className="popover-stat-row">
            <span>🔥 Longest Happy</span>
            <strong>{Math.floor(gamification.records.longestHappyStreak)}s</strong>
          </div>
          <div className="popover-stat-row">
            <span>⚡ Peak Score</span>
            <strong>{gamification.records.highestHappyScore}%</strong>
          </div>
        </div>

        {/* Achievements */}
        <div className="popover-section">
          <span className="popover-section-title">Achievements ({unlockedCount}/{ACHIEVEMENTS.length})</span>
          <div className="popover-badges">
            {ACHIEVEMENTS.map((a) => {
              const unlocked = gamification.achievements[a.id] != null;
              return (
                <span
                  key={a.id}
                  className={`popover-badge ${unlocked ? "" : "popover-badge--locked"}`}
                  title={`${a.title}${unlocked ? " ✓" : ""}`}
                >
                  {a.emoji}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
