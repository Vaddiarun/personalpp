"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getAgency } from "@/lib/agency";
import type { RecipientView } from "@/lib/types";

type Phase = "loading" | "intro" | "sharing" | "done" | "declined" | "error" | "closed";

const agency = getAgency();

/* ------------------------------------------------------------------ *
 *  Scoped design system + animation keyframes for the hero experience
 *  (namespaced with `sv-` so nothing here leaks into the investigator app)
 * ------------------------------------------------------------------ */
const STYLES = `
.sv-root{
  --mx:0; --my:0; --sc:0;
  position:relative; min-height:100vh; width:100%;
  background:#070d1c; color:#eef2ff; overflow-x:clip;
  font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Inter,sans-serif;
}
.sv-root *{ box-sizing:border-box; }

/* ---------- atmospheric background ---------- */
.sv-atmos{ position:fixed; inset:0; z-index:0; overflow:hidden; animation:svFade 1.1s ease both; }
.sv-atmos-grad{
  position:absolute; inset:0;
  background:
    radial-gradient(1200px 700px at 78% 8%, rgba(47,107,255,.28), transparent 60%),
    radial-gradient(900px 600px at 12% 90%, rgba(34,211,238,.14), transparent 60%),
    linear-gradient(180deg,#0a1330 0%,#070c1c 55%,#050a18 100%);
}
.sv-atmos-blob{ position:absolute; border-radius:50%; filter:blur(90px); opacity:.5; }
.sv-b1{ width:520px; height:520px; left:-120px; top:-140px; background:rgba(59,130,246,.42);
  transform:translate3d(calc(var(--mx)*-18px),calc(var(--my)*-14px),0); }
.sv-b2{ width:460px; height:460px; right:-120px; bottom:-160px; background:rgba(14,165,233,.30);
  transform:translate3d(calc(var(--mx)*22px),calc(var(--my)*16px),0); }
.sv-grid{
  position:absolute; inset:-40% -10% -10%; opacity:.20;
  background-image:linear-gradient(rgba(120,160,255,.35) 1px,transparent 1px),
    linear-gradient(90deg,rgba(120,160,255,.35) 1px,transparent 1px);
  background-size:64px 64px;
  transform:perspective(760px) rotateX(64deg) translateY(calc(var(--sc)*-60px));
  -webkit-mask-image:radial-gradient(60% 60% at 50% 30%,#000 0%,transparent 78%);
  mask-image:radial-gradient(60% 60% at 50% 30%,#000 0%,transparent 78%);
}
.sv-particles{ position:absolute; inset:0; }
.sv-particle{ position:absolute; width:4px; height:4px; border-radius:50%;
  background:rgba(180,210,255,.9); box-shadow:0 0 10px 2px rgba(120,170,255,.6);
  animation:svDrift linear infinite; }

/* ---------- shell ---------- */
.sv-shell{ position:relative; z-index:2; max-width:1280px; margin:0 auto; padding:0 clamp(18px,4vw,44px); }

/* ---------- nav ---------- */
.sv-nav{ display:flex; align-items:center; justify-content:space-between; gap:20px;
  padding:22px 0 8px; animation:svRise .7s ease both; }
.sv-brand{ display:flex; align-items:center; gap:11px; font-weight:650; letter-spacing:-.01em; }
.sv-brand-mark{ display:grid; place-items:center; width:36px; height:36px; border-radius:11px;
  background:linear-gradient(150deg,#3b82f6,#22d3ee); color:#04102b; font-size:18px;
  box-shadow:0 8px 22px -6px rgba(59,130,246,.6), inset 0 1px 0 rgba(255,255,255,.35); }
.sv-brand small{ display:block; font-weight:450; font-size:11px; color:#8aa0cc; letter-spacing:.02em; }
.sv-navlinks{ display:flex; align-items:center; gap:8px; }
.sv-navlink{ padding:8px 14px; border-radius:999px; font-size:13px; color:#b9c7ea;
  text-decoration:none; transition:background .2s,color .2s; white-space:nowrap; }
.sv-navlink:hover{ background:rgba(255,255,255,.06); color:#fff; }
.sv-navlink.is-live{ color:#8ff0d6; }
.sv-navdot{ display:inline-block; width:7px; height:7px; border-radius:50%; margin-right:7px;
  background:#34d399; box-shadow:0 0 0 0 rgba(52,211,153,.6); animation:svRingBeat 2.4s ease-out infinite; vertical-align:middle; }

/* ---------- hero layout ---------- */
.sv-hero{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);
  gap:clamp(24px,4vw,56px); align-items:center; min-height:calc(100vh - 92px);
  padding:24px 0 60px; }
.sv-col-left{ position:relative; z-index:3; min-width:0; }
.sv-title,.sv-sub{ overflow-wrap:break-word; }
.sv-eyebrow{ display:inline-flex; align-items:center; gap:8px; padding:7px 13px; border-radius:999px;
  font-size:12px; font-weight:600; letter-spacing:.06em; text-transform:uppercase;
  color:#a9c6ff; background:rgba(59,130,246,.12); border:1px solid rgba(120,160,255,.25);
  animation:svRise .7s .05s ease both; }
.sv-title{ margin:20px 0 0; font-size:clamp(2.5rem,5.6vw,4.35rem); line-height:1.02;
  font-weight:720; letter-spacing:-.035em; }
.sv-title span{ display:block; background:linear-gradient(180deg,#ffffff,#a8c3ff);
  -webkit-background-clip:text; background-clip:text; color:transparent; }
.sv-title .l1{ animation:svRise .8s .12s ease both; }
.sv-title .l2{ animation:svRise .8s .22s ease both; }
.sv-sub{ margin:22px 0 0; max-width:30rem; font-size:clamp(1rem,1.25vw,1.15rem); line-height:1.65;
  color:#aebbdd; animation:svRise .8s .34s ease both; }
.sv-cta-row{ display:flex; flex-wrap:wrap; gap:14px; margin-top:34px; animation:svRise .8s .6s ease both; }
.sv-btn{ appearance:none; border:0; cursor:pointer; font:inherit; font-weight:650; font-size:15px;
  padding:16px 26px; border-radius:15px; transition:transform .18s,box-shadow .25s,background .2s; }
.sv-btn-primary{ color:#04102b; background:linear-gradient(150deg,#5b9bff,#22d3ee);
  box-shadow:0 18px 40px -12px rgba(59,130,246,.65), inset 0 1px 0 rgba(255,255,255,.45); }
.sv-btn-primary:hover{ transform:translateY(-2px); box-shadow:0 26px 52px -14px rgba(59,130,246,.8), inset 0 1px 0 rgba(255,255,255,.45); }
.sv-btn-ghost{ color:#cdd9f7; background:rgba(255,255,255,.04); border:1px solid rgba(160,185,240,.28); }
.sv-btn-ghost:hover{ background:rgba(255,255,255,.09); transform:translateY(-2px); }
.sv-fineprint{ margin-top:18px; font-size:12.5px; color:#7f92bd; animation:svFade 1s .8s ease both; }
.sv-verify{ margin-top:16px; max-width:30rem; padding:13px 15px; border-radius:13px; font-size:12.5px; line-height:1.55;
  color:#ffdca8; background:rgba(245,158,11,.10); border:1px solid rgba(245,158,11,.28);
  animation:svRise .8s .5s ease both; }
.sv-verify a{ color:#ffe6bf; font-weight:700; }

/* ---------- status panel (non-intro phases) ---------- */
.sv-status{ position:relative; z-index:3; max-width:30rem; padding:26px; border-radius:20px;
  background:linear-gradient(165deg,rgba(20,32,64,.85),rgba(11,19,42,.85));
  border:1px solid rgba(130,165,240,.18); backdrop-filter:blur(14px);
  box-shadow:0 30px 70px -30px rgba(0,0,0,.7); animation:svPop .6s ease both; }
.sv-status h1{ margin:14px 0 6px; font-size:1.5rem; font-weight:680; letter-spacing:-.02em; }
.sv-status p{ color:#aebbdd; font-size:.95rem; line-height:1.6; }
.sv-status-ico{ display:grid; place-items:center; width:52px; height:52px; border-radius:16px; font-size:24px;
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); }
.sv-status-ico.ok{ background:rgba(52,211,153,.14); border-color:rgba(52,211,153,.35); color:#8ff0d6; }
.sv-live{ margin-top:18px; padding:16px; border-radius:14px; background:rgba(255,255,255,.04);
  border:1px solid rgba(160,185,240,.18); text-align:center; }
.sv-spinner{ width:34px; height:34px; border-radius:50%; border:3px solid rgba(160,185,240,.25);
  border-top-color:#5b9bff; animation:svSpin .9s linear infinite; }

/* ---------- 3D SCENE ---------- */
.sv-stage{ --ss:1; position:relative; z-index:2; min-height:560px; perspective:1400px;
  perspective-origin:60% 40%; transform-style:preserve-3d; }
.sv-scene{ position:absolute; inset:0; transform-style:preserve-3d;
  transform:
    translate3d(calc(var(--mx)*14px),calc(var(--my)*12px),0)
    rotateX(calc(var(--my)*-4deg)) rotateY(calc(var(--mx)*6deg))
    scale(calc((1 + var(--sc)*.06) * var(--ss))) translateY(calc(var(--sc)*-26px));
  transition:transform .18s ease-out; }
.sv-layer{ position:absolute; transform-style:preserve-3d; }

/* ground / map plane */
.sv-plane{
  left:50%; top:60%; width:640px; height:460px; margin-left:-320px;
  background:
    radial-gradient(closest-side,rgba(59,130,246,.22),transparent 75%),
    repeating-linear-gradient(0deg,rgba(140,180,255,.30) 0 1px,transparent 1px 44px),
    repeating-linear-gradient(90deg,rgba(140,180,255,.30) 0 1px,transparent 1px 44px);
  border-radius:24px;
  transform:translateZ(-160px) rotateX(66deg) translate3d(calc(var(--mx)*-26px),calc(var(--my)*-18px),0);
  -webkit-mask-image:radial-gradient(60% 60% at 50% 45%,#000,transparent 80%);
  mask-image:radial-gradient(60% 60% at 50% 45%,#000,transparent 80%);
  animation:svFade 1.1s .2s ease both;
}
.sv-route{ position:absolute; left:12%; top:78%; width:74%; height:2px;
  background:linear-gradient(90deg,transparent,#6fd0ff,transparent);
  box-shadow:0 0 12px rgba(111,208,255,.8); border-radius:2px; }

/* phone / device */
.sv-phone{
  left:50%; top:50%; width:270px; height:552px; margin:-286px 0 0 -135px;
  border-radius:44px; padding:12px;
  background:linear-gradient(160deg,#26375f,#0e172e 60%);
  border:1px solid rgba(150,180,255,.3);
  box-shadow:
    0 60px 120px -40px rgba(0,0,0,.75),
    0 0 0 1px rgba(255,255,255,.05) inset,
    0 30px 60px -20px rgba(47,107,255,.35);
  transform:translateZ(40px) rotateY(-20deg) rotateX(7deg);
  animation:svPhoneIn 1s .1s cubic-bezier(.2,.7,.2,1) both;
}
.sv-phone-screen{ position:relative; width:100%; height:100%; border-radius:33px; overflow:hidden;
  background:radial-gradient(120% 90% at 30% 10%,#12315f,#0a1730 60%);
  border:1px solid rgba(255,255,255,.06); }
.sv-phone-notch{ position:absolute; left:50%; top:12px; width:96px; height:22px; margin-left:-48px;
  border-radius:999px; background:#060c1c; z-index:5; }
.sv-phone-map{ position:absolute; inset:0;
  background-image:
    linear-gradient(rgba(120,160,255,.16) 1px,transparent 1px),
    linear-gradient(90deg,rgba(120,160,255,.16) 1px,transparent 1px);
  background-size:34px 34px; }
.sv-phone-blob{ position:absolute; border-radius:40% 60% 55% 45%;
  background:rgba(59,130,246,.20); filter:blur(2px); }
.sv-phone-hud{ position:absolute; left:14px; right:14px; bottom:16px; padding:13px 14px; border-radius:16px;
  background:linear-gradient(160deg,rgba(10,20,44,.82),rgba(10,20,44,.55));
  border:1px solid rgba(140,175,255,.24); backdrop-filter:blur(6px);
  font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
.sv-phone-hud .k{ font-size:9px; letter-spacing:.16em; color:#7f9ad0; text-transform:uppercase; }
.sv-phone-hud .v{ font-size:15px; color:#eaf1ff; margin-top:2px; }
.sv-phone-hud .row2{ display:flex; justify-content:space-between; gap:10px; margin-top:9px; }
.sv-phone-hud .s{ font-size:10px; color:#8ff0d6; }

/* scan line sweeping the phone screen */
.sv-scan{ position:absolute; left:0; right:0; height:120px; z-index:4;
  background:linear-gradient(180deg,transparent,rgba(111,208,255,.16),transparent);
  animation:svScan 3.6s ease-in-out infinite; }

/* location pin */
.sv-pin{
  left:50%; top:50%; margin:-250px 0 0 -26px; width:52px; height:52px;
  transform:translateZ(150px);
  animation:svPinIn 1s .5s cubic-bezier(.2,.7,.2,1) both;
}
.sv-pin-body{ position:relative; width:52px; height:52px; border-radius:50% 50% 50% 0;
  transform:rotate(-45deg);
  background:linear-gradient(150deg,#5b9bff,#2f6bff);
  box-shadow:0 18px 34px -8px rgba(47,107,255,.8), inset 0 2px 4px rgba(255,255,255,.5);
  animation:svPinBob 4s ease-in-out infinite; }
.sv-pin-body::after{ content:""; position:absolute; inset:15px; border-radius:50%;
  background:#eaf2ff; box-shadow:inset 0 -2px 4px rgba(47,107,255,.4); }
.sv-pin-glow{ position:absolute; left:50%; top:64px; width:120px; height:34px; margin-left:-60px;
  border-radius:50%; background:radial-gradient(closest-side,rgba(47,107,255,.55),transparent);
  filter:blur(4px); animation:svGlowPulse 4s ease-in-out infinite; }
.sv-pin-ring{ position:absolute; left:50%; top:26px; width:52px; height:52px; margin-left:-26px;
  border:2px solid rgba(111,208,255,.7); border-radius:50%;
  animation:svRingPulse 3s ease-out infinite; }
.sv-pin-ring.d{ animation-delay:1.5s; }

/* security shield */
.sv-shield{
  left:50%; top:50%; margin:66px 0 0 -338px; width:136px; height:158px;
  transform:translateZ(160px) rotateY(16deg);
  animation:svPop .8s .35s cubic-bezier(.2,.7,.2,1) both;
}
.sv-shield-body{ width:100%; height:100%;
  clip-path:polygon(50% 0,100% 16%,100% 60%,50% 100%,0 60%,0 16%);
  background:linear-gradient(155deg,rgba(34,211,238,.9),rgba(47,107,255,.9));
  box-shadow:0 24px 50px -14px rgba(34,211,238,.6), inset 0 2px 6px rgba(255,255,255,.5);
  display:grid; place-items:center;
  animation:svFloatSlow 6s ease-in-out infinite; }
.sv-shield-check{ width:44px; height:44px; }
.sv-shield-halo{ position:absolute; inset:-16px; border-radius:50%; filter:blur(18px);
  background:radial-gradient(closest-side,rgba(34,211,238,.5),transparent);
  animation:svGlowPulse 5s ease-in-out infinite; }

/* floating verification chips */
.sv-chip{ position:absolute; display:flex; align-items:center; gap:10px;
  padding:11px 14px; border-radius:14px; font-size:12.5px; color:#dfe8ff;
  background:linear-gradient(160deg,rgba(18,30,60,.9),rgba(11,19,42,.72));
  border:1px solid rgba(140,175,255,.26); backdrop-filter:blur(8px);
  box-shadow:0 24px 50px -22px rgba(0,0,0,.7); }
.sv-chip .ico{ display:grid; place-items:center; width:26px; height:26px; border-radius:8px;
  background:rgba(52,211,153,.16); color:#8ff0d6; font-size:13px; }
.sv-chip .ico.b{ background:rgba(59,130,246,.18); color:#9cc2ff; }
.sv-chip .mono{ font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; }
.sv-chip-coord{ left:-11%; bottom:5%; transform:translateZ(120px)
  translate3d(calc(var(--mx)*-24px),calc(var(--my)*-16px),0);
  animation:svChipIn .8s .62s ease both, svFloat 7s ease-in-out 1.5s infinite; }
.sv-chip-time{ left:-7%; top:38%; transform:translateZ(80px)
  translate3d(calc(var(--mx)*-18px),calc(var(--my)*14px),0);
  animation:svChipIn .8s .74s ease both, svFloat 8s ease-in-out 2s infinite; }
.sv-chip-acc{ right:-3%; bottom:1%; transform:translateZ(100px)
  translate3d(calc(var(--mx)*26px),calc(var(--my)*10px),0);
  animation:svChipIn .8s .86s ease both, svFloat 6.5s ease-in-out 1s infinite; }

/* holographic case panel */
.sv-holo{ position:absolute; right:-8%; top:2%; width:250px; padding:18px;
  border-radius:18px; transform:translateZ(130px) rotateY(-12deg)
    translate3d(calc(var(--mx)*30px),calc(var(--my)*18px),0);
  background:linear-gradient(165deg,rgba(16,28,58,.92),rgba(10,17,38,.7));
  border:1px solid rgba(120,200,255,.32);
  box-shadow:0 40px 80px -30px rgba(0,0,0,.8), 0 0 0 1px rgba(120,200,255,.08) inset,
    0 0 40px -10px rgba(34,211,238,.35);
  animation:svHoloIn 1s .55s cubic-bezier(.2,.7,.2,1) both; }
.sv-holo::before{ content:""; position:absolute; left:14px; right:14px; top:-1px; height:2px;
  background:linear-gradient(90deg,transparent,#6fd0ff,transparent); }
.sv-holo-h{ font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#7fd0ff; }
.sv-holo-row{ margin-top:12px; }
.sv-holo-row .k{ font-size:9.5px; letter-spacing:.14em; text-transform:uppercase; color:#7f93bd; }
.sv-holo-row .v{ font-size:13.5px; color:#eaf1ff; margin-top:2px; word-break:break-word; }
.sv-holo-row .v.mono{ font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace; letter-spacing:.02em; }

/* scroll-revealed detail section */
.sv-detail{ position:relative; z-index:2; padding:40px 0 90px; }
.sv-detail-grid{ display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:18px; }
.sv-detail-card{ padding:22px; border-radius:18px;
  background:linear-gradient(165deg,rgba(18,30,60,.6),rgba(11,19,42,.5));
  border:1px solid rgba(130,165,240,.16); }
.sv-detail-card h3{ margin:0 0 8px; font-size:1rem; font-weight:640; letter-spacing:-.01em; }
.sv-detail-card p,.sv-detail-card li{ color:#aebbdd; font-size:.9rem; line-height:1.6; }
.sv-detail-card ul{ margin:6px 0 0; padding-left:18px; }
.sv-scrollcue{ position:absolute; left:50%; bottom:22px; transform:translateX(-50%);
  display:flex; flex-direction:column; align-items:center; gap:6px; font-size:11px; letter-spacing:.14em;
  text-transform:uppercase; color:#6f82ad; opacity:calc(1 - var(--sc)*2); animation:svFade 1s 1.3s ease both; }
.sv-scrollcue span{ width:22px; height:34px; border:1.5px solid rgba(160,185,240,.4); border-radius:12px; position:relative; }
.sv-scrollcue span::after{ content:""; position:absolute; left:50%; top:7px; width:3px; height:7px; margin-left:-1.5px;
  border-radius:2px; background:#9cc2ff; animation:svWheel 1.8s ease-in-out infinite; }

.sv-footer{ position:relative; z-index:2; padding:0 0 40px; text-align:center; font-size:12px; color:#64769f; }

/* ---------- keyframes ---------- */
@keyframes svFade{ from{opacity:0} to{opacity:1} }
@keyframes svRise{ from{opacity:0; transform:translateY(26px)} to{opacity:1; transform:translateY(0)} }
@keyframes svPop{ from{opacity:0; transform:scale(.9)} to{opacity:1; transform:scale(1)} }
@keyframes svPhoneIn{ from{opacity:0; transform:translateZ(40px) rotateY(-20deg) rotateX(7deg) scale(.9)}
  to{opacity:1; transform:translateZ(40px) rotateY(-20deg) rotateX(7deg) scale(1)} }
@keyframes svPinIn{ from{opacity:0; transform:translateZ(150px) translateY(40px)}
  to{opacity:1; transform:translateZ(150px) translateY(0)} }
@keyframes svHoloIn{ from{opacity:0; transform:translateZ(130px) rotateY(-12deg) translateY(30px)}
  to{opacity:1; transform:translateZ(130px) rotateY(-12deg) translateY(0)} }
@keyframes svChipIn{ from{opacity:0; transform:translateY(24px)} to{opacity:1} }
@keyframes svFloat{ 0%,100%{margin-top:0} 50%{margin-top:-14px} }
@keyframes svFloatSlow{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }
@keyframes svPinBob{ 0%,100%{transform:rotate(-45deg) translateY(0)} 50%{transform:rotate(-45deg) translateY(-10px)} }
@keyframes svGlowPulse{ 0%,100%{opacity:.5; transform:scale(1)} 50%{opacity:.9; transform:scale(1.12)} }
@keyframes svRingPulse{ 0%{opacity:.7; transform:scale(.5)} 100%{opacity:0; transform:scale(2.1)} }
@keyframes svRingBeat{ 0%{box-shadow:0 0 0 0 rgba(52,211,153,.55)} 70%,100%{box-shadow:0 0 0 8px rgba(52,211,153,0)} }
@keyframes svDrift{ from{transform:translateY(10vh); opacity:0} 10%,90%{opacity:.9} to{transform:translateY(-110vh); opacity:0} }
@keyframes svSpin{ to{transform:rotate(360deg)} }
@keyframes svScan{ 0%{transform:translateY(-140px)} 100%{transform:translateY(560px)} }
@keyframes svWheel{ 0%,100%{opacity:0; transform:translateY(0)} 50%{opacity:1; transform:translateY(6px)} }

@media (max-width:960px){
  .sv-hero{ grid-template-columns:minmax(0,1fr); min-height:auto; padding-top:8px; }
  .sv-stage{ --ss:.92; margin-top:14px; min-height:540px; overflow:hidden;
    border-radius:28px; border:1px solid rgba(130,165,240,.14);
    background:linear-gradient(165deg,rgba(18,30,60,.4),rgba(11,19,42,.28)); }
  .sv-navlinks .sv-navlink:not(.is-live){ display:none; }
  .sv-holo{ right:4%; top:4%; width:220px; }
  .sv-chip-coord{ left:4%; bottom:5%; }
  .sv-chip-time{ left:4%; top:6%; }
  .sv-chip-acc{ right:4%; bottom:6%; }
  .sv-scrollcue{ display:none; }
}
@media (max-width:560px){
  .sv-shell{ padding:0 16px; }
  .sv-stage{ --ss:.66; min-height:400px; }
  .sv-nav{ padding:18px 0 4px; }
  .sv-brand small{ white-space:normal; }
  .sv-navlinks{ display:none; }
  .sv-title{ font-size:clamp(2.1rem,8.5vw,2.6rem); }
  .sv-holo{ display:none; }
  .sv-chip-acc{ display:none; }
  .sv-shield{ margin-left:-268px; }
  .sv-chip-coord{ left:2%; bottom:3%; transform:translateZ(0)
    translate3d(calc(var(--mx)*-24px),calc(var(--my)*-16px),0); }
  .sv-chip-time{ left:2%; top:3%; transform:translateZ(0)
    translate3d(calc(var(--mx)*-18px),calc(var(--my)*14px),0); }
}
@media (prefers-reduced-motion:reduce){
  .sv-root *{ animation-duration:.001ms !important; animation-iteration-count:1 !important;
    animation-delay:0ms !important; transition:none !important; }
  .sv-scene{ transform:none !important; }
}
`;

/* deterministic particle field (no hydration mismatch) */
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 61.8) % 100,
  size: 2 + ((i * 7) % 4),
  dur: 16 + ((i * 13) % 22),
  delay: -(i * 2.3),
  opacity: 0.3 + ((i * 17) % 50) / 100,
}));

function Atmosphere() {
  return (
    <div className="sv-atmos" aria-hidden>
      <div className="sv-atmos-grad" />
      <div className="sv-atmos-blob sv-b1" />
      <div className="sv-atmos-blob sv-b2" />
      <div className="sv-grid" />
      <div className="sv-particles">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="sv-particle"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDuration: `${p.dur}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function NavBar({ live }: { live: boolean }) {
  return (
    <nav className="sv-nav">
      <div className="sv-brand">
        <span className="sv-brand-mark">{agency.emblem}</span>
        <span>
          SecureVerify
          <small>{agency.name} · {agency.unit}</small>
        </span>
      </div>
      <div className="sv-navlinks">
        <a className={`sv-navlink is-live`} href="#status">
          <span className="sv-navdot" />
          {live ? "Live sharing" : "Verification status"}
        </a>
        <a className="sv-navlink" href="#security">Security</a>
        <a className="sv-navlink" href="#help">Help</a>
      </div>
    </nav>
  );
}

/** The hero 3D composition — pure CSS 3D, objects deliberately overflow the stage. */
function HeroScene({
  view,
  coords,
  now,
  active,
}: {
  view: RecipientView | null;
  coords: { lat: number; lng: number; acc: number } | null;
  now: string;
  active: boolean;
}) {
  const latText = coords ? `${Math.abs(coords.lat).toFixed(4)}° ${coords.lat >= 0 ? "N" : "S"}` : "17.3850° N";
  const lngText = coords ? `${Math.abs(coords.lng).toFixed(4)}° ${coords.lng >= 0 ? "E" : "W"}` : "78.4867° E";
  const accText = coords ? `±${Math.round(coords.acc)} m` : "awaiting fix";

  return (
    <div className="sv-stage" aria-hidden>
      <div className="sv-scene">
        {/* map ground plane */}
        <div className="sv-layer sv-plane">
          <div className="sv-route" />
        </div>

        {/* security shield */}
        <div className="sv-layer sv-shield">
          <div className="sv-shield-halo" />
          <div className="sv-shield-body">
            <svg className="sv-shield-check" viewBox="0 0 24 24" fill="none">
              <path d="M5 12.5l4.5 4.5L19 7.5" stroke="#04102b" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* device */}
        <div className="sv-layer sv-phone">
          <div className="sv-phone-screen">
            <div className="sv-phone-notch" />
            <div className="sv-phone-map" />
            <div className="sv-phone-blob" style={{ width: 150, height: 150, left: 30, top: 90 }} />
            <div className="sv-phone-blob" style={{ width: 90, height: 90, right: 20, top: 220 }} />
            <div className={`sv-scan${active ? "" : ""}`} />
            <div className="sv-phone-hud">
              <div className="k">Estimated position</div>
              <div className="v">{latText}</div>
              <div className="v">{lngText}</div>
              <div className="row2">
                <span className="s">◎ {accText}</span>
                <span className="s">{now}</span>
              </div>
            </div>
          </div>
        </div>

        {/* glowing location pin */}
        <div className="sv-layer sv-pin">
          <div className="sv-pin-ring" />
          <div className="sv-pin-ring d" />
          <div className="sv-pin-body" />
          <div className="sv-pin-glow" />
        </div>

        {/* holographic case panel */}
        {view && (
          <div className="sv-layer sv-holo" id="security">
            <div className="sv-holo-h">Case dossier</div>
            <div className="sv-holo-row">
              <div className="k">Case ref</div>
              <div className="v mono">{view.caseRef}</div>
            </div>
            {view.officerName && (
              <div className="sv-holo-row">
                <div className="k">Requested by</div>
                <div className="v">{view.officerName}</div>
              </div>
            )}
            <div className="sv-holo-row">
              <div className="k">Reason</div>
              <div className="v">{view.purpose}</div>
            </div>
            <div className="sv-holo-row">
              <div className="k">Reference id</div>
              <div className="v mono">{view.reference}</div>
            </div>
          </div>
        )}

        {/* floating verification chips */}
        <div className="sv-layer sv-chip sv-chip-coord">
          <span className="ico b">📍</span>
          <span>
            <strong>Location</strong>
            <br />
            <span className="mono">{latText} · {lngText}</span>
          </span>
        </div>
        <div className="sv-layer sv-chip sv-chip-time">
          <span className="ico">✓</span>
          <span>Verification ready</span>
        </div>
        <div className="sv-layer sv-chip sv-chip-acc">
          <span className="ico b">🕓</span>
          <span className="mono">{now}</span>
        </div>
      </div>
    </div>
  );
}

export default function RecipientPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<RecipientView | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState<string>("");
  const [live, setLive] = useState(false);
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [now, setNow] = useState<string>("--:--:--");
  const watchId = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // live clock for the holographic HUD (presentation only)
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // mouse parallax + scroll-driven camera (presentation only)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      if (reduce) return;
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--mx", x.toFixed(3));
        el.style.setProperty("--my", y.toFixed(3));
      });
    };
    const onScroll = () => {
      el.style.setProperty("--sc", Math.min(1, window.scrollY / 480).toFixed(3));
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    fetch(`/api/l/${token}`, { cache: "no-store" })
      .then(async (r) => {
        const data: RecipientView = await r.json();
        setView(data);
        if (!r.ok || data.reason === "not_found") {
          setPhase("closed");
          setMessage("This link is not valid. It may have been mistyped or already closed.");
        } else if (!data.acceptsData) {
          setPhase("closed");
          setMessage(
            data.reason === "expired"
              ? "This request has expired. Please contact the investigating officer if you still need to respond."
              : "This request has already been completed. Nothing further is needed.",
          );
        } else {
          setPhase("intro");
        }
      })
      .catch(() => {
        setPhase("error");
        setMessage("Could not reach the server. Check your connection and reload the page.");
      });
  }, [token]);

  const send = useCallback(
    async (pos: GeolocationPosition) => {
      const res = await fetch(`/api/l/${token}/location`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date(pos.timestamp).toISOString(),
        }),
      });
      if (res.ok) {
        setLastSent(new Date().toLocaleTimeString());
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, acc: pos.coords.accuracy });
      } else if (res.status === 410 || res.status === 409) {
        stopLive();
        const d = await res.json().catch(() => ({}));
        setPhase("closed");
        setMessage(d.error || "This request is no longer active.");
      }
    },
    [token],
  );

  function stopLive() {
    if (watchId.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setLive(false);
  }

  async function reportDenied() {
    await fetch(`/api/l/${token}/location`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permission: "denied" }),
    }).catch(() => {});
  }

  function decline() {
    reportDenied();
    setPhase("declined");
  }

  function share() {
    if (!("geolocation" in navigator)) {
      setPhase("error");
      setMessage("This browser does not support location sharing.");
      return;
    }
    setPhase("sharing");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await send(pos);
        setPhase("done");
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reportDenied();
          setPhase("declined");
        } else {
          setPhase("error");
          setMessage(
            err.message ||
              "Could not determine your location. Move to an open area and try again.",
          );
        }
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  }

  function startLive() {
    if (!("geolocation" in navigator)) return;
    setLive(true);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => send(pos),
      () => stopLive(),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );
  }

  useEffect(() => () => stopLive(), []);

  const expiryText = view ? new Date(view.expiresAt).toLocaleString() : "";
  const sceneActive = phase === "intro" || phase === "sharing" || phase === "done";

  return (
    <div className="sv-root" ref={rootRef}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <Atmosphere />

      <div className="sv-shell">
        <NavBar live={live} />

        <section className="sv-hero" id="status">
          <div className="sv-col-left">
            {phase === "loading" && (
              <div className="sv-status">
                <div className="sv-spinner" />
                <h1 style={{ marginTop: 18 }}>Establishing secure channel…</h1>
                <p>Verifying this request with the investigating unit.</p>
              </div>
            )}

            {(phase === "closed" || phase === "error") && (
              <div className="sv-status">
                <div className="sv-status-ico">{phase === "error" ? "⚠️" : "🔒"}</div>
                <h1>{phase === "error" ? "Something went wrong" : "This link is closed"}</h1>
                <p>{message}</p>
              </div>
            )}

            {phase === "declined" && (
              <div className="sv-status">
                <div className="sv-status-ico">✋</div>
                <h1>No location was shared</h1>
                <p>
                  You chose not to share your location. Nothing has been sent. You can close this
                  page.
                </p>
              </div>
            )}

            {phase === "sharing" && (
              <div className="sv-status">
                <div className="sv-spinner" />
                <h1 style={{ marginTop: 18 }}>Waiting for permission</h1>
                <p>
                  Your browser will ask to use your location — please tap <b>Allow</b> to complete
                  the verification.
                </p>
              </div>
            )}

            {phase === "done" && (
              <div className="sv-status">
                <div className="sv-status-ico ok">✓</div>
                <h1 style={{ color: "#8ff0d6" }}>Location verified</h1>
                <p>
                  Thank you. Your location has been securely sent to the investigating officer
                  {lastSent ? ` at ${lastSent}` : ""}.
                </p>
                {view && !view.reason && (
                  <div className="sv-live">
                    {live ? (
                      <>
                        <p style={{ color: "#8ff0d6", fontWeight: 600 }}>Live location is on</p>
                        <p style={{ fontSize: 12, marginTop: 4 }}>Last update: {lastSent ?? "—"}</p>
                        <button
                          onClick={stopLive}
                          className="sv-btn sv-btn-ghost"
                          style={{ marginTop: 12, width: "100%", padding: "12px 18px" }}
                        >
                          Stop sharing
                        </button>
                      </>
                    ) : (
                      <>
                        <p style={{ fontSize: 12.5 }}>
                          If the officer asked you to stay reachable, you can keep sharing your
                          location until you stop it.
                        </p>
                        <button
                          onClick={startLive}
                          className="sv-btn sv-btn-primary"
                          style={{ marginTop: 12, width: "100%", padding: "12px 18px" }}
                        >
                          Keep sharing live location
                        </button>
                      </>
                    )}
                  </div>
                )}
                <p style={{ fontSize: 12, marginTop: 14, color: "#7f92bd" }}>
                  You may now close this page.
                </p>
              </div>
            )}

            {phase === "intro" && view && (
              <>
                <span className="sv-eyebrow">
                  <span className="sv-navdot" style={{ margin: 0 }} /> Secure location verification
                </span>
                <h1 className="sv-title">
                  <span className="l1">Confirm Your</span>
                  <span className="l2">Current Location</span>
                </h1>
                <p className="sv-sub">
                  Securely verify your physical location to complete this request. Nothing is
                  collected unless you choose to allow it.
                </p>

                <div className="sv-cta-row">
                  <button onClick={share} className="sv-btn sv-btn-primary">
                    Allow location verification
                  </button>
                  <button onClick={decline} className="sv-btn sv-btn-ghost">
                    Decline
                  </button>
                </div>

                {agency.verifyPhone && (
                  <div className="sv-verify">
                    {agency.verifyNote} Verify by calling{" "}
                    <a href={`tel:${agency.verifyPhone}`}>{agency.verifyPhone}</a> and quoting
                    reference <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{view.reference}</span>.
                  </div>
                )}

                <p className="sv-fineprint">
                  Your browser will ask for permission next. This link expires {expiryText}.
                </p>
              </>
            )}
          </div>

          <HeroScene view={view} coords={coords} now={now} active={sceneActive} />

          {phase === "intro" && (
            <div className="sv-scrollcue">
              <span />
              Scroll
            </div>
          )}
        </section>

        {phase === "intro" && view && (
          <section className="sv-detail" id="help">
            <div className="sv-detail-grid">
              <div className="sv-detail-card">
                <h3>What will be shared</h3>
                <ul>
                  <li>Your device&apos;s current coordinates and their accuracy</li>
                  <li>The time the reading was taken</li>
                </ul>
                <p style={{ marginTop: 10 }}>{agency.privacyNote}</p>
              </div>
              <div className="sv-detail-card">
                <h3>Case details</h3>
                <p>
                  <strong>Case ref</strong> · {view.caseRef}
                  <br />
                  {view.officerName && (
                    <>
                      <strong>Requested by</strong> · {view.officerName}
                      <br />
                    </>
                  )}
                  <strong>Reason</strong> · {view.purpose}
                  <br />
                  <strong>Reference id</strong> · {view.reference}
                </p>
              </div>
              <div className="sv-detail-card">
                <h3>Verifying this request</h3>
                <p>{agency.verifyNote}</p>
                {agency.verifyPhone && (
                  <p style={{ marginTop: 8 }}>
                    Call{" "}
                    <a href={`tel:${agency.verifyPhone}`} style={{ color: "#9cc2ff", fontWeight: 700 }}>
                      {agency.verifyPhone}
                    </a>{" "}
                    and quote reference {view.reference}. This link expires {expiryText}.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="sv-footer">
          Official request. Do not share this link with anyone else.
        </div>
      </div>
    </div>
  );
}
