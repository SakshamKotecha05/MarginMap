"use client";
import VideoHero from "@/components/story/VideoHero";
import BeatsCarousel from "@/components/story/BeatsCarousel";

export type BeatId = "beat1" | "beat2" | "beat3" | "beat4" | "beat5" | "beat6" | "beat6b" | "beat7";

export default function HomePage() {
  return (
    <div style={{ background: "var(--story-bg)", marginTop: "-56px" }}>
      <VideoHero />
      <BeatsCarousel />
    </div>
  );
}
