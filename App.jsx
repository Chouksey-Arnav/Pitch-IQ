import { useState, useEffect, useRef, useCallback } from "react";

/* ──────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────── */
const FREE_LIMIT = 3;
const VALID_CODES = ["PITCHIQ-PRO","PITCHIQPRO","PREMIUM2025","DEMO","ARNAV2025"];
const IDEAL_ELBOW = [85, 145];

/* ──────────────────────────────────────────────
   UTILITY HOOKS
────────────────────────────────────────────── */
function useLocalStorage(key, def) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s !== null ? JSON.parse(s) : def; }
    catch { return def; }
  });
  const set = useCallback(v => {
    setVal(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  }, [key]);
  return [val, set];
}

function usePremium() {
  const [isPrem, setIsPrem] = useLocalStorage("piq_prem", false);
  const todayKey = new Date().toDateString();
  const [day, setDay] = useLocalStorage("piq_day", todayKey);
  const [uses, setUses] = useLocalStorage("piq_uses", 0);
  if (day !== todayKey) { setDay(todayKey); setUses(0); }
  const left = isPrem ? Infinity : Math.max(0, FREE_LIMIT - uses);
  const bump = () => { if (!isPrem) setUses(u => u + 1); };
  const activate = () => setIsPrem(true);
  return { isPrem, left, bump, activate, uses: isPrem ? 0 : uses };
}

/* ──────────────────────────────────────────────
   GEOMETRY
────────────────────────────────────────────── */
function calcAngle(A, B, C) {
  const r = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
  const d = Math.abs(r * 180 / Math.PI);
  return d > 180 ? 360 - d : d;
}
function ptDist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
function fmtT(t) {
  if (!t || isNaN(t)) return "0:00";
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}

/* ──────────────────────────────────────────────
   STYLES (inline — no Tailwind dependency)
────────────────────────────────────────────── */
const S = {
  page: { background:"#04080f", color:"#c8ddf0", fontFamily:"'Inter',system-ui,sans-serif", minHeight:"100vh", overflowX:"hidden" },
  // Header
  header: { position:"sticky", top:0, zIndex:200, background:"rgba(4,8,15,.95)", backdropFilter:"blur(16px)", WebkitBackdropFilter:"blur(16px)", borderBottom:"1px solid rgba(255,255,255,.06)", flexShrink:0 },
  headerTop: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px" },
  brand: { display:"flex", alignItems:"center", gap:8, textDecoration:"none", color:"inherit" },
  brandMark: { width:28, height:28, borderRadius:7, background:"#00d4a8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#04080f", flexShrink:0 },
  brandName: { fontSize:16, fontWeight:800, letterSpacing:"-.01em" },
  modeRow: { display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderTop:"1px solid rgba(255,255,255,.06)", overflowX:"auto", scrollbarWidth:"none", WebkitOverflowScrolling:"touch" },
  toggleGroup: { display:"flex", gap:2, padding:2, background:"#101e36", border:"1px solid rgba(255,255,255,.06)", borderRadius:7, flexShrink:0 },
  // Buttons
  tglBase: { padding:"5px 12px", fontSize:11, fontWeight:700, borderRadius:5, border:"none", cursor:"pointer", transition:"all .14s", whiteSpace:"nowrap", fontFamily:"inherit" },
  tglOff: { background:"none", color:"#4a6a8a" },
  tglOn: { background:"#00d4a8", color:"#04080f" },
  tglOnBlue: { background:"#3b82f6", color:"#fff" },
  tglOnPurple: { background:"#a855f7", color:"#fff" },
  // Video area
  videoSection: { position:"relative", background:"#000c1a", width:"100%" },
  videoWrap: { position:"relative", width:"100%", aspectRatio:"16/9", background:"#000c1a", overflow:"hidden" },
  video: { width:"100%", height:"100%", objectFit:"contain", background:"#000c1a" },
  canvas: { position:"absolute", top:0, left:0, width:"100%", height:"100%", pointerEvents:"none" },
  // Upload zone
  uploadZone: { position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"#0c1628", cursor:"pointer", padding:24, textAlign:"center" },
  uploadBtn: { background:"#00d4a8", color:"#04080f", fontFamily:"inherit", fontSize:14, fontWeight:700, padding:"12px 28px", borderRadius:9, border:"none", cursor:"pointer", marginBottom:12 },
  // Overlay badge
  ovlBadge: { position:"absolute", display:"flex", alignItems:"center", gap:5, background:"rgba(6,12,24,.88)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,.1)", borderRadius:20, padding:"4px 10px", fontSize:10, fontWeight:600, color:"#c8ddf0", pointerEvents:"none" },
  // Controls
  ctrlRow: { display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" },
  ctrlBtn: { display:"flex", alignItems:"center", gap:4, background:"#101e36", border:"1px solid rgba(255,255,255,.06)", color:"#c8ddf0", fontSize:12, fontWeight:600, padding:"8px 12px", borderRadius:7, cursor:"pointer", transition:"background .12s", whiteSpace:"nowrap", fontFamily:"inherit", minHeight:40 },
  spdSet: { display:"flex", gap:1, padding:2, background:"#080f1e", border:"1px solid rgba(255,255,255,.06)", borderRadius:6 },
  spdBtn: { padding:"5px 9px", fontSize:10, fontWeight:700, color:"#4a6a8a", background:"none", border:"none", borderRadius:4, cursor:"pointer", fontFamily:"inherit" },
  // Analyze zone
  analyzeZone: { padding:"14px 16px", background:"#0c1628", borderTop:"1px solid rgba(255,255,255,.06)" },
  analyzeBtn: { width:"100%", background:"#00d4a8", color:"#04080f", fontFamily:"inherit", fontSize:16, fontWeight:800, padding:16, borderRadius:10, border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, minHeight:52, transition:"opacity .15s" },
  // Cards
  card: { background:"#0c1628", border:"1px solid rgba(255,255,255,.06)", borderRadius:12, overflow:"hidden" },
  cardHeader: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)" },
  cardTitle: { fontSize:12, fontWeight:700, color:"#c8ddf0", letterSpacing:".04em", textTransform:"uppercase" },
  cardBody: { padding:16 },
  // Chips
  chip: { display:"flex", flexDirection:"column", alignItems:"center", background:"#101e36", border:"1px solid rgba(255,255,255,.06)", borderRadius:8, padding:"8px 12px", flex:1, minWidth:60, textAlign:"center" },
  chipVal: { fontSize:16, fontWeight:800, color:"#fff", lineHeight:1, marginBottom:2 },
  chipLbl: { fontSize:9, fontWeight:600, color:"#4a6a8a", letterSpacing:".05em", textTransform:"uppercase" },
  // Charts
  chartTab: { padding:"10px 16px", fontSize:11, fontWeight:700, color:"#4a6a8a", background:"none", border:"none", borderBottom:"2px solid transparent", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, fontFamily:"inherit", transition:"color .14s" },
  // Metrics
  metricCell: { background:"#101e36", border:"1px solid rgba(255,255,255,.06)", borderRadius:9, padding:12 },
  // Feedback
  fbItem: { borderBottom:"1px solid rgba(255,255,255,.06)", overflow:"hidden" },
  fbHdr: { display:"flex", alignItems:"center", gap:10, padding:"14px 16px", cursor:"pointer", transition:"background .12s", minHeight:52 },
  fbBody: { padding:"0 16px 16px" },
  fbDesc: { fontSize:13, color:"#4a6a8a", lineHeight:1.7, marginBottom:12 },
  drillBox: { background:"rgba(0,212,168,.06)", border:"1px solid rgba(0,212,168,.2)", borderRadius:8, padding:12 },
  // Key moments
  km: { display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid rgba(255,255,255,.06)", cursor:"pointer", minHeight:56, transition:"background .12s" },
  kmTime: { fontSize:11, fontWeight:700, color:"#00d4a8", background:"rgba(0,212,168,.08)", border:"1px solid rgba(0,212,168,.2)", borderRadius:5, padding:"3px 8px", whiteSpace:"nowrap", flexShrink:0 },
  // Paywall
  pwOverlay: { position:"fixed", inset:0, zIndex:999, background:"rgba(4,8,15,.92)", backdropFilter:"blur(16px)", display:"flex", alignItems:"flex-end", justifyContent:"center", paddingBottom:"env(safe-area-inset-bottom,20px)" },
  pwSheet: { background:"#101e36", border:"1px solid rgba(255,255,255,.15)", borderRadius:"20px 20px 0 0", padding:"28px 24px", width:"100%", maxWidth:520, maxHeight:"90vh", overflowY:"auto", position:"relative" },
  // Toast
  toast: { position:"fixed", bottom:16, left:"50%", transform:"translateX(-50%)", zIndex:1000, background:"#152440", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600, color:"#c8ddf0", pointerEvents:"none", whiteSpace:"nowrap", maxWidth:"90vw", overflow:"hidden", textOverflow:"ellipsis" },
  // Progress bar
  progressBar: { height:"100%", borderRadius:2, transition:"width .2s" },
  // Scan overlay
  scanOverlay: { position:"absolute", inset:0, background:"rgba(4,8,15,.88)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:16, padding:24, textAlign:"center", zIndex:30 },
};

const c = { g:"#22c55e", w:"#f59e0b", r:"#ef4444", b:"#3b82f6", p:"#a855f7", teal:"#00d4a8", mu:"#4a6a8a" };

/* ──────────────────────────────────────────────
   SCORE RING COMPONENT
────────────────────────────────────────────── */
function ScoreRing({ score, color }) {
  const circ = (2 * Math.PI * 34).toFixed(1);
  const dash = (circ - (score / 100) * circ).toFixed(1);
  return (
    <div style={{ position:"relative", width:80, height:80, flexShrink:0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform:"rotate(-90deg)" }}>
        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6"/>
        <circle cx="40" cy="40" r="34" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={dash} style={{ transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}/>
      </svg>
      <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ fontSize:20, fontWeight:800, color:"#fff", lineHeight:1 }}>{score}</div>
        <div style={{ fontSize:9, color:c.mu }}>/100</div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   CANVAS CHART COMPONENT
────────────────────────────────────────────── */
function TimelineChart({ data, duration }) {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current; if (!canvas || !data.length) return;
    const W = canvas.parentElement.offsetWidth - 32 || 320;
    canvas.width = W; canvas.height = 160;
    const ctx = canvas.getContext("2d"), h = 160, mn = 40, mx = 190;
    ctx.fillStyle = "#080f1e"; ctx.fillRect(0,0,W,h);
    const dur = duration || 1;
    const y1 = h - (IDEAL_ELBOW[0]-mn)/(mx-mn)*h, y2 = h - (IDEAL_ELBOW[1]-mn)/(mx-mn)*h;
    ctx.fillStyle = "rgba(34,197,94,.07)"; ctx.fillRect(0,y2,W,y1-y2);
    [60,90,120,150,180].forEach(v => {
      const y = h-(v-mn)/(mx-mn)*h;
      ctx.strokeStyle="rgba(255,255,255,.05)"; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
      ctx.fillStyle="rgba(74,106,138,.55)"; ctx.font="9px Inter,system-ui"; ctx.fillText(`${v}°`,3,y-2);
    });
    const valid = data.filter(d=>d.ea!==null);
    if (valid.length > 1) {
      ctx.strokeStyle="rgba(0,212,168,.85)"; ctx.lineWidth=2; ctx.lineJoin="round"; ctx.beginPath(); let first=true;
      valid.forEach(d=>{ const x=(d.t/dur)*W, y=h-(d.ea-mn)/(mx-mn)*h; if(first){ctx.moveTo(x,y);first=false;}else ctx.lineTo(x,y); }); ctx.stroke();
    }
    valid.forEach(d => {
      const x=(d.t/dur)*W, y=h-(d.ea-mn)/(mx-mn)*h;
      const col=d.ea>=IDEAL_ELBOW[0]&&d.ea<=IDEAL_ELBOW[1]?c.g:d.ea<65?c.r:c.w;
      ctx.fillStyle=col; ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fill();
    });
    const avg = valid.length ? Math.round(valid.reduce((a,d)=>a+d.ea,0)/valid.length) : null;
    if (avg) {
      const ay = h-(avg-mn)/(mx-mn)*h;
      ctx.strokeStyle="rgba(245,158,11,.45)"; ctx.lineWidth=1; ctx.setLineDash([5,3]); ctx.beginPath(); ctx.moveTo(0,ay); ctx.lineTo(W,ay); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle=c.w; ctx.font="bold 9px Inter,system-ui"; ctx.textAlign="end"; ctx.fillText(`avg ${avg}°`,W-4,ay-3); ctx.textAlign="start";
    }
    ctx.fillStyle="rgba(74,106,138,.5)"; ctx.font="9px Inter,system-ui";
    ctx.fillText("0:00",4,h-3); ctx.textAlign="end"; ctx.fillText(fmtT(dur),W-4,h-3); ctx.textAlign="start";
  }, [data, duration]);
  return <canvas ref={ref} style={{ width:"100%", display:"block", borderRadius:6 }}/>;
}

function ConsistencyChart({ elbows }) {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current; if (!canvas || !elbows.length) return;
    const W = canvas.parentElement.offsetWidth - 32 || 300;
    canvas.width = W; canvas.height = 180;
    const ctx = canvas.getContext("2d"), h = 180, total = elbows.length;
    ctx.fillStyle = "#080f1e"; ctx.fillRect(0,0,W,h);
    const zones = [
      { lbl:"Good\n85–145°", count:elbows.filter(e=>e>=85&&e<=145).length, color:c.g },
      { lbl:"Caution\n<85 or >145", count:elbows.filter(e=>(e<85&&e>=65)||(e>145&&e<165)).length, color:c.w },
      { lbl:"Critical\n<65 or >165", count:elbows.filter(e=>e<65||e>165).length, color:c.r },
    ];
    const maxC = Math.max(...zones.map(z=>z.count),1);
    const barW = Math.floor((W-48)/3-8), chartH = h-48;
    zones.forEach((z,i) => {
      const x=24+i*(barW+8), bh=Math.round((z.count/maxC)*chartH*.85), y=h-36-bh;
      const pct=Math.round((z.count/total)*100);
      ctx.fillStyle=z.color+"28"; ctx.fillRect(x,8,barW,chartH);
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,barW,bh,[4,4,0,0]);ctx.fillStyle=z.color;ctx.fill();}
      else{ctx.fillStyle=z.color;ctx.fillRect(x,y,barW,bh);}
      ctx.fillStyle=z.color; ctx.font="bold 16px Inter,system-ui"; ctx.textAlign="center"; ctx.fillText(`${pct}%`,x+barW/2,y-5);
      ctx.fillStyle="rgba(74,106,138,.7)"; ctx.font="10px Inter,system-ui"; ctx.fillText(`${z.count}`,x+barW/2,h-22);
      z.lbl.split("\n").forEach((l,j)=>{ctx.fillStyle="rgba(74,106,138,.7)";ctx.font="9px Inter,system-ui";ctx.fillText(l,x+barW/2,h-22+12*(j+1));});
    });
    ctx.textAlign="start";
  }, [elbows]);
  return <canvas ref={ref} style={{ width:"100%", display:"block", borderRadius:6 }}/>;
}

/* ──────────────────────────────────────────────
   MAIN APP COMPONENT
────────────────────────────────────────────── */
export default function PitchIQApp() {
  const { isPrem, left, bump, activate, uses } = usePremium();
  const [appMode, setAppMode] = useState("batting");
  const [appHand, setAppHand] = useState("right");
  const [aiMode, setAiMode] = useState("pose");
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [liveTrack, setLiveTrack] = useState(true);
  const [skelOnly, setSkelOnly] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanPct, setScanPct] = useState(0);
  const [scanMsg, setScanMsg] = useState("");
  const [scanData, setScanData] = useState([]);
  const [report, setReport] = useState(null);
  const [showPw, setShowPw] = useState(false);
  const [toast, setToast] = useState(null);
  const [chartTab, setChartTab] = useState(0);
  const [openFB, setOpenFB] = useState(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeFB, setCodeFB] = useState(null);
  const [kinPoses, setKinPoses] = useState([]);
  const [kinCapturing, setKinCapturing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fname, setFname] = useState("");
  const [aiReady, setAiReady] = useState({ pose: false, hand: false, holistic: false });
  const [modelsLoading, setModelsLoading] = useState(true);
  const [speed, setSpeed] = useState(1);

  const vidRef = useRef(null);
  const skRef = useRef(null);
  const offRef = useRef(null);
  const rafRef = useRef(null);
  const sendingRef = useRef(false);
  const trackActiveRef = useRef(false);
  const poseModelRef = useRef(null);
  const handModelRef = useRef(null);
  const holModelRef = useRef(null);
  const poseResolveRef = useRef(null);
  const handResolveRef = useRef(null);
  const holResolveRef = useRef(null);
  const lastPoseRef = useRef(null);
  const scanCancelRef = useRef(false);
  const fpsRef = useRef(0);
  const fpsLastRef = useRef(0);
  const [fps, setFps] = useState(0);

  const nW = useRef(640), nH = useRef(480);

  /* ── TOAST ─────────────────────────────── */
  const showToast = useCallback((msg, dur = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), dur);
  }, []);

  /* ── AI INIT ────────────────────────────── */
  useEffect(() => {
    async function init() {
      const win = window;
      if (win.Pose) {
        const pm = new win.Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${f}` });
        pm.setOptions({ modelComplexity:1, smoothLandmarks:true, enableSegmentation:false, minDetectionConfidence:.5, minTrackingConfidence:.5 });
        pm.onResults(r => {
          lastPoseRef.current = r.poseLandmarks && r.poseLandmarks.length ? r.poseLandmarks : null;
          if (poseResolveRef.current) { const res = poseResolveRef.current; poseResolveRef.current = null; res(r); }
          if (trackActiveRef.current && aiMode === "pose") drawPose(r);
        });
        try { await pm.initialize(); poseModelRef.current = pm; setAiReady(p => ({...p, pose:true})); } catch {}
      }
      if (win.Hands) {
        const hm = new win.Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${f}` });
        hm.setOptions({ maxNumHands:2, modelComplexity:1, minDetectionConfidence:.5, minTrackingConfidence:.5 });
        hm.onResults(r => {
          if (handResolveRef.current) { const res = handResolveRef.current; handResolveRef.current = null; res(r); }
          if (trackActiveRef.current && aiMode === "hand") drawHands(r);
        });
        try { await hm.initialize(); handModelRef.current = hm; setAiReady(p => ({...p, hand:true})); } catch {}
      }
      if (win.Holistic) {
        const hol = new win.Holistic({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/${f}` });
        hol.setOptions({ modelComplexity:1, smoothLandmarks:true, enableSegmentation:false, minDetectionConfidence:.5, minTrackingConfidence:.5 });
        hol.onResults(r => {
          lastPoseRef.current = r.poseLandmarks && r.poseLandmarks.length ? r.poseLandmarks : null;
          if (holResolveRef.current) { const res = holResolveRef.current; holResolveRef.current = null; res(r); }
          if (trackActiveRef.current && aiMode === "holistic") drawHolistic(r);
        });
        try { await hol.initialize(); holModelRef.current = hol; setAiReady(p => ({...p, holistic:true})); } catch {}
      }
      setModelsLoading(false);
      showToast("✓ AI models ready");
    }
    // Only init if MediaPipe scripts are loaded
    if (window.Pose || window.Hands || window.Holistic) init();
    else {
      // Load scripts dynamically
      const scripts = [
        "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/hands.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.5.1635989137/holistic.js",
      ];
      let loaded = 0;
      scripts.forEach(src => {
        const s = document.createElement("script"); s.src = src; s.crossOrigin = "anonymous";
        s.onload = () => { if (++loaded === scripts.length) init(); };
        document.body.appendChild(s);
      });
    }
  }, []);

  /* ── SEND FRAME ─────────────────────────── */
  function sendFrame(src) {
    return new Promise((res, rej) => {
      const timer = setTimeout(() => rej(new Error("timeout")), 10000);
      const wrap = r => { clearTimeout(timer); res(r); };
      const m = aiMode === "pose" ? poseModelRef.current : aiMode === "hand" ? handModelRef.current : holModelRef.current;
      if (!m) { clearTimeout(timer); rej(new Error("no model")); return; }
      if (aiMode === "pose") poseResolveRef.current = wrap;
      else if (aiMode === "hand") handResolveRef.current = wrap;
      else holResolveRef.current = wrap;
      m.send({ image: src }).catch(e => { clearTimeout(timer); rej(e); });
    });
  }

  /* ── SKELETON DRAWING ───────────────────── */
  function getSkCtx() { return skRef.current ? skRef.current.getContext("2d") : null; }
  function clearSkel() { const ctx = getSkCtx(); if(ctx) ctx.clearRect(0,0,skRef.current.width,skRef.current.height); }

  function drawColorSkel(ctx, lm, w, h) {
    const R = appHand === "right";
    const fSh=lm[R?11:12], fEl=lm[R?13:14], fWr=lm[R?15:16], bSh=lm[R?12:11];
    const ea = fSh&&fEl&&fWr&&fSh.visibility>.25&&fEl.visibility>.25 ? calcAngle(fSh,fEl,fWr) : null;
    const shTilt = fSh&&bSh ? Math.abs(fSh.y-bSh.y) : 0;
    const PAIRS = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],[27,31],[28,32]];
    ctx.lineCap = "round";
    PAIRS.forEach(([a,b]) => {
      if(!lm[a]||!lm[b]||lm[a].visibility<.2||lm[b].visibility<.2) return;
      let col = "rgba(0,212,168,.6)";
      const isElbow=(a===11&&b===13)||(a===13&&b===15)||(a===12&&b===14)||(a===14&&b===16);
      if(isElbow&&ea!==null) col=ea>=IDEAL_ELBOW[0]&&ea<=IDEAL_ELBOW[1]?"rgba(34,197,94,.9)":ea<65?"rgba(239,68,68,.9)":"rgba(245,158,11,.9)";
      else if(a===11&&b===12) col=shTilt>.05?"rgba(34,197,94,.8)":shTilt>.02?"rgba(245,158,11,.8)":"rgba(239,68,68,.8)";
      ctx.strokeStyle=col; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(lm[a].x*w,lm[a].y*h); ctx.lineTo(lm[b].x*w,lm[b].y*h); ctx.stroke();
    });
    lm.slice(0,29).forEach(p=>{
      if(!p||p.visibility<.2) return;
      const x=p.x*w, y=p.y*h;
      ctx.beginPath(); ctx.arc(x,y,5,0,Math.PI*2); ctx.fillStyle=`rgba(0,212,168,${p.visibility*.2})`; ctx.fill();
      ctx.beginPath(); ctx.arc(x,y,3.5,0,Math.PI*2); ctx.fillStyle="rgba(0,212,168,.9)"; ctx.fill();
      ctx.strokeStyle="rgba(255,255,255,.5)"; ctx.lineWidth=.8; ctx.stroke();
    });
    if(ea!==null&&fEl&&fEl.visibility>.35){
      const ex=fEl.x*w, ey=fEl.y*h, col=ea>=IDEAL_ELBOW[0]&&ea<=IDEAL_ELBOW[1]?c.g:ea<65?c.r:c.w;
      const a1=Math.atan2((fSh.y-fEl.y)*h,(fSh.x-fEl.x)*w), a2=Math.atan2((fWr.y-fEl.y)*h,(fWr.x-fEl.x)*w);
      ctx.beginPath(); ctx.arc(ex,ey,20,Math.min(a1,a2),Math.max(a1,a2)); ctx.strokeStyle=col; ctx.lineWidth=2; ctx.stroke();
      const txt=`${Math.round(ea)}°`, mid=(Math.min(a1,a2)+Math.max(a1,a2))/2;
      const lx=ex+Math.cos(mid)*34, ly=ey+Math.sin(mid)*34;
      ctx.font="bold 11px Inter,system-ui"; const tw=ctx.measureText(txt).width;
      ctx.fillStyle="rgba(4,8,15,.85)"; ctx.fillRect(lx-tw/2-4,ly-10,tw+8,17);
      ctx.fillStyle=col; ctx.textAlign="center"; ctx.fillText(txt,lx,ly+4); ctx.textAlign="start";
    }
  }

  function drawPose(r) {
    const sc=skRef.current; if(!sc) return;
    const ctx=sc.getContext("2d");
    if(skelOnly){ctx.fillStyle="#000c1a";ctx.fillRect(0,0,sc.width,sc.height);}else ctx.clearRect(0,0,sc.width,sc.height);
    if(r.poseLandmarks&&r.poseLandmarks.length) drawColorSkel(ctx,r.poseLandmarks,sc.width,sc.height);
  }
  function drawHands(r) {
    const sc=skRef.current; if(!sc) return;
    const ctx=sc.getContext("2d");
    if(skelOnly){ctx.fillStyle="#000c1a";ctx.fillRect(0,0,sc.width,sc.height);}else ctx.clearRect(0,0,sc.width,sc.height);
    if(r.multiHandLandmarks) r.multiHandLandmarks.forEach((lm,i)=>{
      const color=i===0?c.teal:c.b;
      const P=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
      ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineCap="round";
      P.forEach(([a,b])=>{if(!lm[a]||!lm[b])return;ctx.beginPath();ctx.moveTo(lm[a].x*sc.width,lm[a].y*sc.height);ctx.lineTo(lm[b].x*sc.width,lm[b].y*sc.height);ctx.stroke();});
      ctx.fillStyle=color;
      lm.forEach(p=>{if(!p)return;ctx.beginPath();ctx.arc(p.x*sc.width,p.y*sc.height,3,0,Math.PI*2);ctx.fill();});
    });
  }
  function drawHolistic(r) {
    const sc=skRef.current; if(!sc) return;
    const ctx=sc.getContext("2d");
    if(skelOnly){ctx.fillStyle="#000c1a";ctx.fillRect(0,0,sc.width,sc.height);}else ctx.clearRect(0,0,sc.width,sc.height);
    if(r.poseLandmarks&&r.poseLandmarks.length) drawColorSkel(ctx,r.poseLandmarks,sc.width,sc.height);
  }

  /* ── RAF TRACKING LOOP ──────────────────── */
  useEffect(() => {
    if (!videoLoaded) return;
    function startLoop() {
      async function loop(ts) {
        rafRef.current = requestAnimationFrame(loop);
        if (!liveTrack || sendingRef.current) return;
        const vid = vidRef.current;
        if (!vid || vid.paused || vid.ended || vid.readyState < 2) return;
        fpsRef.current++;
        if (ts - fpsLastRef.current >= 1000) {
          setFps(fpsRef.current); fpsRef.current = 0; fpsLastRef.current = ts;
        }
        const m = aiMode==="pose"?poseModelRef.current:aiMode==="hand"?handModelRef.current:holModelRef.current;
        if (!m) return;
        sendingRef.current = true; trackActiveRef.current = true;
        const oc = offRef.current;
        if (oc) { oc.getContext("2d").drawImage(vid,0,0,oc.width,oc.height); try{await m.send({image:oc});}catch{} }
        sendingRef.current = false;
      }
      rafRef.current = requestAnimationFrame(loop);
    }
    startLoop();
    return () => { if(rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [videoLoaded, liveTrack, aiMode, skelOnly]);

  /* ── VIDEO LOAD ─────────────────────────── */
  function loadVideo(file) {
    const vid = vidRef.current; if (!vid) return;
    vid.src = URL.createObjectURL(file);
    vid.onloadedmetadata = () => {
      setVideoLoaded(true);
      nW.current = vid.videoWidth || 640;
      nH.current = vid.videoHeight || 480;
      [skRef,{ current:offRef.current }].forEach(r => { if(r.current){r.current.width=nW.current;r.current.height=nH.current;} });
      if(skRef.current){skRef.current.width=nW.current;skRef.current.height=nH.current;}
      if(offRef.current){offRef.current.width=nW.current;offRef.current.height=nH.current;}
      setDuration(vid.duration || 0);
      setFname(file.name);
    };
    vid.ontimeupdate = () => setCurrentTime(vid.currentTime || 0);
    vid.onplay = () => setIsPlaying(true);
    vid.onpause = () => setIsPlaying(false);
    vid.onended = () => setIsPlaying(false);
  }

  function togglePlay() {
    const vid = vidRef.current; if(!vid) return;
    vid.paused ? vid.play() : vid.pause();
  }
  function stepFrame(n) {
    const vid = vidRef.current; if(!vid) return;
    vid.pause(); vid.currentTime = Math.max(0, Math.min(vid.duration||0, vid.currentTime+n/30));
  }
  function seekTo(pct) {
    const vid = vidRef.current; if(vid && vid.duration) vid.currentTime = vid.duration*(pct/100);
  }
  function jumpTo(t) {
    const vid = vidRef.current; if(!vid) return;
    vid.currentTime = t; vid.pause();
    document.getElementById("results-sec")?.scrollIntoView({behavior:"smooth",block:"nearest"});
    showToast(`Jumped to ${fmtT(t)}`);
  }
  function setSpeedVal(s) {
    setSpeed(s); const vid=vidRef.current; if(vid) vid.playbackRate=s;
  }

  /* ── FULL VIDEO SCAN ─────────────────────── */
  async function runFullAnalysis() {
    if (!isPrem && left <= 0) { setShowPw(true); return; }
    if (!videoLoaded) { showToast("Upload a video first"); return; }
    const m = aiMode==="pose"?poseModelRef.current:aiMode==="hand"?handModelRef.current:holModelRef.current;
    if (!m) { showToast("AI loading — wait a moment"); return; }
    const vid = vidRef.current;
    if (!vid || !vid.duration || vid.duration < 1) { showToast("Video too short"); return; }

    vid.pause(); setScanning(true); scanCancelRef.current = false;
    setScanData([]); setReport(null); setScanPct(0);

    const dur = vid.duration;
    const nFrames = Math.min(60, Math.max(20, Math.floor(dur/0.5)));
    const step = dur / nFrames;
    const frames = [];
    for (let t=0; t<dur; t+=step) frames.push(parseFloat(t.toFixed(3)));
    if (frames[frames.length-1] < dur - 0.3) frames.push(dur - 0.2);

    const oc = offRef.current;
    const results = [];
    const kinPosesLocal = [];

    for (let i=0; i<frames.length; i++) {
      if (scanCancelRef.current) break;
      const pct = Math.round((i/frames.length)*100);
      setScanPct(pct);
      setScanMsg(`Frame ${i+1}/${frames.length} — ${fmtT(frames[i])}`);

      vid.currentTime = frames[i];
      await new Promise(res => {
        const h = () => { vid.removeEventListener("seeked",h); res(); };
        vid.addEventListener("seeked",h);
        setTimeout(res, 800);
      });
      await new Promise(res => setTimeout(res, 60));

      if (!oc || !oc.width) continue;
      try { oc.getContext("2d").drawImage(vid,0,0,oc.width,oc.height); } catch { continue; }

      try {
        trackActiveRef.current = false;
        const r = await new Promise((res,rej) => {
          const timer = setTimeout(() => rej(new Error("timeout")), 8000);
          const wrap = r => { clearTimeout(timer); res(r); };
          if (aiMode==="pose"&&poseModelRef.current) { poseResolveRef.current=wrap; poseModelRef.current.send({image:oc}).catch(e=>{clearTimeout(timer);rej(e);}); }
          else if (aiMode==="hand"&&handModelRef.current) { handResolveRef.current=wrap; handModelRef.current.send({image:oc}).catch(e=>{clearTimeout(timer);rej(e);}); }
          else if (holModelRef.current) { holResolveRef.current=wrap; holModelRef.current.send({image:oc}).catch(e=>{clearTimeout(timer);rej(e);}); }
          else { clearTimeout(timer); rej(new Error("no model")); }
        });
        trackActiveRef.current = true;

        const lm = r.poseLandmarks || null;
        const fd = { t: frames[i], lm, ea:null, shTilt:null, lean:null, stanceR:null };
        if (lm) {
          const R=appHand==="right";
          const fSh=lm[R?11:12],fEl=lm[R?13:14],fWr=lm[R?15:16],bSh=lm[R?12:11];
          const LS=lm[11],RS=lm[12],LH=lm[23],RH=lm[24],LA=lm[27],RA=lm[28];
          if(fSh&&fEl&&fWr&&fSh.visibility>.25&&fEl.visibility>.25) fd.ea=Math.round(calcAngle(fSh,fEl,fWr));
          if(fSh&&bSh) fd.shTilt=Math.abs(fSh.y-bSh.y);
          if(LS&&RS&&LH&&RH&&LS.visibility>.2) fd.lean=Math.abs((LS.x+RS.x)/2-(LH.x+RH.x)/2);
          if(LA&&RA&&LS&&RS&&LA.visibility>.2){const sw=ptDist({x:LA.x,y:LA.y},{x:RA.x,y:RA.y}),shW=ptDist({x:LS.x,y:LS.y},{x:RS.x,y:RS.y});fd.stanceR=shW>0?sw/shW:1;}
          // Live skeleton feedback
          if(skRef.current){ const sc=skRef.current; const ctx=sc.getContext("2d"); ctx.clearRect(0,0,sc.width,sc.height); drawColorSkel(ctx,lm,sc.width,sc.height); }
          // Kinogram
          if (i%3===0 && kinPosesLocal.length<20) kinPosesLocal.push(lm.map(l=>({...l})));
        }
        results.push(fd);
      } catch {
        trackActiveRef.current = true;
        results.push({ t: frames[i], lm:null, ea:null, shTilt:null, lean:null, stanceR:null });
      }
    }

    setScanning(false);
    if (!scanCancelRef.current) {
      bump(); setScanData(results); setKinPoses(kinPosesLocal);
      const rep = buildReport(results, appMode, appHand);
      setReport(rep);
      showToast(`✓ ${results.filter(d=>d.lm).length} frames analyzed`);
      setTimeout(() => {
        document.getElementById("results-sec")?.scrollIntoView({ behavior:"smooth", block:"start" });
      }, 300);
    }
  }

  /* ── BUILD REPORT ───────────────────────── */
  function buildReport(data, mode, hand) {
    const valid = data.filter(d=>d.lm);
    if (!valid.length) return null;
    const R = hand === "right";
    const elbows = valid.map(d=>d.ea).filter(x=>x!==null);
    const avg = arr => arr.length ? Math.round(arr.reduce((a,b)=>a+b,0)/arr.length*10)/10 : null;
    const avgElbow = avg(elbows);
    const consistency = elbows.length ? Math.round(elbows.filter(e=>e>=IDEAL_ELBOW[0]&&e<=IDEAL_ELBOW[1]).length/elbows.length*100) : 0;
    const best = valid.filter(d=>d.ea!==null).reduce((a,b)=>!a||Math.abs(b.ea-112)<Math.abs(a.ea-112)?b:a, null);
    const worst = valid.filter(d=>d.ea!==null).reduce((a,b)=>!a||Math.abs(b.ea-112)>Math.abs(a.ea-112)?b:a, null);
    const avgSh = avg(valid.map(d=>d.shTilt).filter(x=>x!==null));
    const avgLean = avg(valid.map(d=>d.lean).filter(x=>x!==null));
    const avgStance = avg(valid.map(d=>d.stanceR).filter(x=>x!==null));

    let score=0; const fb=[]; const measures={};

    if (mode==="batting") {
      if (avgElbow!==null) {
        score+=consistency>=70?30:consistency>=50?18:consistency>=30?10:4;
        measures["Front Elbow"]={val:`${Math.round(avgElbow)}°`,range:"85–145°",pct:Math.min(100,avgElbow/1.8),s:avgElbow>=85&&avgElbow<=145?"g":avgElbow<65?"r":"w",note:avgElbow>=85&&avgElbow<=145?"Ideal":avgElbow<75?"Collapsing":"Extended"};
        if (avgElbow>=85&&avgElbow<=145&&consistency>=60) fb.push({s:"good",t:`Front elbow — ideal (avg ${Math.round(avgElbow)}°, ${consistency}% consistent)`,desc:`Averaged ${Math.round(avgElbow)}° across ${elbows.length} tracked frames — in the coaching-ideal 85–145° range. Consistency at ${consistency}% means this technique holds throughout your session.`,drill:null,risk:"low"});
        else if (avgElbow<75) fb.push({s:"bad",t:`Elbow collapsing (avg ${Math.round(avgElbow)}°, ${consistency}% consistent)`,desc:`Front elbow averaged ${Math.round(avgElbow)}° — too acute. Folds inward, locking the swing and costing 20–30% bat speed. Only ${consistency}% of frames in the ideal range — a persistent session-wide pattern.`,drill:{title:"Mirror elbow drill",steps:["Stand side-on to a full mirror, bat raised to top of backswing.","Bring bat down — elbow must point OUTWARD at all times.","Freeze at contact: elbow ~110°, pointing away from body.","Repeat 20 times. Let the mirror correct each rep."],reps:["3 sets × 20 shadow strokes","Daily — 8 min","Film weekly"]},risk:"med"});
        else fb.push({s:"warn",t:`Elbow variable (avg ${Math.round(avgElbow)}°, ${consistency}% consistent)`,desc:`Averaging ${Math.round(avgElbow)}° but only ${consistency}% of frames in the ideal range — inconsistent. Some strokes have good technique; others drift. Focus on making the correct position automatic.`,drill:{title:"Towel lock drill",steps:["Tuck a small towel under your front armpit — keep it there throughout the stroke.","Shadow bat 15 reps — towel must not drop.","Remove towel: replicate the feeling for 15 more reps."],reps:["3 sets × 15","3× per week","Remove prop gradually"]},risk:"low"});
      }
      if (avgSh!==null) {
        score+=avgSh>.05?22:avgSh>.02?12:5;
        measures["Shoulders"]={val:avgSh>.05?"Side-on":avgSh>.02?"Partial":"Open",range:"Side-on",pct:Math.min(100,avgSh*1000),s:avgSh>.05?"g":avgSh>.02?"w":"r",note:avgSh>.05?"Good":"Opening early"};
        if(avgSh>.05) fb.push({s:"good",t:"Shoulders — consistently side-on",desc:`Front shoulder consistently lower than back shoulder — playing through the ball, reducing LBW and caught-behind risk across the entire session.`,drill:null,risk:"low"});
        else fb.push({s:avgSh<.02?"bad":"warn",t:"Shoulders opening early across session",desc:`Shoulders averaged only ${(avgSh*100).toFixed(1)}% side-on differential — a consistent pattern across the session, not random. Opening before or at contact, pushing bat face away from the line.`,drill:{title:"Front shoulder lock drill",steps:["Place a stump in line with your front shoulder, pointing at the bowler.","Keep front shoulder at the stump until AFTER imaginary contact.","Have a partner call when shoulder opens — delay it further each rep."],reps:["3 sets × 20 shadow reps","Film from side-on","Confirm timing vs contact"]},risk:avgSh<.02?"med":"low"});
      }
      if (avgLean!==null) {
        score+=avgLean<.15?24:avgLean<.25?14:5;
        measures["Head"]={val:avgLean<.15?"Over ball":avgLean<.25?"Slight drift":"Drifting",range:"Over ball",pct:Math.max(0,100-(avgLean*400)),s:avgLean<.15?"g":avgLean<.25?"w":"r",note:avgLean<.15?"Ideal":"Drifting"};
        if(avgLean<.15) fb.push({s:"good",t:"Head — tracking the ball consistently",desc:`Head averaged only ${(avgLean*100).toFixed(0)}% drift from the ball line across the session. Consistent head position — a key marker of established technique.`,drill:null,risk:"low"});
        else fb.push({s:avgLean<.25?"warn":"bad",t:`Head falling off line (${(avgLean*100).toFixed(0)}% drift avg)`,desc:`Head drifted ${(avgLean*100).toFixed(0)}% of body-width from the ball line across the session. Every mistimed shot begins with the head — when it goes, the bat follows.`,drill:{title:'"Nose to front foot" drill',steps:["Nose travels from back foot TO front foot through the stroke.","At contact: nose directly above front foot.","Partner calls if head drifts — delay it further each rep."],reps:["50 shadow reps daily","Film from front angle","Progress to throw-downs week 2"]},risk:"med"});
      }
      if (avgStance!==null) {
        score+=avgStance>=.82&&avgStance<=1.55?24:avgStance>1.72||avgStance<.5?5:14;
        const stLabel=avgStance>1.55?"Wide":avgStance<.7?"Narrow":"Ideal";
        measures["Stance"]={val:stLabel,range:"Shoulder-width",pct:Math.min(100,Math.max(0,(1-Math.abs(avgStance-1.1)/1.1)*100)),s:avgStance>=.82&&avgStance<=1.55?"g":avgStance>1.72||avgStance<.5?"r":"w",note:stLabel==="Ideal"?"Shoulder-width":stLabel};
        if(avgStance>=.82&&avgStance<=1.55) fb.push({s:"good",t:"Stance — shoulder-width ideal",desc:`Stance width averaged ${(avgStance*100).toFixed(0)}% of shoulder-width — the universally coached ideal. Stable for powerful drives, mobile for footwork adjustments.`,drill:null,risk:"low"});
        else fb.push({s:"warn",t:`Stance ${stLabel.toLowerCase()} (avg ${(avgStance*100).toFixed(0)}% of shoulders)`,desc:avgStance>1.55?"Too wide — locks hips, restricts weight transfer, prevents footwork against spin.":"Too narrow — reduces stability against pace, bat crosses the line.",drill:{title:"Shoulder-width calibration",steps:["Mark shoulder width on ground with two pieces of tape.","Set feet exactly on the marks for every shadow stroke.","50 shadow strokes: drives, pulls, defensive, cut."],reps:["Daily for 2 weeks","Film weekly to verify"]},risk:"low"});
      }
    } else {
      // Bowling — simplified
      score=60;
      fb.push({s:"good",t:"Full bowling session analyzed",desc:`${valid.length} frames captured across ${fmtT(data[data.length-1]?.t||0)}. Use the timeline chart to identify where mechanics change over your spell.`,drill:null,risk:"low"});
      measures["Frames"]={val:`${valid.length}`,range:"—",pct:100,s:"g",note:"Analyzed"};
    }

    score = Math.min(100, Math.max(0, Math.round(score)));
    const grade = score>=85?"Excellent":score>=70?"Strong":score>=55?"Developing":score>=40?"Inconsistent":"Needs Work";
    const sColor = score>=70?c.g:score>=50?c.w:c.r;
    const moments = [];
    if(best) moments.push({icon:"✅",title:"Best technique frame",sub:`Elbow ${best.ea}° — closest to ideal 112°`,t:best.t});
    if(worst) moments.push({icon:"⚠️",title:"Worst technique frame",sub:`Elbow ${worst.ea}° — furthest from ideal`,t:worst.t});
    const shBad=valid.filter(d=>d.shTilt!==null&&d.shTilt<.02)[0];
    if(shBad) moments.push({icon:"🔴",title:"Shoulder opening detected",sub:"Front shoulder opening early at this point",t:shBad.t});

    return { score, grade, sColor, consistency, measures, feedback:fb, elbows, valid, best, worst, moments, avgElbow, duration: data[data.length-1]?.t||1 };
  }

  /* ── DEMO ───────────────────────────────── */
  function runDemo() {
    if (!isPrem && left <= 0) { setShowPw(true); return; }
    const dur=10, step=.5, demoData=[];
    const R = appHand==="right";
    for (let t=0; t<dur; t+=step) {
      const lm=new Array(33).fill(null).map(()=>({x:.5,y:.5,z:0,visibility:.1}));
      const cx=.52, cy=.5, w=Math.sin(t*.8)*.02;
      lm[0]={x:cx,y:cy-.38,visibility:.95};
      lm[11]={x:cx-(R?.12:.05),y:cy-.22,visibility:.95};lm[12]={x:cx+(R?.05:.12),y:cy-.23,visibility:.95};
      lm[13]={x:cx-(R?.22:.02)+w,y:cy-.07,visibility:.95};lm[14]={x:cx+(R?.02:.22),y:cy-.08,visibility:.95};
      lm[15]={x:cx-(R?.28:0),y:cy+.04,visibility:.9};lm[16]={x:cx+(R?0:.28),y:cy+.05,visibility:.9};
      lm[23]={x:cx-.04,y:cy+.02,visibility:.9};lm[24]={x:cx+.05,y:cy+.01,visibility:.9};
      lm[25]={x:cx-.06,y:cy+.22,visibility:.85};lm[26]={x:cx+.07,y:cy+.23,visibility:.85};
      lm[27]={x:cx-.07,y:cy+.44,visibility:.8};lm[28]={x:cx+.09,y:cy+.44,visibility:.8};
      const fSh=lm[R?11:12],fEl=lm[R?13:14],fWr=lm[R?15:16],bSh=lm[R?12:11];
      const LS=lm[11],RS=lm[12],LH=lm[23],RH=lm[24],LA=lm[27],RA=lm[28];
      const ea=Math.round(calcAngle(fSh,fEl,fWr));
      const shTilt=Math.abs(fSh.y-bSh.y);
      const lean=Math.abs((LS.x+RS.x)/2-(LH.x+RH.x)/2);
      const stanceR=ptDist({x:LA.x,y:LA.y},{x:RA.x,y:RA.y})/Math.max(.001,ptDist({x:LS.x,y:LS.y},{x:RS.x,y:RS.y}));
      demoData.push({t,lm,ea,shTilt,lean,stanceR});
    }
    bump(); setScanData(demoData);
    const rep = buildReport(demoData, appMode, appHand);
    setReport(rep);
    showToast("✓ Demo analysis complete");
    setTimeout(() => document.getElementById("results-sec")?.scrollIntoView({behavior:"smooth",block:"start"}), 300);
  }

  /* ── PAYWALL ────────────────────────────── */
  function handleActivate() {
    if (VALID_CODES.includes(codeInput.trim().toUpperCase())) {
      activate(); setCodeFB({ok:true,msg:"✓ Premium activated!"}); setTimeout(()=>setShowPw(false),1400);
    } else setCodeFB({ok:false,msg:"✗ Invalid code"});
  }

  /* ── EXPORT CSV ─────────────────────────── */
  function exportCSV() {
    if (!scanData.length) { showToast("Run analysis first"); return; }
    const rows=["time_s,elbow_deg,shoulder_tilt,body_lean,stance_ratio"];
    scanData.forEach(d=>rows.push(`${d.t.toFixed(2)},${d.ea!==null?d.ea:""},${d.shTilt!==null?d.shTilt.toFixed(3):""},${d.lean!==null?d.lean.toFixed(3):""},${d.stanceR!==null?d.stanceR.toFixed(2):""}`));
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([rows.join("\n")],{type:"text/csv"}));
    a.download=`pitchiq-${appMode}-${Date.now()}.csv`; a.click(); showToast("✓ CSV exported");
  }

  /* ── RESET ──────────────────────────────── */
  function resetAll() {
    setVideoLoaded(false); setIsPlaying(false); setReport(null); setScanData([]);
    setKinPoses([]); clearSkel(); lastPoseRef.current=null;
    const vid=vidRef.current; if(vid){vid.src="";}
    window.scrollTo({top:0,behavior:"smooth"});
  }

  /* ── TIMER COUNTDOWN ────────────────────── */
  const [pwTimer, setPwTimer] = useState("");
  useEffect(() => {
    if (!showPw) return;
    const iv = setInterval(() => {
      const now=new Date(), mid=new Date(now); mid.setHours(24,0,0,0);
      const d=mid-now, h=Math.floor(d/3600000), m=Math.floor((d%3600000)/60000), s=Math.floor((d%60000)/1000);
      setPwTimer(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }, 1000);
    return () => clearInterval(iv);
  }, [showPw]);

  /* ── RENDER ─────────────────────────────── */
  const tgl = (active, extra={}) => ({ ...S.tglBase, ...(active ? {...S.tglOn,...extra} : S.tglOff) });
  const scoreColor = report ? (report.score>=70?c.g:report.score>=50?c.w:c.r) : c.teal;

  return (
    <div style={S.page}>
      {/* HEADER */}
      <div style={S.header}>
        <div style={S.headerTop}>
          <a href="index.html" style={S.brand}>
            <div style={S.brandMark}>PI</div>
            <div style={S.brandName}>Pitch<span style={{color:c.teal}}>IQ</span></div>
          </a>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {isPrem
              ? <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(0,212,168,.08)",border:"1px solid rgba(0,212,168,.2)",borderRadius:20,padding:"4px 10px",fontSize:11,fontWeight:700,color:c.teal}}>⚡ Premium</div>
              : <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{display:"flex",gap:3}}>{[...Array(FREE_LIMIT)].map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:"50%",background:i<uses?"#1c3050":c.teal}}/>)}</div>
                  <span style={{fontSize:11,fontWeight:600,color:"#c8ddf0"}}>{left} left</span>
                  <button onClick={()=>setShowPw(true)} style={{...S.tglBase,...S.tglOn,borderRadius:7,fontSize:12,padding:"6px 12px"}}>⚡ Premium</button>
                </div>
            }
          </div>
        </div>
        <div style={S.modeRow}>
          <div style={S.toggleGroup}>
            <button style={tgl(appMode==="batting")} onClick={()=>{setAppMode("batting");setReport(null);}}>🏏 Batting</button>
            <button style={tgl(appMode==="bowling")} onClick={()=>{setAppMode("bowling");setReport(null);}}>🎯 Bowling</button>
          </div>
          <div style={S.toggleGroup}>
            <button style={tgl(appHand==="right")} onClick={()=>{setAppHand("right");setReport(null);}}>Right</button>
            <button style={tgl(appHand==="left")} onClick={()=>{setAppHand("left");setReport(null);}}>Left</button>
          </div>
          <div style={S.toggleGroup}>
            <button style={tgl(aiMode==="pose")} onClick={()=>setAiMode("pose")}>🦴 33pt</button>
            <button style={tgl(aiMode==="hand",S.tglOnBlue)} onClick={()=>setAiMode("hand")}>✋ Grip</button>
            <button style={tgl(aiMode==="holistic",S.tglOnPurple)} onClick={()=>setAiMode("holistic")}>🌐 543</button>
          </div>
          <span style={{marginLeft:"auto",flexShrink:0,fontSize:10,fontWeight:600,color:c.mu,background:"#0c1628",border:"1px solid rgba(255,255,255,.06)",borderRadius:5,padding:"4px 8px"}}>{aiMode==="pose"?"POSE · 33pts":aiMode==="hand"?"GRIP · 42pts":"HOLISTIC · 543pts"}</span>
        </div>
      </div>

      {/* VIDEO */}
      <div style={S.videoSection}>
        <div style={S.videoWrap}>
          {!videoLoaded && (
            <div style={S.uploadZone} onClick={()=>document.getElementById("fi").click()}>
              <div style={{fontSize:40,marginBottom:14}}>🎬</div>
              <div style={{fontSize:18,fontWeight:700,color:"#fff",marginBottom:8}}>Upload your cricket video</div>
              <div style={{fontSize:13,color:c.mu,lineHeight:1.6,marginBottom:18,maxWidth:280}}>Film side-on at waist height, 5–10m away. We'll analyze your <strong style={{color:"#c8ddf0"}}>entire video</strong> automatically.</div>
              <button style={S.uploadBtn}>Choose Video File</button>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"center"}}>
                {["MP4","MOV","AVI","WebM","≤500MB"].map(f=><span key={f} style={{fontSize:10,fontWeight:600,background:"#101e36",border:"1px solid rgba(255,255,255,.06)",color:c.mu,padding:"3px 8px",borderRadius:20}}>{f}</span>)}
              </div>
              <input id="fi" type="file" accept="video/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&loadVideo(e.target.files[0])}/>
            </div>
          )}
          <video ref={vidRef} style={{...S.video,display:videoLoaded?"block":"none"}} playsInline/>
          <canvas ref={skRef} style={S.canvas}/>
          {/* Hidden off canvas */}
          <canvas ref={offRef} style={{position:"absolute",opacity:0,pointerEvents:"none",top:-9999,left:-9999}}/>

          {/* Overlays */}
          {videoLoaded && <div style={{...S.ovlBadge,top:8,left:8}}>
            <div style={{width:5,height:5,borderRadius:"50%",background:isPlaying?c.g:c.mu,animation:isPlaying?"blink 1.2s ease infinite":"none"}}/>
            <span>{isPlaying?"Tracking live":"Paused"}</span>
          </div>}
          {videoLoaded && <div style={{...S.ovlBadge,top:8,right:8,fontSize:9}}>{fps} fps</div>}

          {/* Scan overlay */}
          {scanning && (
            <div style={S.scanOverlay}>
              <div style={{fontSize:36}}>🤖</div>
              <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>Analyzing Full Video...</div>
              <div style={{fontSize:12,color:c.mu}}>{scanMsg}</div>
              <div style={{width:"100%",maxWidth:260}}>
                <div style={{height:6,background:"rgba(255,255,255,.08)",borderRadius:3,marginBottom:6,overflow:"hidden"}}>
                  <div style={{...S.progressBar,width:`${scanPct}%`,background:c.teal}}/>
                </div>
                <div style={{fontSize:11,fontWeight:700,color:c.teal}}>{scanPct}%</div>
              </div>
              <button onClick={()=>{scanCancelRef.current=true;setScanning(false);}} style={{background:"#152440",border:"1px solid rgba(255,255,255,.1)",color:c.mu,fontSize:11,fontWeight:600,padding:"7px 14px",borderRadius:6,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* CONTROLS */}
      {videoLoaded && (
        <div style={{background:"#0c1628",borderTop:"1px solid rgba(255,255,255,.06)",padding:"8px 12px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
            <span style={{fontSize:11,fontWeight:600,color:c.mu,minWidth:34,textAlign:"center"}}>{fmtT(currentTime)}</span>
            <input type="range" min="0" max="100" step="0.05" value={duration?((currentTime/duration)*100).toFixed(2):0}
              onChange={e=>seekTo(e.target.value)}
              style={{flex:1,accentColor:c.teal,height:4}}/>
            <span style={{fontSize:11,fontWeight:600,color:c.mu,minWidth:34,textAlign:"center"}}>{fmtT(duration)}</span>
          </div>
          <div style={{...S.ctrlRow,marginBottom:6}}>
            <button style={S.ctrlBtn} onClick={()=>stepFrame(-5)}>⟨⟨</button>
            <button style={S.ctrlBtn} onClick={()=>stepFrame(-1)}>◀</button>
            <button style={{...S.ctrlBtn,minWidth:80}} onClick={togglePlay}>{isPlaying?"⏸ Pause":"▶ Play"}</button>
            <button style={S.ctrlBtn} onClick={()=>stepFrame(1)}>▶</button>
            <button style={S.ctrlBtn} onClick={()=>stepFrame(5)}>⟩⟩</button>
            <div style={{flex:1}}/>
            <div style={S.spdSet}>
              {[.25,.5,1,2].map(s=><button key={s} style={{...S.spdBtn,background:speed===s?c.teal:"none",color:speed===s?"#04080f":c.mu,borderRadius:4}} onClick={()=>setSpeedVal(s)}>{s===.25?"¼×":s===.5?"½×":s===1?"1×":"2×"}</button>)}
            </div>
          </div>
          <div style={S.ctrlRow}>
            <button style={{...S.ctrlBtn,borderColor:liveTrack?c.teal:"rgba(255,255,255,.06)",color:liveTrack?c.teal:"#c8ddf0"}} onClick={()=>{setLiveTrack(l=>!l);if(liveTrack)clearSkel();}}>🦴 Live: {liveTrack?"ON":"OFF"}</button>
            <button style={{...S.ctrlBtn,borderColor:skelOnly?c.teal:"rgba(255,255,255,.06)",color:skelOnly?c.teal:"#c8ddf0"}} onClick={()=>{setSkelOnly(s=>!s);const v=vidRef.current;if(v)v.style.opacity=!skelOnly?"0":"1";}}>👻 Skel Only</button>
            {fname && <span style={{fontSize:10,color:c.mu2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120,marginLeft:"auto"}}>{fname}</span>}
          </div>
        </div>
      )}

      {/* ANALYZE ZONE */}
      {videoLoaded && (
        <div style={S.analyzeZone}>
          <button style={{...S.analyzeBtn,opacity:scanning||modelsLoading?.5:1,cursor:scanning||modelsLoading?"not-allowed":"pointer"}}
            disabled={scanning||modelsLoading} onClick={runFullAnalysis}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/><path d="M10 6v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            {scanning?"Scanning...":modelsLoading?"Loading AI...":"Analyze Full Video"}
          </button>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{display:"flex",gap:3}}>{[...Array(3)].map((_,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:i<uses&&!isPrem?"#1c3050":c.teal}}/>)}</div>
              <span style={{fontSize:11,fontWeight:600,color:"#c8ddf0"}}>{isPrem?"Unlimited":left+" left today"}</span>
            </div>
            <button onClick={runDemo} style={{fontSize:11,color:c.mu,background:"none",border:"none",cursor:"pointer",textDecoration:"underline",textUnderlineOffset:3,fontFamily:"inherit"}}>Demo →</button>
          </div>
          <div style={{fontSize:12,color:c.mu2,textAlign:"center",marginTop:6}}>
            {appMode==="batting"?"Scans entire video · elbow angles, shoulder, stance, head":"Scans entire video · arm angle (ICC), front arm, body lean"}
          </div>
        </div>
      )}

      {/* RESULTS DASHBOARD */}
      {report && (
        <div id="results-sec" style={{display:"flex",flexDirection:"column",gap:14,padding:16}}>

          {/* Score card */}
          <div style={S.card}>
            <div style={{display:"flex",alignItems:"center",gap:16,padding:16}}>
              <ScoreRing score={report.score} color={scoreColor}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:18,fontWeight:800,color:report.sColor,marginBottom:3,letterSpacing:"-.01em"}}>{report.grade}</div>
                <div style={{fontSize:12,color:c.mu,lineHeight:1.5}}>{report.consistency}% technical consistency · {report.valid.length} frames analyzed</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                <button onClick={()=>exportCSV()} style={{...S.tglBase,background:"rgba(59,130,246,.1)",border:"1px solid rgba(59,130,246,.3)",color:c.b,borderRadius:7,padding:"7px 11px",fontSize:11}}>📊 CSV</button>
                <button onClick={resetAll} style={{...S.tglBase,background:"#101e36",border:"1px solid rgba(255,255,255,.06)",color:c.mu,borderRadius:7,padding:"7px 11px",fontSize:11}}>↩ Reset</button>
              </div>
            </div>
            {/* Summary chips */}
            <div style={{display:"flex",gap:6,padding:"0 16px 14px",flexWrap:"wrap"}}>
              {[
                {val:report.valid.length,lbl:"Frames",col:c.b},
                {val:report.avgElbow?`${Math.round(report.avgElbow)}°`:"—",lbl:"Avg Elbow",col:report.avgElbow>=85&&report.avgElbow<=145?c.g:c.w},
                {val:`${report.consistency}%`,lbl:"Consistent",col:report.consistency>=70?c.g:report.consistency>=45?c.w:c.r},
                {val:report.best?`${report.best.ea}°`:"—",lbl:"Best Frame",col:c.g},
              ].map((ch,i)=>(
                <div key={i} style={S.chip}>
                  <div style={{...S.chipVal,color:ch.col}}>{ch.val}</div>
                  <div style={S.chipLbl}>{ch.lbl}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div style={S.card}>
            <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.06)",overflowX:"auto",scrollbarWidth:"none"}}>
              {["📈 Angle Timeline","📊 Consistency","🔵 Joint Ranges"].map((t,i)=>(
                <button key={i} style={{...S.chartTab,color:chartTab===i?c.teal:c.mu,borderBottomColor:chartTab===i?c.teal:"transparent"}} onClick={()=>setChartTab(i)}>{t}</button>
              ))}
            </div>
            <div style={{padding:16}}>
              {chartTab===0 && <TimelineChart data={report.valid} duration={report.duration}/>}
              {chartTab===1 && <ConsistencyChart elbows={report.elbows}/>}
              {chartTab===2 && (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {Object.entries(report.measures).map(([k,m])=>{
                    const col=m.s==="g"?c.g:m.s==="w"?c.w:c.r;
                    return (
                      <div key={k} style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{width:90,fontSize:11,color:c.mu,textAlign:"right",flexShrink:0}}>{k}</div>
                        <div style={{flex:1,height:14,background:"rgba(255,255,255,.06)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{...S.progressBar,width:`${Math.min(100,Math.max(0,m.pct))}%`,background:col+"90",height:"100%"}}/>
                        </div>
                        <div style={{fontSize:11,fontWeight:700,color:col,minWidth:50,textAlign:"right"}}>{m.val}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              {chartTab===0 && (
                <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap",fontSize:11}}>
                  {[{col:c.g,lbl:"Good (85–145°)"},{col:c.w,lbl:"Caution"},{col:c.r,lbl:"Critical"}].map((l,i)=>(
                    <div key={i} style={{display:"flex",alignItems:"center",gap:4,color:c.mu}}><div style={{width:8,height:8,borderRadius:"50%",background:l.col,flexShrink:0}}/>{l.lbl}</div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metrics grid */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Joint Measurements</span>
              <span style={{fontSize:11,color:c.mu}}>{report.valid.length} frames · {fmtT(report.duration)}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,padding:12}}>
              {Object.entries(report.measures).map(([k,m])=>{
                const col=m.s==="g"?c.g:m.s==="w"?c.w:c.r;
                return (
                  <div key={k} style={S.metricCell}>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:c.mu,marginBottom:6}}>{k}</div>
                    <div style={{fontSize:22,fontWeight:800,color:"#fff",lineHeight:1,marginBottom:4}}>{m.val}</div>
                    <div style={{fontSize:10,color:c.mu,marginBottom:6}}>Ideal: {m.range}</div>
                    <div style={{height:4,background:"rgba(255,255,255,.06)",borderRadius:2,marginBottom:4,overflow:"hidden"}}>
                      <div style={{...S.progressBar,width:`${Math.min(100,Math.max(0,m.pct))}%`,background:col,height:"100%"}}/>
                    </div>
                    <div style={{fontSize:10,fontWeight:700,color:col}}>{m.note}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key moments */}
          {report.moments.length > 0 && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Key Moments</span>
                <span style={{fontSize:11,color:c.mu}}>Tap to jump to frame</span>
              </div>
              {report.moments.map((m,i)=>(
                <div key={i} style={{...S.km,background:i%2===0?"transparent":"rgba(255,255,255,.01)"}}
                  onClick={()=>jumpTo(m.t)}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.03)"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,.01)"}>
                  <div style={{fontSize:18,flexShrink:0}}>{m.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:600,color:"#fff",marginBottom:2}}>{m.title}</div>
                    <div style={{fontSize:11,color:c.mu}}>{m.sub}</div>
                  </div>
                  <div style={S.kmTime}>{fmtT(m.t)}</div>
                  <div style={{fontSize:14,color:c.mu2,flexShrink:0}}>›</div>
                </div>
              ))}
            </div>
          )}

          {/* Kinogram */}
          {kinPoses.length > 0 && (
            <div style={S.card}>
              <div style={S.cardHeader}>
                <span style={S.cardTitle}>Kinogram</span>
                <span style={{fontSize:11,color:c.mu}}>{kinPoses.length} poses captured</span>
              </div>
              <div style={{padding:14}}>
                <div style={{background:"#000c1a",border:"1px solid rgba(255,255,255,.06)",borderRadius:8,aspectRatio:"16/9",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",marginBottom:10}}>
                  <KinogramCanvas poses={kinPoses}/>
                </div>
                <div style={{fontSize:12,color:c.mu,textAlign:"center"}}>Full motion arc — composited automatically during scan</div>
              </div>
            </div>
          )}

          {/* Feedback accordion */}
          <div style={S.card}>
            <div style={S.cardHeader}>
              <span style={S.cardTitle}>Coaching Feedback</span>
              <span style={{fontSize:11,color:c.mu}}>Tap to expand</span>
            </div>
            <div>
              {report.feedback.map((f,i)=>{
                const icon=f.s==="good"?"✅":f.s==="warn"?"⚠️":"🔴";
                const lBorderCol=f.s==="good"?c.g:f.s==="warn"?c.w:c.r;
                const riskCol=f.risk==="high"?c.r:f.risk==="med"?c.w:c.g;
                const riskBg=f.risk==="high"?"rgba(239,68,68,.1)":f.risk==="med"?"rgba(245,158,11,.1)":"rgba(34,197,94,.1)";
                const isOpen=openFB===i;
                return (
                  <div key={i} style={{...S.fbItem,borderLeft:`3px solid ${lBorderCol}`}}>
                    <div style={{...S.fbHdr,background:isOpen?"rgba(255,255,255,.02)":"transparent"}}
                      onClick={()=>setOpenFB(isOpen?null:i)}>
                      <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
                      <span style={{fontSize:13,fontWeight:600,color:"#fff",flex:1,lineHeight:1.3}}>{f.t}</span>
                      <span style={{fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,background:riskBg,color:riskCol,flexShrink:0}}>{f.risk==="high"?"High risk":f.risk==="med"?"Med risk":"Low risk"}</span>
                      <span style={{fontSize:11,color:c.mu,transition:"transform .2s",transform:isOpen?"rotate(180deg)":"",flexShrink:0}}>▾</span>
                    </div>
                    {isOpen && (
                      <div style={S.fbBody}>
                        <p style={S.fbDesc}>{f.desc}</p>
                        {f.drill && (
                          <div style={S.drillBox}>
                            <div style={{fontSize:9,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",color:c.teal,marginBottom:4}}>⚡ Corrective Drill</div>
                            <div style={{fontSize:12,fontWeight:700,color:"#fff",marginBottom:8}}>{f.drill.title}</div>
                            {f.drill.steps.map((s,j)=>(
                              <div key={j} style={{display:"flex",gap:6,fontSize:12,color:c.mu,lineHeight:1.55,marginBottom:5}}>
                                <span style={{color:c.teal,fontWeight:700,flexShrink:0}}>{j+1}.</span><span>{s}</span>
                              </div>
                            ))}
                            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
                              {f.drill.reps.map((r,j)=><span key={j} style={{fontSize:10,fontWeight:600,background:"rgba(0,212,168,.07)",border:"1px solid rgba(0,212,168,.2)",color:c.teal,padding:"3px 8px",borderRadius:20}}>{r}</span>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAYWALL */}
      {showPw && (
        <div style={S.pwOverlay} onClick={e=>{if(e.target===e.currentTarget)setShowPw(false)}}>
          <div style={S.pwSheet}>
            <button onClick={()=>setShowPw(false)} style={{position:"absolute",top:14,right:16,background:"#152440",border:"1px solid rgba(255,255,255,.1)",color:c.mu,width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,cursor:"pointer"}}>✕</button>
            <div style={{width:36,height:4,background:"rgba(255,255,255,.2)",borderRadius:2,margin:"0 auto 20px"}}/>
            <div style={{fontSize:36,textAlign:"center",marginBottom:12}}>🔒</div>
            <div style={{fontSize:22,fontWeight:800,color:"#fff",textAlign:"center",marginBottom:8}}>Daily limit reached</div>
            <div style={{fontSize:14,color:c.mu,textAlign:"center",lineHeight:1.65,marginBottom:20}}>You've used all 3 free analyses. Upgrade for <strong style={{color:"#c8ddf0",fontWeight:500}}>unlimited full video analysis</strong>.</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:16}}>
              <div style={{fontSize:52,fontWeight:800,color:c.teal,lineHeight:1}}>$5</div>
              <div style={{fontSize:12,color:c.mu,lineHeight:1.4}}>per month<br/>cancel anytime</div>
            </div>
            {[["✓","Unlimited full video analyses"],["✓","All AI engines (543 landmarks)"],["✓","CSV + HTML report export"],["✓","Session history (10 sessions)"]].map(([ico,txt])=>(
              <div key={txt} style={{display:"flex",alignItems:"center",gap:9,fontSize:14,color:"#c8ddf0",marginBottom:8}}>
                <span style={{color:c.teal,fontSize:13,flexShrink:0}}>{ico}</span>{txt}
              </div>
            ))}
            <button onClick={()=>{alert("Use code PITCHIQ-PRO for free Premium!");}} style={{...S.analyzeBtn,marginTop:16,marginBottom:8,borderRadius:10}}>Unlock Premium — $5/month</button>
            <div style={{fontSize:10,color:c.mu2,textAlign:"center",marginBottom:12}}>Resets in <strong style={{color:"#c8ddf0"}}>{pwTimer}</strong></div>
            <div style={{display:"flex",alignItems:"center",gap:8,margin:"12px 0"}}>
              <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}}/>
              <div style={{fontSize:11,color:c.mu2}}>Have a code?</div>
              <div style={{flex:1,height:1,background:"rgba(255,255,255,.06)"}}/>
            </div>
            <div style={{display:"flex",gap:6}}>
              <input value={codeInput} onChange={e=>setCodeInput(e.target.value)} placeholder="Activation code"
                style={{flex:1,background:"#04080f",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,padding:"11px 14px",fontFamily:"inherit",fontSize:14,color:"#c8ddf0",outline:"none"}}/>
              <button onClick={handleActivate} style={{background:"#152440",border:"1px solid rgba(255,255,255,.1)",color:"#c8ddf0",fontFamily:"inherit",fontSize:13,fontWeight:600,padding:"11px 16px",borderRadius:7,cursor:"pointer"}}>Activate</button>
            </div>
            {codeFB && <div style={{fontSize:12,fontWeight:600,marginTop:6,color:codeFB.ok?c.g:c.r}}>{codeFB.msg}</div>}
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div style={S.toast}>{toast}</div>}

      <style>{`
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        *::-webkit-scrollbar{display:none}
      `}</style>
    </div>
  );
}

/* ── KINOGRAM CANVAS ────────────────────────── */
function KinogramCanvas({ poses }) {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current; if (!canvas || !poses.length) return;
    const w = canvas.width = canvas.parentElement.offsetWidth || 320;
    const h = canvas.height = (w * 9/16)|0;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000c1a"; ctx.fillRect(0,0,w,h);
    const PAIRS = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
    poses.forEach((lm, i) => {
      const alpha = 0.06 + 0.94*(i/(poses.length-1));
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = "#00d4a8"; ctx.lineWidth = 2; ctx.lineCap = "round";
      PAIRS.forEach(([a,b]) => {
        if(!lm[a]||!lm[b]||lm[a].visibility<.15||lm[b].visibility<.15) return;
        ctx.beginPath(); ctx.moveTo(lm[a].x*w, lm[a].y*h); ctx.lineTo(lm[b].x*w, lm[b].y*h); ctx.stroke();
      });
      ctx.fillStyle = "#00d4a8";
      [11,12,13,14,15,16,23,24,25,26,27,28].forEach(idx => {
        if(!lm[idx]||lm[idx].visibility<.15) return;
        ctx.beginPath(); ctx.arc(lm[idx].x*w,lm[idx].y*h,3,0,Math.PI*2); ctx.fill();
      });
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,212,168,.6)"; ctx.font = "bold 10px Inter,system-ui"; ctx.textAlign = "center";
    ctx.fillText(`Kinogram — ${poses.length} poses`, w/2, 16); ctx.textAlign = "start";
  }, [poses]);
  return <canvas ref={ref} style={{width:"100%",height:"100%",objectFit:"contain"}}/>;
}
