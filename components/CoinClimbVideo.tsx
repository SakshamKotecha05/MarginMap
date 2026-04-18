"use client";

import { useEffect, useRef } from "react";

type BeatId = "beat1" | "beat2" | "beat3" | "beat4" | "beat5" | "beat6" | "beat6b" | "beat7";

const BEAT_TIMES: Record<BeatId | "null", number> = {
  null:   0,
  beat1:  1.4,
  beat2:  2.0,
  beat3:  2.75,
  beat4:  3.3,
  beat5:  5.3,
  beat6:  8.0,
  beat6b: 8.0,
  beat7:  8.0,

};

interface CoinClimbVideoProps {
  activeBeat: BeatId | null;
}

export default function CoinClimbVideo({ activeBeat }: CoinClimbVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingTargetRef = useRef<number | null>(null);
  const metadataReadyRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const cancelLoop = () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };

    const snapToTarget = (target: number) => {
      cancelLoop();
      pendingTargetRef.current = target;

      const applySeek = () => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = target;
        videoRef.current.pause();
        pendingTargetRef.current = null;
      };

      if (!metadataReadyRef.current || Number.isNaN(video.duration) || !video.duration) {
        if (video.readyState >= 1) {
          metadataReadyRef.current = true;
          applySeek();
        } else {
          const onLoadedMetadata = () => {
            metadataReadyRef.current = true;
            video.removeEventListener("loadedmetadata", onLoadedMetadata);
            applySeek();
          };
          video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
        }
        return;
      }

      applySeek();
    };

    const playToTarget = (target: number) => {
      cancelLoop();
      pendingTargetRef.current = target;

      const step = () => {
        const currentVideo = videoRef.current;
        if (!currentVideo) return;

        if (currentVideo.currentTime >= target) {
          currentVideo.pause();
          currentVideo.currentTime = target;
          pendingTargetRef.current = null;
          rafRef.current = null;
          return;
        }

        rafRef.current = requestAnimationFrame(step);
      };

      const startPlayback = async () => {
        try {
          currentVideoPlaySetup(video);
          await video.play();
        } catch {
          snapToTarget(target);
          return;
        }

        rafRef.current = requestAnimationFrame(step);
      };

      if (!metadataReadyRef.current || video.readyState < 1) {
        const onLoadedMetadata = () => {
          metadataReadyRef.current = true;
          video.removeEventListener("loadedmetadata", onLoadedMetadata);
          void startPlayback();
        };
        video.addEventListener("loadedmetadata", onLoadedMetadata, { once: true });
        return;
      }

      void startPlayback();
    };

    const currentTime = video.currentTime || 0;
    const target = BEAT_TIMES[activeBeat ?? "null"];

    if (target <= currentTime) {
      snapToTarget(target);
    } else {
      playToTarget(target);
    }

    return () => {
      cancelLoop();
    };
  }, [activeBeat]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src="/coin-video.mp4"
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }}
    />
  );
}

function currentVideoPlaySetup(video: HTMLVideoElement) {
  video.muted = true;
  video.playsInline = true;
}
