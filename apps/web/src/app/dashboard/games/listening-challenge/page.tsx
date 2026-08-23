"use client";

import { useState } from "react";
import { ListeningChallenge } from "@/components/games/listening-challenge";
import { GameIntroDialog } from "@/components/games/game-intro-dialog";

export default function ListeningChallengePage(): React.ReactNode {
  const [showIntro, setShowIntro] = useState(true);
  return (
    <>
      <GameIntroDialog
        gameKey="listening"
        open={showIntro}
        onClose={() => {
          setShowIntro(false);
        }}
      />
      <ListeningChallenge />
    </>
  );
}
