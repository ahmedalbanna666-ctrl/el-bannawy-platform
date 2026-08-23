"use client";

import { type ReactNode } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GAME_INTRO, type GameKey } from "@/lib/games/info";

interface GameIntroDialogProps {
  gameKey: GameKey;
  open: boolean;
  onClose: () => void;
}

export function GameIntroDialog({
  gameKey,
  open,
  onClose,
}: GameIntroDialogProps): ReactNode {
  const info = GAME_INTRO[gameKey];

  return (
    <Dialog open={open} onClose={onClose} title={info.title}>
      <div className="flex flex-col gap-5">
        <p className="text-sm leading-relaxed text-neutral-500">
          {info.description}
        </p>
        <Button variant="primary" fullWidth onClick={onClose}>
          ابدأ اللعب
        </Button>
      </div>
    </Dialog>
  );
}
