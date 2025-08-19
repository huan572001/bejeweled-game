import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '@/lib/game/engine/GameEngine';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export default function GameBoard() {
  const engineRef = useRef<GameEngine>(null);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const score = useSelector((state: RootState) => state.score.value);

  useEffect(() => {
    engineRef.current = new GameEngine();
    engineRef.current.init();

    const interval = setInterval(() => {
      if (engineRef.current) {
        const time = engineRef.current.timer.getTime();
        setTime((time / 1000).toFixed(0) as any);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleRestart = () => {
    engineRef.current?.restart();
    setPaused(false);
  };

  const destroyRandomGems = () => {
    engineRef.current?.destroyRandomGems();
  };
  const destroy4x4 = () => {
    engineRef.current?.setActiveDestroy(!engineRef.current?.activeDestroy);
  };
  const handlePause = () => {
    if (!engineRef.current) return;
    const isPause = engineRef.current.paused;
    isPause ? engineRef.current.resume() : engineRef.current.pause();
    setPaused(!isPause);
  };

  const handleHint = () => {
    const hint = engineRef.current?.showHint();
    if (hint) {
      hint[0].element.classList.add('hint');
      hint[1].element.classList.add('hint');

      setTimeout(() => {
        hint[0].element.classList.remove('hint');
        hint[1].element.classList.remove('hint');
      }, 1000);
    } else {
      alert('No possible moves!');
    }
  };
  const handleShuffle = () => {
    engineRef.current?.shuffle();
  };
  return (
    <div className="flex flex-col items-center gap-4">
      <div>Level: {engineRef.current?.score.level || 1}</div>
      <div>Score next level: {engineRef.current?.score.goal || 0}</div>
      <div id="grid" className="relative grid w-full grid-cols-8 gap-1 border border-gray-400 sm:w-[530px]" />
      <div className="flex gap-2">
        <button onClick={handleRestart} className="rounded bg-blue-600 px-4 py-2 text-white">
          🔁 Restart
        </button>
        <button onClick={handleShuffle} className="rounded bg-blue-600 px-4 py-2 text-white">
          🔁 shuffle
        </button>
        <button onClick={handlePause} className="rounded bg-yellow-500 px-4 py-2 text-black">
          {paused ? '▶️ Resume' : '⏸ Pause'}
        </button>
        <button onClick={handleHint} className="rounded bg-green-600 px-4 py-2 text-white">
          💡 Hint
        </button>
        <button onClick={destroyRandomGems} className="rounded bg-green-600 px-4 py-2 text-white">
          💡 destroyRandomGems
        </button>
        <button
          onClick={destroy4x4}
          className={'cursor-pointer rounded px-4 py-2 text-white'}
          style={{
            background: engineRef.current?.activeDestroy ? 'red' : 'green',
          }}
        >
          💡 destroy4*4
        </button>
      </div>
      <div className="mb-4 flex justify-between gap-5 px-4 text-xl font-semibold text-[#000]">
        <div>Score: {score}</div>
        <div>Time: {time}s</div>
      </div>
    </div>
  );
}
