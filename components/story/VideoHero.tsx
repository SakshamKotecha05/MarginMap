"use client";

const F = "'Inter', ui-sans-serif, system-ui, sans-serif";

export default function VideoHero() {
  return (
    <section
      style={{
        position: "relative",
        height: "100vh",
        overflow: "hidden",
        background: "#050505",
      }}
    >
      {/* Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        preload="none"
        src="/coin-video.mp4"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Gradient for text legibility */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(5,5,5,0.35)",
          pointerEvents: "none",
        }}
      />

      {/* Hero copy — centered */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 clamp(1.5rem, 6vw, 5rem)",
        }}
      >
        <p
          style={{
            fontFamily: F,
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
            marginBottom: "0.85rem",
          }}
        >
          Mosaic Wellness · Product Portfolio Intelligence
        </p>

        <h1
          style={{
            fontFamily: F,
            fontSize: "clamp(2.4rem, 6vw, 5rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#FFFFFF",
            letterSpacing: "-0.02em",
            marginBottom: "1rem",
          }}
        >
          Portfolio Decoded.
        </h1>

        <p
          style={{
            fontFamily: F,
            fontSize: "clamp(13px, 1.5vw, 15px)",
            fontWeight: 400,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.01em",
            lineHeight: 1.6,
          }}
        >
          600 SKUs &nbsp;·&nbsp; 5 channels &nbsp;·&nbsp; 3 brands &nbsp;·&nbsp; every margin gap surfaced
        </p>
      </div>

      {/* Scroll hint */}
      <div
        style={{
          position: "absolute",
          bottom: "1.75rem",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "5px",
          color: "rgba(255,255,255,0.28)",
          fontFamily: F,
          fontSize: "10px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
        }}
      >
        <span>scroll</span>
        <svg
          className="story-scroll-hint"
          width="13"
          height="13"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </section>
  );
}
