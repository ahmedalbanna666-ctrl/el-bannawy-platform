"use client";

import { useState } from "react";
import { PronunciationChallenge } from "@/components/games/pronunciation-challenge";
import { GameIntroDialog } from "@/components/games/game-intro-dialog";

export default function PronunciationChallengePage(): React.ReactNode {
  const [showIntro, setShowIntro] = useState(true);
  return (
    <>
      <GameIntroDialog
        gameKey="pronunciation"
        open={showIntro}
        onClose={() => {
          setShowIntro(false);
        }}
      />
      <PronunciationChallenge />
    </>
  );
}
