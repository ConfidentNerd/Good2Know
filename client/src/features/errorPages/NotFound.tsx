import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";


const NotFound = () => {
  const navigate = useNavigate();
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 });
  const [spark, setSpark] = useState<{ x: number; y: number; id: number } | null>(null);

  const tips = useMemo(
    () => [
      "This page took a wrong turn at /dev/null.",
      "We checked the cache. We checked the logs. We checked under the couch.",
      "If this was a feature, it would be behind a flag.",
      "Even the monkeys in a trench coat couldn’t find it.",
      "404: The route is imaginary, but your suffering is real.",
    ],
    [],
  );

  const [tip] = useState(() => tips[Math.floor(Math.random() * tips.length)]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setPos({ x, y });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const onClickSpark = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSpark({ x, y, id: Date.now() });
    window.setTimeout(() => setSpark(null), 650);
  };

  const goHome = () => navigate("/", { replace: true });
  const goBack = () => navigate(-1);

  const glowX = `${Math.round(pos.x * 100)}%`;
  const glowY = `${Math.round(pos.y * 100)}%`;

  return (
    <div
      onClick={onClickSpark}
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 28,
        color: "#e2e8f0",
        background:
          `radial-gradient(900px 650px at ${glowX} ${glowY}, rgba(56,189,248,0.18), transparent 60%),` +
          `radial-gradient(700px 520px at ${Math.round((1 - pos.x) * 100)}% ${Math.round(pos.y * 100)}%, rgba(99,102,241,0.18), transparent 62%),` +
          `linear-gradient(180deg, #0b1220 0%, #060a14 65%, #05060b 100%)`,
        overflow: "hidden",
        position: "relative",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji"',
      }}
      aria-label="Not Found Page"
    >
      {/* Soft grid */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.08) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(60% 60% at 50% 45%, black 35%, transparent 70%)",
          opacity: 0.7,
          pointerEvents: "none",
        }}
      />

      {/* Floating dots */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {Array.from({ length: 18 }).map((_, i) => {
          const left = (i * 73) % 100;
          const top = (i * 41) % 100;
          const size = 2 + (i % 3);
          const delay = (i % 6) * 0.35;
          const dur = 5 + (i % 7);
          return (
            <span
              key={i}
              style={{
                position: "absolute",
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                borderRadius: 999,
                background: "rgba(226,232,240,0.28)",
                boxShadow: "0 0 0 6px rgba(56,189,248,0.04)",
                transform: "translateZ(0)",
                animation: `nf-float ${dur}s ease-in-out ${delay}s infinite`,
              }}
            />
          );
        })}
      </div>

      {/* Click spark */}
      {spark && (
        <div
          key={spark.id}
          aria-hidden
          style={{
            position: "absolute",
            left: `${spark.x}%`,
            top: `${spark.y}%`,
            width: 12,
            height: 12,
            borderRadius: 999,
            transform: "translate(-50%, -50%)",
            background: "rgba(56,189,248,0.95)",
            boxShadow:
              "0 0 0 0 rgba(56,189,248,0.35), 0 0 40px rgba(99,102,241,0.35), 0 0 120px rgba(56,189,248,0.12)",
            animation: "nf-pop 650ms ease-out forwards",
          }}
        />
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 860,
          display: "grid",
          gridTemplateColumns: "1fr",
          justifyItems: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 860,
            borderRadius: 28,
            padding: 28,
            position: "relative",
            border: "1px solid rgba(148,163,184,0.18)",
            background: "rgba(2,6,23,0.42)",
            boxShadow: "0 22px 80px rgba(0,0,0,0.38)",
            backdropFilter: "blur(10px)",
            overflow: "hidden",
            minHeight: 460,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -2,
              background:
                `radial-gradient(700px 420px at ${glowX} ${glowY}, rgba(56,189,248,0.20), transparent 58%),` +
                `radial-gradient(620px 380px at 40% 65%, rgba(99,102,241,0.18), transparent 62%)`,
              opacity: 0.9,
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", width: "100%", maxWidth: 720 }}>
            <div
              style={{
                fontSize: 150,
                lineHeight: 0.95,
                fontWeight: 1000,
                letterSpacing: -7,
                margin: 0,
                color: "rgba(248,250,252,0.96)",
                textShadow: "0 22px 90px rgba(56,189,248,0.18)",
              }}
            >
              404
            </div>

            <div
              style={{
                marginTop: 14,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(2,6,23,0.55)",
                color: "rgba(226,232,240,0.82)",
                fontSize: 13,
                fontWeight: 900,
              }}
            >
              <span aria-hidden style={{ filter: "drop-shadow(0 10px 20px rgba(56,189,248,0.25))" }}>
                🧭
              </span>
              Lost in routing space-time
            </div>

            <div
              style={{
                marginTop: 14,
                fontSize: 15,
                color: "rgba(226,232,240,0.74)",
                lineHeight: 1.75,
                maxWidth: 620,
                marginInline: "auto",
              }}
            >
              {tip}
              <div style={{ marginTop: 8 }}>
                Pro tip: hit <b style={{ color: "#f8fafc" }}>Take me home</b> before the monkeys find your cookies.
              </div>
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                onClick={() => goHome()}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: 16,
                  padding: "12px 16px",
                  fontWeight: 900,
                  color: "#06111f",
                  background: "linear-gradient(90deg, rgba(56,189,248,1) 0%, rgba(99,102,241,1) 100%)",
                  boxShadow: "0 14px 40px rgba(56,189,248,0.18)",
                }}
              >
                Take me home
              </button>

              <button
                onClick={() => goBack()}
                style={{
                  borderRadius: 16,
                  padding: "12px 16px",
                  fontWeight: 900,
                  cursor: "pointer",
                  background: "rgba(255,255,255,0.03)",
                  color: "#e2e8f0",
                  border: "1px solid rgba(148,163,184,0.22)",
                }}
              >
                Go back
              </button>
            </div>

            {/* Small “terminal” */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                marginTop: 20,
                borderRadius: 20,
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(2,6,23,0.72)",
                padding: 14,
                fontFamily:
                  'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                color: "rgba(226,232,240,0.78)",
                fontSize: 13,
                overflow: "hidden",
                textAlign: "left",
                maxWidth: 760,
                marginInline: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span
                  aria-hidden
                  style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(248,113,113,0.85)" }}
                />
                <span
                  aria-hidden
                  style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(251,191,36,0.85)" }}
                />
                <span
                  aria-hidden
                  style={{ width: 10, height: 10, borderRadius: 999, background: "rgba(34,197,94,0.85)" }}
                />
                <span style={{ marginLeft: "auto", opacity: 0.75 }}>routing-shell</span>
              </div>
              <div style={{ opacity: 0.92 }}>
                <span style={{ color: "rgba(56,189,248,0.95)" }}>$</span> GET /this-route-does-not-exist
              </div>
              <div style={{ marginTop: 6, opacity: 0.92 }}>
                <span style={{ color: "rgba(248,113,113,0.95)" }}>error</span>: route_not_found
              </div>
              <div style={{ marginTop: 6, opacity: 0.82 }}>
                suggestion: try <span style={{ color: "rgba(99,102,241,0.95)" }}>/</span> or go back one step
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Mobile fixes are HERE */}
      <style>{`
        @keyframes nf-float {
          0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.35; }
          50% { transform: translate3d(0, -10px, 0); opacity: 0.75; }
        }
        @keyframes nf-pop {
          0% { transform: translate(-50%, -50%) scale(0.6); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(15); opacity: 0; }
        }

        /* Phones */
        @media (max-width: 520px) {
          [aria-label="Not Found Page"] {
            padding: 16px !important;
          }

          /* card */
          [aria-label="Not Found Page"] > div > div {
            max-width: 100% !important;
          }

          /* inner card padding + height */
          [aria-label="Not Found Page"] > div > div > div {
            padding: 18px !important;
            min-height: auto !important;
          }

          /* 404 size */
          [aria-label="Not Found Page"] div[style*="font-size: 150px"] {
            font-size: 96px !important;
            letter-spacing: -4px !important;
          }

          /* tip text */
          [aria-label="Not Found Page"] div[style*="font-size: 15px"] {
            font-size: 14px !important;
          }

          /* buttons stack nicer */
          [aria-label="Not Found Page"] button {
            width: 100% !important;
            max-width: 340px !important;
          }

          /* terminal becomes fluid */
          [aria-label="Not Found Page"] div[style*="routing-shell"] {
            font-size: 12px !important;
          }
        }

        /* Small tablets */
        @media (max-width: 780px) {
          [aria-label="Not Found Page"] {
            padding: 20px !important;
          }
          [aria-label="Not Found Page"] div[style*="font-size: 150px"] {
            font-size: 120px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default NotFound;