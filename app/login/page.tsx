"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Constellation canvas background
function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const DOT_COUNT = 80;
    const MAX_DIST = 140;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const dots = Array.from({ length: DOT_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 2 + 1,
    }));

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0 || d.x > canvas.width) d.vx *= -1;
        if (d.y < 0 || d.y > canvas.height) d.vy *= -1;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,255,249,0.6)";
        ctx.fill();
      }

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(0,180,180,${0.18 * (1 - dist / MAX_DIST)})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ background: "#050810" }}
    />
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "Login failed");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ConstellationCanvas />

      <div className="relative z-10 w-full max-w-sm px-4 flex flex-col items-center gap-6">

        {/* Logo + branding */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#0d1120] border border-[#1e3a4a] flex items-center justify-center shadow-lg shadow-[#00fff9]/10">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="4" fill="#00fff9" opacity="0.9" />
              <circle cx="12" cy="12" r="8" stroke="#00fff9" strokeWidth="1.2" opacity="0.35" />
              <circle cx="12" cy="12" r="11.2" stroke="#00fff9" strokeWidth="0.8" opacity="0.15" />
              <line x1="12" y1="4" x2="12" y2="1"  stroke="#00fff9" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
              <line x1="12" y1="20" x2="12" y2="23" stroke="#00fff9" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
              <line x1="4"  y1="12" x2="1"  y2="12" stroke="#00fff9" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
              <line x1="20" y1="12" x2="23" y2="12" stroke="#00fff9" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Pitch Black</p>
            <p className="text-[#00fff9] text-[10px] font-semibold tracking-[0.2em] uppercase">Google Ads Dashboard</p>
          </div>
        </div>

        <p className="text-[#6b7280] text-sm">Sign in to your workspace</p>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-[#1e2a44] bg-[#0d1120]/80 backdrop-blur-md p-8 flex flex-col gap-5 shadow-2xl"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-widest text-[#8b93b0] uppercase">
              Username
            </label>
            <input
              type="text"
              autoComplete="username"
              placeholder="Your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-lg border border-[#1e2a44] bg-[#141a2e] px-4 py-3 text-sm text-white placeholder-[#3a4060] outline-none focus:border-[#00fff9]/40 focus:ring-1 focus:ring-[#00fff9]/20 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold tracking-widest text-[#8b93b0] uppercase">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-[#1e2a44] bg-[#141a2e] px-4 py-3 text-sm text-white placeholder-[#3a4060] outline-none focus:border-[#00fff9]/40 focus:ring-1 focus:ring-[#00fff9]/20 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-[#ea4335] bg-red-950/30 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-lg bg-[#00fff9]/10 border border-[#00fff9]/30 text-[#00fff9] py-3 text-xs font-bold tracking-[0.2em] uppercase hover:bg-[#00fff9]/20 hover:border-[#00fff9]/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Access Dashboard"}
          </button>
        </form>

        <p className="text-[#2e3550] text-[11px] tracking-widest uppercase">
          Pitch Black © 2026
        </p>
      </div>
    </div>
  );
}
