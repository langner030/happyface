import { GamificationState, ToastItem } from "../utils/types";
import { ConfettiCanvas } from "./ConfettiCanvas";
import { EventFeed } from "./EventFeed";
import { StreakInfo } from "../utils/types";

interface Props {
  gamification: GamificationState;
  streak: StreakInfo;
  toasts: ToastItem[];
  confettiTrigger: number;
  onDismissToast: (id: string) => void;
}

export function GamificationOverlay({
  toasts,
  confettiTrigger,
  onDismissToast,
}: Props) {
  return (
    <>
      {/* Right-side event feed (chat-style) */}
      <EventFeed toasts={toasts} onDismiss={onDismissToast} />

      {/* Confetti canvas */}
      <ConfettiCanvas trigger={confettiTrigger} />
    </>
  );
}
