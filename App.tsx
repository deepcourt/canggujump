/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState } from 'react';
import DinoGame from './components/DinoGame';

const App: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false); // State to control mute
  const backgroundMusicRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = backgroundMusicRef.current;
    if (audio) {
      audio.muted = isMuted;
      // Do not attempt to play automatically on mount/mute change if muted is false.
      // Playback will be initiated by user interaction.
    }
  }, [isMuted]);

  // Function to attempt playing music, triggered by user interaction
  const playBackgroundMusic = () => {
    const audio = backgroundMusicRef.current;
    if (audio && !isMuted) {
      audio.play().catch(e => console.error("Background music play failed:", e));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-game-bg text-game-text font-press-start">
      {/* Audio element for background music */}
      <audio
        ref={backgroundMusicRef}
        src="/audio/background-music.mp3" // Path relative to public directory
        loop // Makes the music loop automatically
        preload="auto" // Or 'metadata' or 'none'
      />

      <h1 className="text-2xl md:text-3xl mb-6 text-center text-game-text">
        Canggu Jump
      </h1>
      {/* Pass playBackgroundMusic function as a prop */}
      <DinoGame onUserInteraction={playBackgroundMusic} isMuted={isMuted} />
    </div>
  );
};

export default App;