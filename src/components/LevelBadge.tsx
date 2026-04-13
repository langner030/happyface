import { getLevelForXP, getXPToNextLevel } from "../utils/levels";

interface Props {
  xp: number;
}

export function LevelBadge({ xp }: Props) {
  const level = getLevelForXP(xp);
  const progress = getXPToNextLevel(xp);

  return (
    <span className="level-badge" title={`${level.title} — ${Math.round(progress.progress * 100)}%`}>
      {level.emoji} Lv.{level.level}
    </span>
  );
}
