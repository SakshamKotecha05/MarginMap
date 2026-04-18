"use client";

import { useRef, useEffect } from "react";
import type { BeatId } from "@/app/page";

// ── Each beat maps to the frame where the coin is resting on that step ────────
// Tweak these if the coin looks mid-air on a particular beat.
const BEAT_FRAMES: Record<BeatId | "null", number> = {
  null:   0,
  beat1:  28,
  beat2:  56,
  beat3:  85,
  beat4:  113,
  beat5:  142,
  beat6:  170,
  beat6b: 200,
  beat7:  235,
};

interface CoinClimbCanvasProps {
  totalFrames: number;
  activeBeat:  BeatId | null;
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number
) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const drawW = img.naturalWidth * scale;
  const drawH = img.naturalHeight * scale;
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);
}

export default function CoinClimbCanvas({ totalFrames, activeBeat }: CoinClimbCanvasProps) {
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const imagesRef      = useRef<HTMLImageElement[]>([]);
  const ctxRef         = useRef<CanvasRenderingContext2D | null>(null);
  const cssSizeRef     = useRef({ w: 0, h: 0 });
  const currentFrameRef = useRef(0);
  const animRafRef     = useRef<number | null>(null);

  // ── Canvas setup + image preload ─────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function setupCanvas() {
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const w   = canvas.offsetWidth;
      const h   = canvas.offsetHeight;
      canvas.width  = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctxRef.current     = ctx;
      cssSizeRef.current = { w, h };
    }

    setupCanvas();
    const ro = new ResizeObserver(setupCanvas);
    ro.observe(canvas);

    const images: HTMLImageElement[] = new Array(totalFrames);
    imagesRef.current = images;

    function makeImg(i: number) {
      const img = new Image();
      img.src = `/coin-frames/ezgif-frame-${String(i + 1).padStart(3, "0")}.jpg`;
      images[i] = img;
      return img;
    }

    // Priority 1: frame 0 drawn immediately
    const first = makeImg(0);
    const drawFirst = () => {
      const ctx = ctxRef.current;
      if (!ctx || !first.naturalWidth) return;
      const { w, h } = cssSizeRef.current;
      drawCover(ctx, first, w, h);
    };
    if (typeof first.decode === "function") {
      first.decode().then(drawFirst).catch(() => { first.onload = drawFirst; });
    } else {
      first.onload = drawFirst;
    }

    // Priority 2: first 30 frames pre-decoded
    for (let i = 1; i < Math.min(30, totalFrames); i++) {
      makeImg(i).decode?.().catch(() => {});
    }

    // Priority 3: rest in two batches
    setTimeout(() => { for (let i = 30; i < Math.min(120, totalFrames); i++) makeImg(i); }, 200);
    setTimeout(() => { for (let i = 120; i < totalFrames; i++) makeImg(i); }, 600);

    return () => {
      ro.disconnect();
      if (animRafRef.current !== null) cancelAnimationFrame(animRafRef.current);
    };
  }, [totalFrames]);

  // ── Frame draw helper ─────────────────────────────────────────────────────────
  function drawFrame(idx: number) {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const img = imagesRef.current[idx];
    if (!img?.complete || !img.naturalWidth) return;
    const { w, h } = cssSizeRef.current;
    drawCover(ctx, img, w, h);
  }

  // ── Animate to target frame when beat changes ─────────────────────────────────
  useEffect(() => {
    const target = BEAT_FRAMES[activeBeat ?? "null"] ?? 0;

    // Cancel any in-progress animation
    if (animRafRef.current !== null) {
      cancelAnimationFrame(animRafRef.current);
      animRafRef.current = null;
    }

    // Play frames from current position to target at 30fps
    const FPS      = 30;
    const INTERVAL = 1000 / FPS;
    let lastTime   = 0;

    function loop(timestamp: number) {
      if (timestamp - lastTime >= INTERVAL) {
        lastTime = timestamp;
        const current = currentFrameRef.current;
        if (current === target) return;
        const next = current < target ? current + 1 : current - 1;
        currentFrameRef.current = next;
        drawFrame(next);
        if (next !== target) {
          animRafRef.current = requestAnimationFrame(loop);
        }
      } else {
        animRafRef.current = requestAnimationFrame(loop);
      }
    }

    animRafRef.current = requestAnimationFrame(loop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBeat]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
