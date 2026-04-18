"use client";
import VideoHero from "@/components/story/VideoHero";
import BeatsCarousel from "@/components/story/BeatsCarousel";

export default function HomePage() {
  return (
    <div style={{ background: "var(--story-bg)", marginTop: "-56px" }}>
      <VideoHero />
      <BeatsCarousel />
    </div>
  );
}
