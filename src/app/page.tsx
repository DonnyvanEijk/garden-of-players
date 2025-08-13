"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  PauseCircle,
  PlayCircle,
  SkipBack,
  SkipForward,
  RotateCcw,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import { useIsMobile } from "@/hooks/useIsMobile";

type Track = { title: string; file: string; cover: string; duration?: number };

export default function HomePage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLooping, setIsLooping] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);
  const [volume, setVolume] = useState(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("player-volume");
      return cached ? Number(cached) : 0.5;
    }
    return 0.5;
  });

  const audioRef = useRef<HTMLAudioElement>(null);
  const volumeTimeout = useRef<NodeJS.Timeout | null>(null);
  const failedCovers = useRef<Set<string>>(new Set());
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef<number>(null);

  // Audio visualizer refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const isMobile = useIsMobile();


  const currentTrack = tracks[currentIndex];

  useEffect(() => {
    fetch("/api/songs")
      .then((res) => res.json())
      .then((data) => setTracks(data));
  }, []);

  useEffect(() => {
    if (!isSeeking) setSeekValue(currentTime);
  }, [currentTime, isSeeking]);

  useEffect(() => {
    if (volumeTimeout.current) clearTimeout(volumeTimeout.current);
    volumeTimeout.current = setTimeout(() => {
      localStorage.setItem("player-volume", String(volume));
    }, 2000);
    return () => {
      if (volumeTimeout.current) clearTimeout(volumeTimeout.current);
    };
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration || 0);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
    };
  }, [currentTrack, volume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.load();

      if (isPlaying) {
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      }
    }
  }, [currentTrack]);

  const animate = () => {
    if (isPlaying) {
      setRotation((prev) => prev + 0.5);
      drawVisualizer();
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      setupVisualizer();
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSeeking(true);
    setSeekValue(Number(e.target.value));
  };

  const handleSeekCommit = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = seekValue;
      setCurrentTime(seekValue);
    }
    setIsSeeking(false);
  };

   const handleTrackClick = useCallback((index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatSongTitle = (title: string) => {
    const match = title.match(/^(\d+)_(.+)$/);
    if (match) {
      return {
        number: match[1],
        name: match[2].replace(/_/g, " "),
      };
    }
    return {
      number: null,
      name: title.replace(/_/g, " "),
    };
  };

  const skipForward = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % tracks.length);
    setIsPlaying(true);
  }, [tracks.length]);

  const skipBack = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
    setIsPlaying(true);
  }, [tracks.length]);

  const handleEnded = useCallback(() => {
    if (isLooping) {
      audioRef.current?.play();
    } else {
      skipForward();
    }
  }, [isLooping, skipForward]);

  // Audio visualizer setup
const setupVisualizer = () => {
  if (!audioRef.current) return;

  if (!audioCtxRef.current) {
    //@ts-expect-error works in browsers
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
  }

  const audioCtx = audioCtxRef.current;

  if (!sourceRef.current) {
    sourceRef.current = audioCtx.createMediaElementSource(audioRef.current);

    // Only connect once
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    sourceRef.current.connect(analyser);
    analyser.connect(audioCtx.destination);

    analyserRef.current = analyser;
    dataArrayRef.current = dataArray;
  }
};



  // Drawing the spiky visualizer around the circle
  const drawVisualizer = () => {
    if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const dataArray = dataArrayRef.current;

    //@ts-expect-error it still works
    analyser.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = isMobile ? 100 : 120;
    const bars = dataArray.length;

    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2;
      const scale = isMobile ? 0.5 : 1;
    const barHeight = (dataArray[i] / 255) * (80 * scale) + (20 * scale);

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);

      ctx.strokeStyle = "#ffcc80";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  };

   const currentSongTitle = currentTrack ? formatSongTitle(currentTrack.title).name : "";

  if (tracks.length === 0) {
    return <div className="text-white p-10">Loading songs...</div>;
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-[#ff6f00] via-[#ff9800] to-[#d84315] text-white p-6">
      <nav className="flex items-center gap-3 px-6 py-4 bg-black rounded-xl bg-opacity-40  top-0 left-10 z-50 shadow-md">
   
        <h1 className="text-xl font-bold select-none text-center">Garden of Beats<br/>(VS ADAR)</h1>
      </nav>
      <div className="relative mt-20 mb-20">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        />
        <div
          className={` ${isMobile ? 'w-45 h-45' : "w-64 h-64" }  rounded-full border-8 border-[#ff9800] shadow-lg overflow-hidden flex items-center justify-center bg-black`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isPlaying ? "none" : "transform 0.3s ease-out",
          }}
        >
          {currentTrack?.cover && !failedCovers.current.has(currentTrack.cover) ? (
            <Image
              src={currentTrack.cover}
              alt={currentTrack.title}
              width={ isMobile ? 150 : 220}
              height={isMobile ? 150 : 220}
              className="rounded-full object-cover"
              onError={() => {
                failedCovers.current.add(currentTrack.cover);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-full bg-black">
              <span className="text-[#ff9800] text-4xl font-bold">🎵</span>
              <span className="text-white mt-2 text-sm">No Cover Available</span>
            </div>
          )}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={currentTrack.file}
        loop={isLooping}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        style={{ display: "none" }}
      />

       <h2 className="text-2xl font-bold text-white truncate">
          {currentSongTitle}
        </h2>
        <p>By GreenBean</p>

      {/* Controls */}
      <div className="flex gap-6 mt-8 items-center">
        <button
          onClick={skipBack}
          className="p-3 rounded-full bg-[#ffcc80] hover:bg-[#ff9800] transition-colors cursor-pointer"
        >
          <SkipBack size={28} className="text-[#d84315]" />
        </button>
        <button
          onClick={togglePlay}
          className="p-4 rounded-full bg-[#ff9800] hover:bg-[#ff6f00] transition-colors cursor-pointer"
        >
          {isPlaying ? (
            <PauseCircle size={32} className="text-[#d84315]" />
          ) : (
            <PlayCircle size={32} className="text-[#d84315]" />
          )}
        </button>
        <button
          onClick={skipForward}
          className="p-3 rounded-full bg-[#ffcc80] hover:bg-[#ff9800] transition-colors cursor-pointer"
        >
          <SkipForward size={28} className="text-[#d84315]" />
        </button>
        <button
          onClick={() => setIsLooping((l) => !l)}
          className={`p-3 rounded-full transition-colors cursor-pointer ${
            isLooping
              ? "bg-[#d84315]"
              : "bg-[#ffcc80] hover:bg-[#ff9800]"
          }`}
        >
          <RotateCcw size={28} className="text-white" />
        </button>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mt-6 w-64">
        <span className="text-xs text-white font-mono w-10 text-right">
          {formatTime(isSeeking ? seekValue : currentTime)}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.01}
          value={isSeeking ? seekValue : currentTime}
          onChange={handleSeekChange}
          onMouseUp={handleSeekCommit}
          onTouchEnd={handleSeekCommit}
          className="w-full accent-[#ff9800]"
        />
        <span className="text-xs text-white font-mono w-10 text-left">
          {formatTime(duration)}
        </span>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mt-6 w-64">
        <Volume2 size={24} className="text-[#ffcc80]" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="w-full accent-[#ff9800]"
        />
        <span className="text-sm text-white font-mono w-10 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Queue */}
     <div className="mt-10 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4 text-white">Queue</h2>
        <ul
          className="
      space-y-2 
      max-h-96 
      overflow-y-auto 
      px-5
      scrollbar-thin scrollbar-thumb-[#ff9800] scrollbar-track-[#d84315]
      sm:max-h-80
    "
        >
          {tracks.map((track, idx) => {
            const { number, name } = formatSongTitle(track.title);
            const isActive = idx === currentIndex;

            return (
              <li
                key={idx}
                onClick={() => handleTrackClick(idx)}
                className={`
            p-3 rounded-md flex items-center justify-between transition-all duration-200
            ${
              isActive
                ? "bg-[#ffcc80] text-[#d84315] font-bold scale-[1.05] shadow-lg shadow-[#ff9800]/50 border-2 border-[#ff9800]"
                : "bg-[#d84315] text-white hover:bg-[#ff5722] cursor-pointer"
            }
          `}
              >
                <div className="flex items-center gap-3 flex-1">
                  {number && (
                    <span
                      className={`font-bold text-lg min-w-[2rem] ${
                        isActive ? "text-[#ff5722]" : ""
                      }`}
                    >
                      {number}
                    </span>
                  )}
                  <span
                    className={`flex-1 text-center truncate ${
                      isActive ? "text-[#bf360c]" : ""
                    }`}
                  >
                    {name}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
