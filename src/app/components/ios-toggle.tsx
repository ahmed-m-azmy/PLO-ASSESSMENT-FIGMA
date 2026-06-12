import * as React from "react";
import { motion } from "motion/react";

interface IOSToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function IOSToggle({ checked, onChange, disabled = false }: IOSToggleProps) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleToggle = () => {
    if (disabled) return;

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    onChange(!checked);
  };

  React.useEffect(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    const createSnapSound = () => {
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.05, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < buffer.length; i++) {
        const t = i / audioContext.sampleRate;
        const envelope = Math.exp(-t * 50);
        data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
      }

      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);

      return source;
    };

    audioRef.current = {
      play: () => {
        const sound = createSnapSound();
        sound.start();
        return Promise.resolve();
      },
      pause: () => {},
      currentTime: 0,
    } as any;

    return () => {
      audioContext.close();
    };
  }, []);

  return (
    <button
      onClick={handleToggle}
      disabled={disabled}
      className="relative inline-flex items-center cursor-pointer focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      aria-checked={checked}
      role="switch"
    >
      <motion.div
        className="relative rounded-full"
        style={{
          width: 51,
          height: 31,
          backgroundColor: checked ? "#34C759" : "#E5E5EA",
        }}
        animate={{
          backgroundColor: checked ? "#34C759" : "#E5E5EA",
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="absolute top-[2px] left-[2px] bg-white rounded-full shadow-md"
          style={{
            width: 27,
            height: 27,
          }}
          animate={{
            x: checked ? 20 : 0,
          }}
          transition={{
            type: "spring",
            stiffness: 700,
            damping: 30,
            mass: 0.5,
          }}
        />
      </motion.div>
    </button>
  );
}
