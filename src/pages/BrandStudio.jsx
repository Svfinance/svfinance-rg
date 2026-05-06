// src/pages/BrandStudio.jsx
// Brand Studio SV Finance — Desktop + Mobile completo
import { useState, useRef, useEffect, useCallback } from "react";

const API = "https://finance-control-api-production.up.railway.app/api";

async function apiFetch(url, opts = {}) {
  const tkn = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${tkn}`, ...(opts.headers || {}) };
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) { localStorage.removeItem("token"); window.location.href = "/"; }
  return res;
}

// ── Presets ──────────────────────────────────────────────────
const PRESETS = [
  { id:"insta_post",      label:"Instagram Post",   icon:"📸", w:1080, h:1080, dw:460, dh:460 },
  { id:"insta_story",     label:"Instagram Story",  icon:"📱", w:1080, h:1920, dw:258, dh:460 },
  { id:"linkedin_post",   label:"LinkedIn Post",    icon:"💼", w:1200, h:627,  dw:460, dh:240 },
  { id:"linkedin_banner", label:"LinkedIn Banner",  icon:"🏷",  w:1584, h:396,  dw:460, dh:115 },
  { id:"landing_hero",    label:"Landing Hero",     icon:"🌐", w:1440, h:600,  dw:460, dh:192 },
];

const PALETTE = [
  "#0A0F1E","#0F3460","#1565C0","#1976D2","#42A5F5",
  "#00B4D8","#00E5FF","#FFD700","#FFC107","#FF8F00",
  "#FFFFFF","#E0E0E0","#9E9E9E","#424242","#00C853",
  "#FF1744","#E040FB","#FF6D00","#0D1B2A","#1A2744",
];

const FONTS = [
  { label:"Bodoni Moda ✦",      val:"Bodoni Moda" },
  { label:"Rajdhani",           val:"Rajdhani" },
  { label:"Orbitron",           val:"Orbitron" },
  { label:"Bebas Neue",         val:"Bebas Neue" },
  { label:"Cinzel",             val:"Cinzel" },
  { label:"Playfair Display",   val:"Playfair Display" },
  { label:"Cormorant Garamond", val:"Cormorant Garamond" },
  { label:"Exo 2",              val:"Exo 2" },
  { label:"Montserrat",         val:"Montserrat" },
  { label:"Poppins",            val:"Poppins" },
  { label:"Space Grotesk",      val:"Space Grotesk" },
  { label:"DM Sans",            val:"DM Sans" },
  { label:"Josefin Sans",       val:"Josefin Sans" },
  { label:"Raleway",            val:"Raleway" },
  { label:"Anton",              val:"Anton" },
  { label:"Nunito",             val:"Nunito" },
];

const CLIP_SHAPES = [
  { id:"none",     label:"Livre",      clip:"none" },
  { id:"circle",   label:"Círculo",    clip:"circle(50%)" },
  { id:"ellipse",  label:"Elipse",     clip:"ellipse(60% 40%)" },
  { id:"diamond",  label:"Diamante",   clip:"polygon(50% 0%,100% 50%,50% 100%,0% 50%)" },
  { id:"triangle", label:"Triângulo",  clip:"polygon(50% 0%,100% 100%,0% 100%)" },
  { id:"hexagon",  label:"Hexágono",   clip:"polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%)" },
  { id:"star",     label:"Estrela",    clip:"polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)" },
  { id:"ribbon",   label:"Faixa",      clip:"polygon(0% 15%,100% 0%,100% 85%,0% 100%)" },
];

const BG_PRESETS = [
  "linear-gradient(135deg,#0A0F1E 0%,#0F3460 50%,#1565C0 100%)",
  "linear-gradient(160deg,#0D1B2A 0%,#1A2744 60%,#0F3460 100%)",
  "linear-gradient(135deg,#0A0F1E 0%,#1A2744 100%)",
  "linear-gradient(135deg,#0F3460,#00B4D8)",
  "linear-gradient(135deg,#FFD700,#FF8F00)",
  "linear-gradient(135deg,#1A2744,#E040FB)",
  "linear-gradient(135deg,#0A0F1E,#00C853)",
  "#0A0F1E","#0F3460","#1A2744",
];

let _id = 300;
const uid = () => `e${_id++}`;

const defText = () => ({
  fontFamily:"Bodoni Moda", fontSize:48, fontWeight:"700",
  color:"#FFFFFF", textAlign:"left", letterSpacing:2,
  lineHeight:1.2, opacity:1, shadow:false,
  shadowColor:"#000", shadowBlur:8,
  italic:false, underline:false,
});

// ── Templates ─────────────────────────────────────────────────
const TEMPLATES = [
  {
    id:"tpl_launch", label:"🚀 Lançamento",
    preview:"linear-gradient(135deg,#0A0F1E,#0F3460,#1565C0)",
    bg:"linear-gradient(135deg,#0A0F1E 0%,#0F3460 50%,#1565C0 100%)",
    elements:[
      { id:uid(),type:"rect",x:.05,y:.05,w:.9,h:.018,fill:"#FFD700",opacity:1,clip:"none" },
      { id:uid(),type:"text",x:.08,y:.14,w:.84,h:.18,text:"SV FINANCE",style:{...defText(),fontSize:72,letterSpacing:10,color:"#FFD700"} },
      { id:uid(),type:"text",x:.08,y:.34,w:.84,h:.1,text:"Controle total do seu negócio",style:{...defText(),fontSize:28,fontWeight:"400",color:"#00E5FF",letterSpacing:1} },
      { id:uid(),type:"text",x:.08,y:.72,w:.7,h:.1,text:"Experimente grátis →",style:{...defText(),fontSize:26,color:"#FFFFFF"} },
      { id:uid(),type:"rect",x:.05,y:.93,w:.9,h:.018,fill:"#FFD700",opacity:.4,clip:"none" },
    ],
  },
  {
    id:"tpl_feature", label:"✨ Feature",
    preview:"linear-gradient(160deg,#0D1B2A,#1A2744,#0F3460)",
    bg:"linear-gradient(160deg,#0D1B2A 0%,#1A2744 60%,#0F3460 100%)",
    elements:[
      { id:uid(),type:"rect",x:0,y:0,w:.006,h:1,fill:"#00E5FF",opacity:1,clip:"none" },
      { id:uid(),type:"text",x:.08,y:.1,w:.84,h:.12,text:"NOVA FUNCIONALIDADE",style:{...defText(),fontSize:20,color:"#00E5FF",letterSpacing:6} },
      { id:uid(),type:"text",x:.08,y:.26,w:.84,h:.22,text:"Integração NF-e",style:{...defText(),fontSize:60,color:"#FFFFFF"} },
      { id:uid(),type:"text",x:.08,y:.55,w:.84,h:.22,text:"Emita notas fiscais direto pelo sistema.",style:{...defText(),fontSize:24,fontWeight:"400",color:"#9E9E9E",letterSpacing:0,lineHeight:1.5} },
    ],
  },
  {
    id:"tpl_promo", label:"💰 Promoção",
    preview:"linear-gradient(135deg,#0A0F1E,#1A2744)",
    bg:"linear-gradient(135deg,#0A0F1E 0%,#1A2744 100%)",
    elements:[
      { id:uid(),type:"rect",x:.05,y:.08,w:.9,h:.84,fill:"#FFD700",opacity:.05,clip:"none" },
      { id:uid(),type:"text",x:.1,y:.12,w:.8,h:.14,text:"PLANO PRO",style:{...defText(),fontSize:52,color:"#FFD700",letterSpacing:8} },
      { id:uid(),type:"text",x:.1,y:.30,w:.8,h:.2,text:"R$ 49/mês",style:{...defText(),fontSize:68,color:"#FFFFFF"} },
      { id:uid(),type:"text",x:.1,y:.55,w:.8,h:.1,text:"Tudo que seu negócio precisa",style:{...defText(),fontSize:22,fontWeight:"400",color:"#00E5FF"} },
    ],
  },
  {
    id:"tpl_mockup", label:"📱 Mockup App",
    preview:"linear-gradient(135deg,#0F3460,#00B4D8)",
    bg:"linear-gradient(135deg,#0F3460 0%,#00B4D8 100%)",
    elements:[
      { id:uid(),type:"rect",x:.35,y:.05,w:.3,h:.9,fill:"#0A0F1E",opacity:.9,clip:"none" },
      { id:uid(),type:"rect",x:.36,y:.07,w:.28,h:.86,fill:"#141A2E",opacity:1,clip:"none" },
      { id:uid(),type:"rect",x:.44,y:.06,w:.12,h:.02,fill:"#0A0F1E",opacity:1,clip:"circle(50%)" },
      { id:uid(),type:"text",x:.02,y:.15,w:.3,h:.2,text:"Gestão financeira inteligente",style:{...defText(),fontSize:28,color:"#FFFFFF",lineHeight:1.3} },
      { id:uid(),type:"text",x:.02,y:.4,w:.3,h:.12,text:"Para MEIs e pequenas empresas",style:{...defText(),fontSize:16,fontWeight:"400",color:"#00E5FF"} },
      { id:uid(),type:"rect",x:.02,y:.6,w:.2,h:.06,fill:"#FFD700",opacity:1,clip:"none" },
      { id:uid(),type:"text",x:.02,y:.6,w:.2,h:.06,text:"Começar grátis",style:{...defText(),fontSize:14,color:"#0A0F1E",fontWeight:"700",textAlign:"center"} },
    ],
  },
  {
    id:"tpl_elegante", label:"✦ Elegante",
    preview:"linear-gradient(135deg,#0A0F1E,#1A2744)",
    bg:"#0A0F1E",
    elements:[
      { id:uid(),type:"rect",x:.1,y:.1,w:.8,h:.8,fill:"#FFFFFF",opacity:.03,clip:"none" },
      { id:uid(),type:"rect",x:.1,y:.1,w:.8,h:.002,fill:"#FFD700",opacity:.6,clip:"none" },
      { id:uid(),type:"rect",x:.1,y:.88,w:.8,h:.002,fill:"#FFD700",opacity:.6,clip:"none" },
      { id:uid(),type:"text",x:.15,y:.18,w:.7,h:.12,text:"SV FINANCE",style:{...defText(),fontSize:44,letterSpacing:14,color:"#FFD700",textAlign:"center"} },
      { id:uid(),type:"text",x:.15,y:.34,w:.7,h:.06,text:"— CONTROLE FINANCEIRO —",style:{...defText(),fontSize:12,letterSpacing:5,color:"#00E5FF",fontWeight:"400",textAlign:"center"} },
      { id:uid(),type:"text",x:.15,y:.52,w:.7,h:.2,text:"Gerencie com inteligência e clareza",style:{...defText(),fontSize:22,fontWeight:"400",color:"#E0E0E0",textAlign:"center",lineHeight:1.5} },
    ],
  },
  {
    id:"tpl_story", label:"📸 Story",
    preview:"linear-gradient(180deg,#0A0F1E,#0F3460)",
    bg:"linear-gradient(180deg,#0A0F1E 0%,#0F3460 60%,#1565C0 100%)",
    elements:[
      { id:uid(),type:"rect",x:.05,y:.85,w:.9,h:.1,fill:"#FFD700",opacity:.08,clip:"none" },
      { id:uid(),type:"text",x:.08,y:.08,w:.84,h:.1,text:"SV FINANCE",style:{...defText(),fontSize:32,letterSpacing:8,color:"#FFD700"} },
      { id:uid(),type:"text",x:.08,y:.3,w:.84,h:.25,text:"Controle suas finanças",style:{...defText(),fontSize:48,color:"#FFFFFF",lineHeight:1.2} },
      { id:uid(),type:"text",x:.08,y:.58,w:.84,h:.12,text:"Simples. Rápido. Eficiente.",style:{...defText(),fontSize:22,fontWeight:"400",color:"#00E5FF",letterSpacing:2} },
      { id:uid(),type:"text",x:.08,y:.85,w:.84,h:.08,text:"svfinance.com.br",style:{...defText(),fontSize:16,fontWeight:"400",color:"rgba(255,255,255,0.5)",letterSpacing:1} },
    ],
  },
  { id:"tpl_blank", label:"⬜ Em branco", preview:"#1A2744", bg:"#0A0F1E", elements:[] },
];

function deepClone(els) {
  return els.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined }));
}

// ── Icon component ────────────────────────────────────────────
const Icon = ({ name, size=16, color="currentColor" }) => {
  const p = { stroke:color, strokeWidth:"1.5", fill:"none", strokeLinecap:"round", strokeLinejoin:"round" };
  const icons = {
    undo:     <path {...p} d="M3 7h10a5 5 0 010 10H8M3 7l4-4M3 7l4 4"/>,
    redo:     <path {...p} d="M21 7H11a5 5 0 000 10h5M21 7l-4-4M21 7l-4 4"/>,
    text:     <><rect x="3" y="3" width="18" height="18" rx="2" {...p}/><path {...p} d="M8 8h8M12 8v8"/></>,
    shape:    <rect x="4" y="4" width="16" height="16" rx="3" {...p}/>,
    image:    <><rect x="3" y="3" width="18" height="18" rx="2" {...p}/><circle cx="8.5" cy="8.5" r="1.5" fill={color} stroke="none"/><path {...p} d="M21 15l-5-5L5 21"/></>,
    magic:    <path {...p} d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>,
    layers:   <><path {...p} d="M12 2L2 7l10 5 10-5-10-5z"/><path {...p} d="M2 17l10 5 10-5M2 12l10 5 10-5"/></>,
    save:     <><path {...p} d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline {...p} points="17 21 17 13 7 13 7 21"/><polyline {...p} points="7 3 7 8 15 8"/></>,
    download: <><path {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></>,
    trash:    <><polyline {...p} points="3 6 5 6 21 6"/><path {...p} d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></>,
    copy:     <><rect x="9" y="9" width="13" height="13" rx="2" {...p}/><path {...p} d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>,
    up:       <path {...p} d="M12 19V5M5 12l7-7 7 7"/>,
    down:     <path {...p} d="M12 5v14M19 12l-7 7-7-7"/>,
    scissors: <><circle cx="6" cy="6" r="3" {...p}/><circle cx="6" cy="18" r="3" {...p}/><line x1="20" y1="4" x2="8.12" y2="15.88" stroke={color} strokeWidth="1.5"/><line x1="14.47" y1="14.48" x2="20" y2="20" stroke={color} strokeWidth="1.5"/></>,
    grid:     <><rect x="3" y="3" width="7" height="7" {...p}/><rect x="14" y="3" width="7" height="7" {...p}/><rect x="14" y="14" width="7" height="7" {...p}/><rect x="3" y="14" width="7" height="7" {...p}/></>,
    lasso:    <path {...p} d="M12 3C7 3 3 6 3 10c0 3 2 5 5 6l1 5h6l1-5c3-1 5-3 5-6 0-4-4-7-9-7z"/>,
    ai:       <><circle cx="12" cy="12" r="10" {...p}/><path {...p} d="M12 8v4l3 3"/></>,
    close:    <path {...p} d="M18 6L6 18M6 6l12 12"/>,
    plus:     <path {...p} d="M12 5v14M5 12h14"/>,
    menu:     <><line x1="3" y1="6" x2="21" y2="6" {...p}/><line x1="3" y1="12" x2="21" y2="12" {...p}/><line x1="3" y1="18" x2="21" y2="18" {...p}/></>,
    pen:      <><path {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path {...p} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    lock:     <><rect x="3" y="11" width="18" height="11" rx="2" {...p}/><path {...p} d="M7 11V7a5 5 0 0110 0v4"/></>,
    unlock:   <><rect x="3" y="11" width="18" height="11" rx="2" {...p}/><path {...p} d="M7 11V7a5 5 0 019.9-1"/></>,
    bold:     <path {...p} d="M6 4h8a4 4 0 010 8H6zm0 8h9a4 4 0 010 8H6z"/>,
    italic:   <><line x1="19" y1="4" x2="10" y2="4" {...p}/><line x1="14" y1="20" x2="5" y2="20" {...p}/><line x1="15" y1="4" x2="9" y2="20" {...p}/></>,
    align_l:  <><line x1="3" y1="6" x2="21" y2="6" {...p}/><line x1="3" y1="12" x2="15" y2="12" {...p}/><line x1="3" y1="18" x2="18" y2="18" {...p}/></>,
    align_c:  <><line x1="3" y1="6" x2="21" y2="6" {...p}/><line x1="6" y1="12" x2="18" y2="12" {...p}/><line x1="4" y1="18" x2="20" y2="18" {...p}/></>,
    align_r:  <><line x1="3" y1="6" x2="21" y2="6" {...p}/><line x1="9" y1="12" x2="21" y2="12" {...p}/><line x1="6" y1="18" x2="21" y2="18" {...p}/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" style={{flexShrink:0}}>{icons[name]}</svg>;
};

// ── Logo SV Finance ───────────────────────────────────────────
const SVLogo = ({ size=24 }) => (
  <svg viewBox="0 0 28 28" style={{width:size,height:size,flexShrink:0}}>
    <defs>
      <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFD700"/><stop offset="100%" stopColor="#FF8F00"/></linearGradient>
      <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#00E5FF"/><stop offset="100%" stopColor="#1565C0"/></linearGradient>
    </defs>
    <polygon points="14,2 26,24 2,24" fill="none" stroke="url(#lg1)" strokeWidth="2"/>
    <polygon points="14,8 22,22 6,22" fill="none" stroke="url(#lg2)" strokeWidth="1.5"/>
  </svg>
);

// ── Design tokens ─────────────────────────────────────────────
const C = {
  bg0:"#070B14", bg1:"#0D1221", bg2:"#141A2E", bg3:"#1A2240",
  border:"rgba(255,255,255,0.06)", border2:"rgba(255,255,255,0.10)",
  accent:"#00E5FF", gold:"#FFD700", muted:"rgba(255,255,255,0.4)",
  text:"rgba(255,255,255,0.85)", danger:"#FF1744",
};

export default function BrandStudio() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [preset, setPreset]     = useState(PRESETS[0]);
  const [bg, setBg]             = useState(TEMPLATES[0].bg);
  const [elements, setElements] = useState(deepClone(TEMPLATES[0].elements));
  const [selected, setSelected] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({x:0,y:0});
  const [resizing, setResizing] = useState(null); // {id, handle, startX, startY, startEl}
  const [editingText, setEditingText] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom]         = useState(1);
  const [history, setHistory]   = useState([]);
  const [histIdx, setHistIdx]   = useState(-1);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [rmbLoading, setRmbLoading] = useState(false);
  const [lassoMode, setLassoMode] = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);
  const [isLassoing, setIsLassoing] = useState(false);
  const [toast, setToast]       = useState(null);
  const [projects, setProjects] = useState([]);
  const [assets, setAssets]     = useState([]);
  const [projectName, setProjectName] = useState("Meu Post");
  const [exportLoading, setExportLoading] = useState(false);
  const [leftPanel, setLeftPanel] = useState("templates");
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  // Mobile
  const [mobileDrawer, setMobileDrawer] = useState(null); // null|templates|layers|props|ai|projects
  const [pinchStart, setPinchStart] = useState(null);

  const canvasRef = useRef(null);
  const fileRef   = useRef(null);
  const assetRef  = useRef(null);
  const editRef   = useRef(null);

  const cw = preset.dw;
  const ch = preset.dh;
  const selectedEl = elements.find(e => e.id === selected);

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  // ── History ──────────────────────────────────────────────
  const pushHistory = useCallback((els) => {
    setHistory(h => [...h.slice(0, histIdx + 1), deepClone(els)].slice(-40));
    setHistIdx(i => Math.min(i + 1, 39));
  }, [histIdx]);

  const undo = useCallback(() => {
    if (histIdx <= 0) return;
    const ni = histIdx - 1;
    setElements(deepClone(history[ni]));
    setHistIdx(ni);
  }, [histIdx, history]);

  const redo = useCallback(() => {
    if (histIdx >= history.length - 1) return;
    const ni = histIdx + 1;
    setElements(deepClone(history[ni]));
    setHistIdx(ni);
  }, [histIdx, history]);

  useEffect(() => {
    pushHistory(elements);
    loadProjects();
    loadAssets();
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (editingText) return;
      if ((e.metaKey||e.ctrlKey) && e.key==="z") { e.preventDefault(); undo(); }
      if ((e.metaKey||e.ctrlKey) && e.key==="y") { e.preventDefault(); redo(); }
      if ((e.key==="Delete"||e.key==="Backspace") &&
          document.activeElement.tagName!=="INPUT" &&
          document.activeElement.tagName!=="TEXTAREA") deleteSelected();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo, selected, editingText]);

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(() => setToast(null), 3500);
  };

  // ── Element ops ──────────────────────────────────────────
  const updateEl = (id, patch) => setElements(els => {
    const n = els.map(e => e.id===id ? {...e,...patch} : e);
    pushHistory(n); return n;
  });
  const updateStyle = (id, patch) => setElements(els => {
    const n = els.map(e => e.id===id ? {...e, style:{...e.style,...patch}} : e);
    pushHistory(n); return n;
  });

  const addText = () => {
    const el = {id:uid(),type:"text",x:.1,y:.1,w:.8,h:.15,text:"Novo Texto",style:defText(),clip:"none"};
    setElements(els => { const n=[...els,el]; pushHistory(n); return n; });
    setSelected(el.id);
    if (isMobile) setMobileDrawer("props");
  };

  const addRect = () => {
    const el = {id:uid(),type:"rect",x:.2,y:.2,w:.5,h:.12,fill:"#1565C0",opacity:1,clip:"none"};
    setElements(els => { const n=[...els,el]; pushHistory(n); return n; });
    setSelected(el.id);
  };

  const duplicateEl = () => {
    if (!selectedEl) return;
    const clone = {...selectedEl, id:uid(), x:selectedEl.x+.03, y:selectedEl.y+.03,
      style:selectedEl.style?{...selectedEl.style}:undefined};
    setElements(els => { const n=[...els,clone]; pushHistory(n); return n; });
    setSelected(clone.id);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setElements(els => { const n=els.filter(e=>e.id!==selected); pushHistory(n); return n; });
    setSelected(null);
    setEditingText(null);
  };

  const moveLayer = (id, dir) => {
    setElements(els => {
      const idx = els.findIndex(e => e.id===id);
      if (idx<0) return els;
      const n = [...els], t = idx+dir;
      if (t<0||t>=n.length) return els;
      [n[idx],n[t]] = [n[t],n[idx]];
      pushHistory(n); return n;
    });
  };

  const applyTemplate = (tpl) => {
    setBg(tpl.bg);
    const els = deepClone(tpl.elements).map(e => ({...e, id:uid(), clip:e.clip||"none"}));
    setElements(els); pushHistory(els); setSelected(null);
    setEditingText(null);
    if (isMobile) setMobileDrawer(null);
  };

  // ── Upload ────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const el = {id:uid(),type:"image",x:.1,y:.1,w:.4,h:.4,src:ev.target.result,opacity:1,clip:"none"};
      setElements(els => { const n=[...els,el]; pushHistory(n); return n; });
      setSelected(el.id);
    };
    reader.readAsDataURL(file);
    e.target.value="";
  };

  // ── Remove BG ─────────────────────────────────────────────
  const handleRemoveBg = async () => {
    if (!selectedEl || selectedEl.type!=="image") { showToast("Selecione uma imagem primeiro.","error"); return; }
    setRmbLoading(true);
    showToast("Removendo fundo...","info");
    try {
      const src = selectedEl.src;
      let blob;
      if (src.startsWith("data:")) {
        const [header, b64] = src.split(",");
        const mime = header.match(/:(.*?);/)[1];
        const bytes = atob(b64);
        const u8 = new Uint8Array(bytes.length);
        for (let i=0;i<bytes.length;i++) u8[i]=bytes.charCodeAt(i);
        blob = new Blob([u8],{type:mime});
      } else {
        blob = await (await fetch(src)).blob();
      }
      const fd = new FormData();
      fd.append("image", blob, "img.png");
      const res = await apiFetch(`${API}/brand-studio/remove-bg`,{method:"POST",body:fd});
      if (!res.ok) { const d=await res.json(); throw new Error(d.msg||"Erro"); }
      const url = URL.createObjectURL(await res.blob());
      updateEl(selected, {src:url});
      showToast("✨ Fundo removido!");
    } catch(err) { showToast(err.message||"Erro ao remover fundo.","error"); }
    setRmbLoading(false);
  };

  // ── AI Copy ───────────────────────────────────────────────
  const generateAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiFetch(`${API}/brand-studio/ai-copy`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt:aiPrompt}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      const {title,subtitle,cta} = data;
      const els = [
        {id:uid(),type:"text",x:.08,y:.2,w:.84,h:.15,text:title,style:{...defText(),fontSize:48},clip:"none"},
        {id:uid(),type:"text",x:.08,y:.4,w:.84,h:.1,text:subtitle,style:{...defText(),fontSize:24,fontWeight:"400",color:"#00E5FF"},clip:"none"},
        {id:uid(),type:"text",x:.08,y:.7,w:.6,h:.1,text:cta,style:{...defText(),fontSize:22,color:"#FFD700"},clip:"none"},
      ];
      setElements(prev => { const n=[...prev,...els]; pushHistory(n); return n; });
      setAiPrompt("");
      showToast("✨ Textos gerados!");
      if (isMobile) setMobileDrawer(null);
    } catch(err) { showToast(err.message||"Erro.","error"); }
    setAiLoading(false);
  };

  // ── Projects & Assets ────────────────────────────────────
  const loadProjects = async () => {
    try { const r=await apiFetch(`${API}/brand-studio/projects`); const d=await r.json(); setProjects(Array.isArray(d)?d:[]); } catch {}
  };
  const loadAssets = async () => {
    try { const r=await apiFetch(`${API}/brand-studio/assets`); const d=await r.json(); setAssets(Array.isArray(d)?d:[]); } catch {}
  };
  const saveProject = async () => {
    const payload = {name:projectName, canvas_data:JSON.stringify({bg,elements}), format:preset.id};
    try {
      const r = await apiFetch(`${API}/brand-studio/projects`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if (r.ok) { showToast("💾 Projeto salvo!"); loadProjects(); }
    } catch { showToast("Erro.","error"); }
  };
  const loadProject = (proj) => {
    try {
      const {bg:b, elements:els} = JSON.parse(proj.canvas_data);
      setBg(b);
      const loaded = deepClone(els).map(e=>({...e,clip:e.clip||"none"}));
      setElements(loaded); pushHistory(loaded); setSelected(null); setEditingText(null);
      const p = PRESETS.find(p=>p.id===proj.format)||PRESETS[0];
      setPreset(p); setProjectName(proj.name);
      showToast("Projeto carregado!");
      if (isMobile) setMobileDrawer(null);
    } catch { showToast("Erro ao carregar.","error"); }
  };
  const deleteProject = async (id) => {
    await apiFetch(`${API}/brand-studio/projects/${id}`,{method:"DELETE"});
    loadProjects();
  };
  const handleAssetUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append("file",file);
    const r = await apiFetch(`${API}/brand-studio/assets`,{method:"POST",body:fd});
    if (r.ok) { showToast("Asset salvo!"); loadAssets(); }
    e.target.value="";
  };
  const useAsset = (url) => {
    const el = {id:uid(),type:"image",x:.1,y:.1,w:.4,h:.4,src:url,opacity:1,clip:"none"};
    setElements(els => { const n=[...els,el]; pushHistory(n); return n; });
    setSelected(el.id);
    if (isMobile) setMobileDrawer(null);
  };

  // ── Export ────────────────────────────────────────────────
  const exportCanvas = () => {
    setEditingText(null); setSelected(null);
    setExportLoading(true);
    setTimeout(() => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
      script.onload = () => {
        window.html2canvas(canvasRef.current,{useCORS:true,allowTaint:true,scale:preset.w/cw,backgroundColor:null}).then(canvas => {
          const link = document.createElement("a");
          link.download = `sv-finance-${preset.id}-${Date.now()}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
          setExportLoading(false);
          showToast("PNG exportado!");
        });
      };
      document.head.appendChild(script);
    }, 100);
  };

  // ── Drag ─────────────────────────────────────────────────
  const onElMouseDown = (e, id) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (editingText === id) return;
    setEditingText(null);
    setSelected(id);
    if (lassoMode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const el = elements.find(x => x.id===id);
    setDragging(id);
    setDragOffset({x:e.clientX-rect.left-el.x*cw, y:e.clientY-rect.top-el.y*ch});
  };

  // ── Resize handles ────────────────────────────────────────
  const onResizeStart = (e, id, handle) => {
    e.stopPropagation(); e.preventDefault();
    const el = elements.find(x => x.id===id);
    setResizing({id, handle, startX:e.clientX, startY:e.clientY, startEl:{...el}});
  };

  const onMouseMove = useCallback((e) => {
    if (dragging && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const nx = (e.clientX-rect.left-dragOffset.x)/cw;
      const ny = (e.clientY-rect.top-dragOffset.y)/ch;
      setElements(els => els.map(el => el.id===dragging
        ? {...el, x:Math.max(0,Math.min(nx,.97)), y:Math.max(0,Math.min(ny,.97))}
        : el
      ));
    }
    if (resizing) {
      const {id, handle, startX, startY, startEl} = resizing;
      const dx = (e.clientX-startX)/cw;
      const dy = (e.clientY-startY)/ch;
      setElements(els => els.map(el => {
        if (el.id!==id) return el;
        let {x,y,w,h} = startEl;
        if (handle.includes("e")) w = Math.max(.05, w+dx);
        if (handle.includes("s")) h = Math.max(.03, h+dy);
        if (handle.includes("w")) { x = Math.min(x+dx, x+w-.05); w = Math.max(.05, w-dx); }
        if (handle.includes("n")) { y = Math.min(y+dy, y+h-.03); h = Math.max(.03, h-dy); }
        return {...el, x, y, w, h};
      }));
    }
  }, [dragging, dragOffset, cw, ch, resizing]);

  const onMouseUp = useCallback(() => {
    if (dragging) pushHistory(elements);
    if (resizing) pushHistory(elements);
    setDragging(null);
    setResizing(null);
  }, [dragging, resizing, elements]);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => { window.removeEventListener("mousemove", onMouseMove); window.removeEventListener("mouseup", onMouseUp); };
  }, [onMouseMove, onMouseUp]);

  // ── Touch drag (mobile) ───────────────────────────────────
  const onTouchStart = (e, id) => {
    if (e.touches.length > 1) return;
    setEditingText(null);
    setSelected(id);
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const el = elements.find(x => x.id===id);
    setDragging(id);
    setDragOffset({x:touch.clientX-rect.left-el.x*cw, y:touch.clientY-rect.top-el.y*ch});
  };

  const onTouchMove = useCallback((e) => {
    if (!dragging || !canvasRef.current || e.touches.length > 1) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvasRef.current.getBoundingClientRect();
    const nx = (touch.clientX-rect.left-dragOffset.x)/cw;
    const ny = (touch.clientY-rect.top-dragOffset.y)/ch;
    setElements(els => els.map(el => el.id===dragging
      ? {...el, x:Math.max(0,Math.min(nx,.97)), y:Math.max(0,Math.min(ny,.97))}
      : el
    ));
  }, [dragging, dragOffset, cw, ch]);

  const onTouchEnd = useCallback(() => {
    if (dragging) pushHistory(elements);
    setDragging(null);
  }, [dragging, elements]);

  // ── Lasso ────────────────────────────────────────────────
  const startLasso = (e) => { if (!lassoMode) return; const rect=canvasRef.current.getBoundingClientRect(); setIsLassoing(true); setLassoPoints([{x:e.clientX-rect.left,y:e.clientY-rect.top}]); };
  const moveLasso  = (e) => { if (!isLassoing||!lassoMode) return; const rect=canvasRef.current.getBoundingClientRect(); setLassoPoints(pts=>[...pts,{x:e.clientX-rect.left,y:e.clientY-rect.top}]); };
  const endLasso   = () => {
    if (!isLassoing||!lassoMode||!selectedEl||selectedEl.type!=="image") { setIsLassoing(false); setLassoPoints([]); return; }
    const pts = lassoPoints; if (pts.length<3) { setIsLassoing(false); setLassoPoints([]); return; }
    const el = selectedEl;
    const poly = pts.map(p => {
      const px = Math.max(0,Math.min(100,((p.x-el.x*cw)/(el.w*cw))*100));
      const py = Math.max(0,Math.min(100,((p.y-el.y*ch)/(el.h*ch))*100));
      return `${px.toFixed(1)}% ${py.toFixed(1)}%`;
    }).join(",");
    updateEl(selected,{clip:`polygon(${poly})`});
    setIsLassoing(false); setLassoPoints([]);
    showToast("Recorte aplicado!");
  };

  // ── Render element ────────────────────────────────────────
  const renderEl = (el) => {
    const isSel = el.id===selected;
    const isEditing = el.id===editingText;
    const clipShape = CLIP_SHAPES.find(c=>c.id===el.clip)||CLIP_SHAPES[0];
    const clipVal   = el.clip?.startsWith("polygon(") ? el.clip : (clipShape?.clip||"none");
    const base = {
      position:"absolute", left:el.x*cw, top:el.y*ch, width:el.w*cw, height:el.h*ch,
      opacity:el.opacity??1, boxSizing:"border-box",
      clipPath:clipVal!=="none"?clipVal:undefined,
    };

    const handles = isSel && !isEditing ? ["n","s","e","w","ne","nw","se","sw"] : [];
    const handleSize = isMobile ? 14 : 8;

    const handlePos = (h) => {
      const map = {
        n:{top:-handleSize/2,left:"50%",transform:"translateX(-50%)",cursor:"n-resize"},
        s:{bottom:-handleSize/2,left:"50%",transform:"translateX(-50%)",cursor:"s-resize"},
        e:{right:-handleSize/2,top:"50%",transform:"translateY(-50%)",cursor:"e-resize"},
        w:{left:-handleSize/2,top:"50%",transform:"translateY(-50%)",cursor:"w-resize"},
        ne:{top:-handleSize/2,right:-handleSize/2,cursor:"ne-resize"},
        nw:{top:-handleSize/2,left:-handleSize/2,cursor:"nw-resize"},
        se:{bottom:-handleSize/2,right:-handleSize/2,cursor:"se-resize"},
        sw:{bottom:-handleSize/2,left:-handleSize/2,cursor:"sw-resize"},
      };
      return map[h];
    };

    const selOverlay = isSel ? {
      outline:"2px solid rgba(0,229,255,0.9)",
      outlineOffset:"1px",
    } : {};

    if (el.type==="rect") return (
      <div key={el.id} style={{...base,...selOverlay, background:el.fill, cursor:"grab"}}
        onMouseDown={e=>onElMouseDown(e,el.id)}
        onTouchStart={e=>onTouchStart(e,el.id)}>
        {handles.map(h=>(
          <div key={h} onMouseDown={e=>onResizeStart(e,el.id,h)}
            style={{position:"absolute",...handlePos(h),width:handleSize,height:handleSize,background:C.accent,borderRadius:2,zIndex:10,...handlePos(h)}}/>
        ))}
      </div>
    );

    if (el.type==="text") {
      const s = el.style||{};
      if (isEditing) return (
        <textarea key={el.id} ref={editRef}
          value={el.text}
          onChange={e=>updateEl(el.id,{text:e.target.value})}
          onBlur={()=>setEditingText(null)}
          style={{
            ...base, outline:"2px solid rgba(0,229,255,0.9)", outlineOffset:"1px",
            fontFamily:`'${s.fontFamily}',serif`, fontSize:s.fontSize*(cw/480),
            fontWeight:s.fontWeight, color:s.color, textAlign:s.textAlign,
            letterSpacing:s.letterSpacing, lineHeight:s.lineHeight,
            fontStyle:s.italic?"italic":"normal",
            background:"rgba(0,0,0,0.3)", border:"none", resize:"none",
            padding:"2px 4px", cursor:"text", zIndex:20,
          }}
          onClick={e=>e.stopPropagation()}
          autoFocus
        />
      );
      return (
        <div key={el.id} style={{
          ...base,...selOverlay,
          fontFamily:`'${s.fontFamily}',serif`,
          fontSize:s.fontSize*(cw/480), fontWeight:s.fontWeight,
          color:s.color, textAlign:s.textAlign,
          letterSpacing:s.letterSpacing, lineHeight:s.lineHeight,
          fontStyle:s.italic?"italic":"normal",
          textDecoration:s.underline?"underline":"none",
          userSelect:"none", display:"flex", alignItems:"center",
          textShadow:s.shadow?`0 2px ${s.shadowBlur}px ${s.shadowColor}`:"none",
          whiteSpace:"pre-wrap", wordBreak:"break-word", padding:"2px 4px",
          cursor:"grab",
        }}
          onMouseDown={e=>onElMouseDown(e,el.id)}
          onDoubleClick={e=>{e.stopPropagation();setEditingText(el.id);setTimeout(()=>editRef.current?.focus(),50);}}
          onTouchStart={e=>onTouchStart(e,el.id)}>
          {el.text}
          {handles.map(h=>(
            <div key={h} onMouseDown={e=>onResizeStart(e,el.id,h)}
              style={{position:"absolute",...handlePos(h),width:handleSize,height:handleSize,background:C.accent,borderRadius:2,zIndex:10}}/>
          ))}
        </div>
      );
    }

    if (el.type==="image") return (
      <div key={el.id} style={{...base,...selOverlay,cursor:"grab"}}
        onMouseDown={e=>onElMouseDown(e,el.id)}
        onTouchStart={e=>onTouchStart(e,el.id)}>
        <img src={el.src} alt="" draggable={false} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}/>
        {handles.map(h=>(
          <div key={h} onMouseDown={e=>onResizeStart(e,el.id,h)}
            style={{position:"absolute",...handlePos(h),width:handleSize,height:handleSize,background:C.accent,borderRadius:2,zIndex:10}}/>
        ))}
      </div>
    );
    return null;
  };

  // ── Shared UI helpers ─────────────────────────────────────
  const propLabel = (t) => (
    <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5,marginTop:12}}>{t}</div>
  );
  const propInput = {
    width:"100%", background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border2}`,
    borderRadius:8, padding:"7px 10px", color:C.text, fontSize:12,
    fontFamily:"inherit", boxSizing:"border-box", outline:"none",
  };
  const propSelect = {...propInput, cursor:"pointer"};

  const miniSlider = (val,min,max,step,onChange,label,fmt=v=>v) => (
    <div>
      {propLabel(`${label} — ${fmt(val)}`)}
      <input type="range" min={min} max={max} step={step} value={val} onChange={onChange} style={{width:"100%",accentColor:C.accent}}/>
    </div>
  );

  const iconBtn = (onClick,iconName,label,active=false,danger=false,disabled=false) => (
    <button onClick={onClick} disabled={disabled} title={label} style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      width:isMobile?40:36, height:isMobile?40:36, borderRadius:10, border:"none",
      cursor:disabled?"not-allowed":"pointer",
      background:active?"rgba(0,229,255,0.15)":danger?"rgba(255,23,68,0.12)":"rgba(255,255,255,0.05)",
      color:active?C.accent:danger?C.danger:C.muted,
      transition:"all .15s", opacity:disabled?.4:1,
    }}>
      <Icon name={iconName} size={isMobile?18:16} color={active?C.accent:danger?C.danger:C.muted}/>
    </button>
  );

  // ── Properties panel content (shared desktop+mobile) ─────
  const PropertiesContent = () => (
    <div style={{padding:"8px 14px",overflowY:"auto",flex:1}}>
      {!selectedEl && (
        <>
          {propLabel("Plano de Fundo")}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:10}}>
            {BG_PRESETS.map((b,i)=>(
              <div key={i} onClick={()=>setBg(b)} style={{
                height:32,background:b,borderRadius:7,cursor:"pointer",
                border:bg===b?`2px solid ${C.accent}`:`2px solid ${C.border}`,
              }}/>
            ))}
          </div>
          {propLabel("Cor personalizada")}
          <input type="color" defaultValue="#0A0F1E" onChange={e=>setBg(e.target.value)}
            style={{width:"100%",height:36,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",background:"none"}}/>
          <div style={{marginTop:12,fontSize:10,color:C.muted,lineHeight:1.6,textAlign:"center"}}>
            Toque duplo num texto para editar<br/>Arraste os handles para redimensionar
          </div>
        </>
      )}

      {selectedEl?.type==="text" && (
        <>
          {propLabel("Conteúdo")}
          <textarea value={selectedEl.text} onChange={e=>updateEl(selected,{text:e.target.value})}
            style={{...propInput,height:60,resize:"none",lineHeight:1.5}}/>

          {propLabel("Fonte")}
          <select value={selectedEl.style.fontFamily} onChange={e=>updateStyle(selected,{fontFamily:e.target.value})} style={propSelect}>
            {FONTS.map(f=><option key={f.val} value={f.val}>{f.label}</option>)}
          </select>

          {miniSlider(selectedEl.style.fontSize,8,150,1,e=>updateStyle(selected,{fontSize:Number(e.target.value)}),"Tamanho",v=>`${v}px`)}

          {propLabel("Estilo")}
          <div style={{display:"flex",gap:4,marginBottom:4}}>
            {["300","400","600","700","800"].map(w=>(
              <button key={w} onClick={()=>updateStyle(selected,{fontWeight:w})} style={{
                flex:1,padding:"5px 2px",background:selectedEl.style.fontWeight===w?"rgba(0,229,255,0.15)":"rgba(255,255,255,0.04)",
                border:`1px solid ${selectedEl.style.fontWeight===w?"rgba(0,229,255,0.4)":C.border}`,
                borderRadius:6,color:selectedEl.style.fontWeight===w?C.accent:C.muted,cursor:"pointer",fontSize:10,
              }}>{w}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:4,marginBottom:4}}>
            <button onClick={()=>updateStyle(selected,{italic:!selectedEl.style.italic})} style={{
              flex:1,padding:"6px",background:selectedEl.style.italic?"rgba(0,229,255,0.12)":"rgba(255,255,255,0.04)",
              border:`1px solid ${selectedEl.style.italic?"rgba(0,229,255,0.3)":C.border}`,borderRadius:8,color:selectedEl.style.italic?C.accent:C.muted,cursor:"pointer"
            }}><Icon name="italic" size={14} color={selectedEl.style.italic?C.accent:C.muted}/></button>
            <button onClick={()=>updateStyle(selected,{underline:!selectedEl.style.underline})} style={{
              flex:1,padding:"6px",background:selectedEl.style.underline?"rgba(0,229,255,0.12)":"rgba(255,255,255,0.04)",
              border:`1px solid ${selectedEl.style.underline?"rgba(0,229,255,0.3)":C.border}`,borderRadius:8,color:selectedEl.style.underline?C.accent:C.muted,cursor:"pointer"
            }}>U̲</button>
            {[["left","align_l"],["center","align_c"],["right","align_r"]].map(([a,ic])=>(
              <button key={a} onClick={()=>updateStyle(selected,{textAlign:a})} style={{
                flex:1,padding:"6px",background:selectedEl.style.textAlign===a?"rgba(0,229,255,0.12)":"rgba(255,255,255,0.04)",
                border:`1px solid ${selectedEl.style.textAlign===a?"rgba(0,229,255,0.3)":C.border}`,borderRadius:8,cursor:"pointer"
              }}><Icon name={ic} size={14} color={selectedEl.style.textAlign===a?C.accent:C.muted}/></button>
            ))}
          </div>

          {miniSlider(selectedEl.style.letterSpacing,0,20,1,e=>updateStyle(selected,{letterSpacing:Number(e.target.value)}),"Espaçamento",v=>`${v}px`)}
          {miniSlider(selectedEl.opacity??1,0,1,.05,e=>updateEl(selected,{opacity:Number(e.target.value)}),"Opacidade",v=>`${Math.round(v*100)}%`)}

          {propLabel("Cor")}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,marginBottom:6}}>
            {PALETTE.map(c=>(
              <div key={c} onClick={()=>updateStyle(selected,{color:c})} style={{
                height:24,background:c,borderRadius:5,cursor:"pointer",
                border:selectedEl.style.color===c?`2px solid ${C.accent}`:`1px solid ${C.border}`,
              }}/>
            ))}
          </div>
          <input type="color" value={selectedEl.style.color} onChange={e=>updateStyle(selected,{color:e.target.value})}
            style={{width:"100%",height:32,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",background:"none"}}/>
          {propLabel("Sombra")}
          <label style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:C.muted,cursor:"pointer"}}>
            <input type="checkbox" checked={selectedEl.style.shadow||false} onChange={e=>updateStyle(selected,{shadow:e.target.checked})} style={{accentColor:C.accent}}/>
            Ativar sombra
          </label>
        </>
      )}

      {selectedEl?.type==="rect" && (
        <>
          {propLabel("Cor da Forma")}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,marginBottom:6}}>
            {PALETTE.map(c=>(
              <div key={c} onClick={()=>updateEl(selected,{fill:c})} style={{
                height:24,background:c,borderRadius:5,cursor:"pointer",
                border:selectedEl.fill===c?`2px solid ${C.accent}`:`1px solid ${C.border}`,
              }}/>
            ))}
          </div>
          <input type="color" value={selectedEl.fill} onChange={e=>updateEl(selected,{fill:e.target.value})}
            style={{width:"100%",height:32,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",background:"none"}}/>
          {miniSlider(selectedEl.opacity??1,0,1,.05,e=>updateEl(selected,{opacity:Number(e.target.value)}),"Opacidade",v=>`${Math.round(v*100)}%`)}
          {propLabel("Recorte")}
          <select value={selectedEl.clip||"none"} onChange={e=>updateEl(selected,{clip:e.target.value})} style={propSelect}>
            {CLIP_SHAPES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </>
      )}

      {selectedEl?.type==="image" && (
        <>
          <div style={{padding:"10px 12px",background:"rgba(0,229,255,0.05)",border:`1px solid rgba(0,229,255,0.15)`,borderRadius:12,marginBottom:8}}>
            <div style={{fontSize:10,color:C.accent,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>REMOVER FUNDO</div>
            <button onClick={handleRemoveBg} disabled={rmbLoading} style={{
              width:"100%",padding:"9px",
              background:rmbLoading?"rgba(255,255,255,0.04)":"linear-gradient(135deg,rgba(0,229,255,0.15),rgba(0,180,216,0.15))",
              border:`1px solid ${rmbLoading?"rgba(255,255,255,0.08)":"rgba(0,229,255,0.3)"}`,
              borderRadius:9,color:rmbLoading?C.muted:C.accent,cursor:rmbLoading?"wait":"pointer",
              fontFamily:"inherit",fontWeight:700,fontSize:12,
              display:"flex",alignItems:"center",justifyContent:"center",gap:6,
              opacity:rmbLoading?.6:1,
            }}>
              <Icon name="scissors" size={14} color={rmbLoading?C.muted:C.accent}/>
              {rmbLoading?"Processando...":"Remover fundo"}
            </button>
          </div>
          {miniSlider(selectedEl.opacity??1,0,1,.05,e=>updateEl(selected,{opacity:Number(e.target.value)}),"Opacidade",v=>`${Math.round(v*100)}%`)}
          {miniSlider(selectedEl.w,.05,1,.01,e=>updateEl(selected,{w:Number(e.target.value)}),"Largura",v=>`${Math.round(v*100)}%`)}
          {miniSlider(selectedEl.h,.05,1,.01,e=>updateEl(selected,{h:Number(e.target.value)}),"Altura",v=>`${Math.round(v*100)}%`)}
          {propLabel("Recorte por Forma")}
          <select value={CLIP_SHAPES.find(s=>s.clip===selectedEl.clip)?.id||"none"}
            onChange={e=>{const sh=CLIP_SHAPES.find(s=>s.id===e.target.value);updateEl(selected,{clip:sh?.clip||"none"});}} style={propSelect}>
            {CLIP_SHAPES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </>
      )}

      {selectedEl && (
        <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
          {propLabel("Posição X / Y")}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {[["X",selectedEl.x,"x"],["Y",selectedEl.y,"y"]].map(([lbl,val,key])=>(
              <div key={key}>
                <div style={{fontSize:9,color:C.muted,marginBottom:3}}>{lbl}%</div>
                <input type="number" value={Math.round(val*100)} min="0" max="97"
                  onChange={e=>updateEl(selected,{[key]:Number(e.target.value)/100})}
                  style={{...propInput}}/>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:6,marginTop:10}}>
            {iconBtn(duplicateEl,"copy","Duplicar")}
            {iconBtn(deleteSelected,"trash","Deletar",false,true)}
            {iconBtn(()=>moveLayer(selected,-1),"up","Subir camada")}
            {iconBtn(()=>moveLayer(selected,1),"down","Descer camada")}
          </div>
        </div>
      )}
    </div>
  );

  // ── Templates panel (shared) ──────────────────────────────
  const TemplatesContent = () => (
    <div style={{padding:"10px 12px",overflowY:"auto",flex:1}}>
      <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:16}}>
        {TEMPLATES.map(tpl=>(
          <button key={tpl.id} onClick={()=>applyTemplate(tpl)} style={{
            width:"100%",padding:"9px 12px",background:"rgba(255,255,255,0.03)",
            border:`1px solid ${C.border}`,borderRadius:10,color:C.text,
            cursor:"pointer",textAlign:"left",fontSize:12,fontFamily:"inherit",
            display:"flex",alignItems:"center",gap:10,transition:"all .15s",
          }}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(0,229,255,0.3)";e.currentTarget.style.background="rgba(0,229,255,0.04)";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.background="rgba(255,255,255,0.03)";}}>
            <div style={{width:36,height:36,borderRadius:8,background:tpl.preview,flexShrink:0,border:`1px solid ${C.border}`}}/>
            <span>{tpl.label}</span>
          </button>
        ))}
      </div>
      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:12}}>
        <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Formato</div>
        {PRESETS.map(p=>(
          <button key={p.id} onClick={()=>{setPreset(p);setSelected(null);}} style={{
            width:"100%",padding:"7px 10px",marginBottom:4,
            background:preset.id===p.id?"rgba(0,229,255,0.08)":"rgba(255,255,255,0.02)",
            border:`1px solid ${preset.id===p.id?"rgba(0,229,255,0.3)":C.border}`,
            borderRadius:8,color:preset.id===p.id?C.accent:C.muted,
            cursor:"pointer",textAlign:"left",fontSize:11,fontFamily:"inherit",
            display:"flex",alignItems:"center",gap:6,
          }}>
            <span>{p.icon}</span>{p.label}
          </button>
        ))}
      </div>
    </div>
  );

  // ── AI panel (shared) ─────────────────────────────────────
  const AIContent = () => (
    <div style={{padding:"10px 12px"}}>
      <div style={{fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.6}}>Descreva o que quer comunicar e a IA gera título, subtítulo e CTA.</div>
      <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)}
        placeholder="Ex: post promovendo o plano gratuito para MEIs"
        style={{...propInput,height:80,resize:"none",lineHeight:1.5}}/>
      <button onClick={generateAI} disabled={aiLoading} style={{
        width:"100%",marginTop:8,padding:"10px",
        background:aiLoading?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#1565C0,#00B4D8)",
        border:"none",borderRadius:10,color:"#fff",
        cursor:aiLoading?"wait":"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12,
        display:"flex",alignItems:"center",justifyContent:"center",gap:6,opacity:aiLoading?.6:1,
      }}>
        <Icon name="magic" size={14} color="#fff"/>
        {aiLoading?"Gerando...":"Gerar Textos"}
      </button>
    </div>
  );

  // ── Projects panel (shared) ───────────────────────────────
  const ProjectsContent = () => (
    <div style={{padding:"10px 12px",overflowY:"auto",flex:1}}>
      <input value={projectName} onChange={e=>setProjectName(e.target.value)} style={{...propInput,marginBottom:8}} placeholder="Nome do projeto"/>
      <button onClick={saveProject} style={{
        width:"100%",padding:"9px",background:"linear-gradient(135deg,#1565C0,#00B4D8)",
        border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontFamily:"inherit",
        fontWeight:700,fontSize:12,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:6,
      }}>
        <Icon name="save" size={13} color="#fff"/> Salvar
      </button>
      {projects.length===0 && <div style={{fontSize:11,color:C.muted,textAlign:"center",padding:"12px 0"}}>Nenhum projeto</div>}
      {projects.map(p=>(
        <div key={p.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
          <div style={{fontSize:12,color:C.text,fontWeight:600,marginBottom:2}}>{p.name}</div>
          <div style={{fontSize:9,color:C.muted,marginBottom:8}}>{p.format} · {new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>loadProject(p)} style={{flex:1,padding:"5px",background:"rgba(0,229,255,0.08)",border:`1px solid rgba(0,229,255,0.2)`,borderRadius:6,color:C.accent,cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>Abrir</button>
            <button onClick={()=>deleteProject(p.id)} style={{padding:"5px 8px",background:"rgba(255,23,68,0.08)",border:"1px solid rgba(255,23,68,0.2)",borderRadius:6,color:C.danger,cursor:"pointer",fontSize:10}}>
              <Icon name="trash" size={11} color={C.danger}/>
            </button>
          </div>
        </div>
      ))}
      <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
        <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Assets</div>
        <button onClick={()=>assetRef.current.click()} style={{width:"100%",padding:"8px",background:"rgba(255,215,0,0.06)",border:`1px solid rgba(255,215,0,0.2)`,borderRadius:8,color:C.gold,cursor:"pointer",fontSize:11,fontFamily:"inherit",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
          <Icon name="plus" size={12} color={C.gold}/> Upload Asset
        </button>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
          {assets.map(a=>(
            <div key={a.id} onClick={()=>useAsset(a.url)} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:6,overflow:"hidden",cursor:"pointer",aspectRatio:"1"}}>
              <img src={a.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // MOBILE LAYOUT
  // ════════════════════════════════════════════════════════════
  if (isMobile) {
    const mobileZoom = Math.min((window.innerWidth - 32) / cw, (window.innerHeight - 160) / ch);

    return (
      <div style={{display:"flex",flexDirection:"column",height:"100vh",background:C.bg0,fontFamily:"'Bodoni Moda','DM Sans',sans-serif",color:C.text,overflow:"hidden"}}>
        <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700&family=Bebas+Neue&family=Cinzel:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Exo+2:wght@300;400;600;700&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600&family=Space+Grotesk:wght@400;600&family=DM+Sans:wght@400;500;600&family=Josefin+Sans:wght@300;400;600&family=Raleway:wght@300;400;600;700&family=Anton&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet"/>
        <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}::-webkit-scrollbar{display:none}input[type=range]{-webkit-appearance:none;height:3px;border-radius:2px;background:rgba(255,255,255,0.1)}input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#00E5FF;cursor:pointer}@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Mobile top bar */}
        <div style={{height:52,background:C.bg1,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 12px",gap:8,flexShrink:0}}>
          <SVLogo size={22}/>
          <span style={{fontSize:12,fontWeight:700,color:C.gold,letterSpacing:2,flex:1}}>BRAND STUDIO</span>
          <div style={{display:"flex",gap:4}}>
            {iconBtn(undo,"undo","Desfazer",false,false,histIdx<=0)}
            {iconBtn(redo,"redo","Refazer",false,false,histIdx>=history.length-1)}
            {selectedEl && iconBtn(deleteSelected,"trash","Deletar",false,true)}
          </div>
          <button onClick={exportCanvas} disabled={exportLoading} style={{
            padding:"7px 14px",background:"linear-gradient(135deg,#FFD700,#FF8F00)",
            border:"none",borderRadius:10,color:"#0A0F1E",cursor:"pointer",
            fontFamily:"inherit",fontWeight:700,fontSize:12,
            display:"flex",alignItems:"center",gap:5,opacity:exportLoading?.7:1,
          }}>
            <Icon name="download" size={14} color="#0A0F1E"/>
            PNG
          </button>
        </div>

        {/* Canvas area */}
        <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:`radial-gradient(ellipse at center,${C.bg2} 0%,${C.bg0} 100%)`}}
          onTouchMove={e=>{if(dragging)onTouchMove(e);}}>
          <div style={{transform:`scale(${mobileZoom})`,transformOrigin:"center center"}}>
            <div ref={canvasRef} style={{
              width:cw,height:ch,background:bg,position:"relative",overflow:"hidden",
              boxShadow:"0 16px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
              backgroundImage:showGrid
                ? `${bg.startsWith("linear")?bg:"none"},repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.025) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.025) 40px)`
                : bg,
            }}
              onClick={e=>{if(!dragging){setSelected(null);setEditingText(null);}}}
              onTouchStart={e=>{if(e.touches.length===1&&!e.target.closest("[data-el]")){setSelected(null);setEditingText(null);}}}
              onTouchEnd={onTouchEnd}>
              {elements.map(renderEl)}
            </div>
          </div>
        </div>

        {/* Mobile bottom toolbar */}
        <div style={{height:64,background:C.bg1,borderTop:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 8px",gap:4,flexShrink:0,overflowX:"auto"}}>
          {[
            {id:"templates",icon:"grid",label:"Templates"},
            {id:"layers",   icon:"layers",label:"Layers"},
            {id:"props",    icon:"pen",   label:"Props"},
            {id:"ai",       icon:"ai",    label:"IA"},
            {id:"projects", icon:"save",  label:"Projetos"},
          ].map(tab=>(
            <button key={tab.id} onClick={()=>setMobileDrawer(mobileDrawer===tab.id?null:tab.id)} style={{
              display:"flex",flexDirection:"column",alignItems:"center",gap:3,
              padding:"8px 10px",borderRadius:12,border:"none",cursor:"pointer",
              background:mobileDrawer===tab.id?"rgba(0,229,255,0.12)":"transparent",
              color:mobileDrawer===tab.id?C.accent:C.muted,flex:1,minWidth:0,
            }}>
              <Icon name={tab.icon} size={20} color={mobileDrawer===tab.id?C.accent:C.muted}/>
              <span style={{fontSize:9,letterSpacing:"0.05em"}}>{tab.label}</span>
            </button>
          ))}
          <button onClick={()=>fileRef.current.click()} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            padding:"8px 10px",borderRadius:12,border:"none",cursor:"pointer",
            background:"transparent",color:C.muted,flex:1,minWidth:0,
          }}>
            <Icon name="image" size={20} color={C.muted}/>
            <span style={{fontSize:9}}>Imagem</span>
          </button>
          <button onClick={addText} style={{
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,
            padding:"8px 10px",borderRadius:12,border:"none",cursor:"pointer",
            background:"transparent",color:C.muted,flex:1,minWidth:0,
          }}>
            <Icon name="text" size={20} color={C.muted}/>
            <span style={{fontSize:9}}>Texto</span>
          </button>
        </div>

        {/* Mobile Drawer */}
        {mobileDrawer && (
          <div style={{
            position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end",
            background:"rgba(0,0,0,0.5)",backdropFilter:"blur(4px)",
          }} onClick={()=>setMobileDrawer(null)}>
            <div style={{
              background:C.bg1,borderRadius:"20px 20px 0 0",
              maxHeight:"75vh",display:"flex",flexDirection:"column",
              animation:"slideUp .25s ease",
            }} onClick={e=>e.stopPropagation()}>
              {/* Drawer handle */}
              <div style={{padding:"12px",display:"flex",justifyContent:"center"}}>
                <div style={{width:40,height:4,borderRadius:2,background:"rgba(255,255,255,0.2)"}}/>
              </div>
              <div style={{padding:"0 16px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>
                  {mobileDrawer==="templates"?"Templates":mobileDrawer==="layers"?"Layers":mobileDrawer==="props"?"Propriedades":mobileDrawer==="ai"?"IA Copy":"Projetos"}
                </span>
                <button onClick={()=>setMobileDrawer(null)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted}}>
                  <Icon name="close" size={16} color={C.muted}/>
                </button>
              </div>
              <div style={{overflowY:"auto",flex:1}}>
                {mobileDrawer==="templates" && <TemplatesContent/>}
                {mobileDrawer==="layers" && (
                  <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:6}}>
                    {elements.length===0 && <div style={{fontSize:12,color:C.muted,textAlign:"center",padding:"20px 0"}}>Nenhum elemento</div>}
                    {[...elements].reverse().map(el=>(
                      <div key={el.id} onClick={()=>{setSelected(el.id);setMobileDrawer("props");}} style={{
                        padding:"10px 12px",borderRadius:10,cursor:"pointer",
                        background:el.id===selected?"rgba(0,229,255,0.08)":"rgba(255,255,255,0.03)",
                        border:`1px solid ${el.id===selected?"rgba(0,229,255,0.25)":C.border}`,
                        display:"flex",alignItems:"center",justifyContent:"space-between",
                        fontSize:13,color:el.id===selected?C.accent:C.muted,
                      }}>
                        <span>{el.type==="text"?`T ${el.text?.slice(0,16)}`:el.type==="image"?"🖼 Imagem":"▪ Forma"}</span>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={e=>{e.stopPropagation();moveLayer(el.id,1);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><Icon name="down" size={14} color={C.muted}/></button>
                          <button onClick={e=>{e.stopPropagation();moveLayer(el.id,-1);}} style={{background:"none",border:"none",color:C.muted,cursor:"pointer"}}><Icon name="up" size={14} color={C.muted}/></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {mobileDrawer==="props" && <PropertiesContent/>}
                {mobileDrawer==="ai" && <AIContent/>}
                {mobileDrawer==="projects" && <ProjectsContent/>}
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:200,padding:"10px 18px",borderRadius:20,fontWeight:600,fontSize:13,background:toast.type==="error"?"rgba(255,23,68,0.95)":toast.type==="info"?"rgba(21,101,192,0.95)":"rgba(0,200,83,0.95)",color:"#fff",boxShadow:"0 4px 20px rgba(0,0,0,0.4)",whiteSpace:"nowrap"}}>
            {toast.msg}
          </div>
        )}

        <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImageUpload}/>
        <input ref={assetRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAssetUpload}/>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // DESKTOP LAYOUT
  // ════════════════════════════════════════════════════════════
  const leftTabs = [
    {id:"templates",icon:"grid",   label:"Templates"},
    {id:"layers",   icon:"layers", label:"Layers"},
    {id:"projects", icon:"save",   label:"Projetos"},
    {id:"assets",   icon:"image",  label:"Assets"},
    {id:"ai",       icon:"ai",     label:"IA Copy"},
  ];

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg0,fontFamily:"'Bodoni Moda','DM Sans',sans-serif",color:C.text,overflow:"hidden",userSelect:"none"}}>
      <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Rajdhani:wght@400;600;700&family=Orbitron:wght@400;700&family=Bebas+Neue&family=Cinzel:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Exo+2:wght@300;400;600;700&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600&family=Space+Grotesk:wght@400;600&family=DM+Sans:wght@400;500;600&family=Josefin+Sans:wght@300;400;600&family=Raleway:wght@300;400;600;700&family=Anton&family=Nunito:wght@400;600;700&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
        input[type=range]{-webkit-appearance:none;height:3px;border-radius:2px;background:rgba(255,255,255,0.1)}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#00E5FF;cursor:pointer;box-shadow:0 0 6px rgba(0,229,255,0.5)}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* ── LEFT PANEL ── */}
      <div style={{display:"flex",flexShrink:0}}>
        {/* Icon rail */}
        <div style={{width:52,background:C.bg1,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:12,gap:4,zIndex:10}}>
          <div style={{marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${C.border}`,width:"100%",display:"flex",justifyContent:"center"}}>
            <SVLogo size={24}/>
          </div>
          {leftTabs.map(t=>(
            <button key={t.id} title={t.label}
              onClick={()=>{if(leftPanel===t.id&&!leftCollapsed){setLeftCollapsed(true);}else{setLeftPanel(t.id);setLeftCollapsed(false);}}}
              style={{width:36,height:36,borderRadius:10,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                background:leftPanel===t.id&&!leftCollapsed?"rgba(0,229,255,0.12)":"transparent",
                color:leftPanel===t.id&&!leftCollapsed?C.accent:C.muted,transition:"all .15s"}}>
              <Icon name={t.icon} size={16} color={leftPanel===t.id&&!leftCollapsed?C.accent:C.muted}/>
            </button>
          ))}
          <div style={{flex:1}}/>
          <div style={{paddingBottom:12,display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
            {iconBtn(addText,"text","Texto")}
            {iconBtn(addRect,"shape","Forma")}
            {iconBtn(()=>fileRef.current.click(),"image","Upload")}
          </div>
        </div>

        {/* Expandable panel */}
        {!leftCollapsed && (
          <div style={{width:224,background:C.bg1,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflowY:"auto",animation:"fadeUp .15s ease"}}>
            <div style={{padding:"12px 14px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>
                {leftTabs.find(t=>t.id===leftPanel)?.label}
              </span>
              <button onClick={()=>setLeftCollapsed(true)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,padding:2}}>
                <Icon name="close" size={12} color={C.muted}/>
              </button>
            </div>

            <div style={{flex:1,overflowY:"auto"}}>
              {leftPanel==="templates" && <TemplatesContent/>}

              {leftPanel==="layers" && (
                <div style={{padding:"10px 12px",display:"flex",flexDirection:"column",gap:3}}>
                  {elements.length===0 && <div style={{fontSize:11,color:C.muted,textAlign:"center",padding:"24px 0"}}>Nenhum elemento</div>}
                  {[...elements].reverse().map(el=>(
                    <div key={el.id} onClick={()=>setSelected(el.id)} style={{
                      padding:"8px 10px",borderRadius:8,cursor:"pointer",
                      background:el.id===selected?"rgba(0,229,255,0.08)":"rgba(255,255,255,0.02)",
                      border:`1px solid ${el.id===selected?"rgba(0,229,255,0.25)":C.border}`,
                      display:"flex",alignItems:"center",justifyContent:"space-between",
                      fontSize:11,color:el.id===selected?C.accent:C.muted,
                    }}>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110}}>
                        {el.type==="text"?`T ${el.text?.slice(0,14)}`:el.type==="image"?"🖼 Imagem":"▪ Forma"}
                      </span>
                      <div style={{display:"flex",gap:2,flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();moveLayer(el.id,1);}} style={{width:16,height:16,background:"none",border:"none",color:C.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Icon name="down" size={10} color={C.muted}/>
                        </button>
                        <button onClick={e=>{e.stopPropagation();moveLayer(el.id,-1);}} style={{width:16,height:16,background:"none",border:"none",color:C.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Icon name="up" size={10} color={C.muted}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {leftPanel==="projects" && <ProjectsContent/>}

              {leftPanel==="assets" && (
                <div style={{padding:"10px 12px"}}>
                  <button onClick={()=>assetRef.current.click()} style={{width:"100%",padding:"9px",background:"rgba(255,215,0,0.06)",border:`1px solid rgba(255,215,0,0.2)`,borderRadius:10,color:C.gold,cursor:"pointer",fontSize:11,fontFamily:"inherit",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <Icon name="plus" size={12} color={C.gold}/> Upload Asset
                  </button>
                  <input ref={assetRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAssetUpload}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {assets.map(a=>(
                      <div key={a.id} onClick={()=>useAsset(a.url)} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",cursor:"pointer",aspectRatio:"1"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(0,229,255,0.3)"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                        <img src={a.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      </div>
                    ))}
                    {assets.length===0 && <div style={{gridColumn:"1/-1",fontSize:11,color:C.muted,textAlign:"center",padding:"12px 0"}}>Nenhum asset</div>}
                  </div>
                </div>
              )}

              {leftPanel==="ai" && <AIContent/>}
            </div>
          </div>
        )}
      </div>

      {/* ── CENTER ── */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:C.bg0,minWidth:0}}>
        {/* Top bar */}
        <div style={{height:48,background:C.bg1,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 12px",gap:6,flexShrink:0}}>
          {iconBtn(undo,"undo","Desfazer (Ctrl+Z)",false,false,histIdx<=0)}
          {iconBtn(redo,"redo","Refazer (Ctrl+Y)",false,false,histIdx>=history.length-1)}
          <div style={{width:1,height:20,background:C.border,margin:"0 2px"}}/>
          {iconBtn(()=>setLassoMode(v=>!v),"lasso",lassoMode?"Desativar Lasso":"Lasso",lassoMode)}
          {selectedEl && <>
            <div style={{width:1,height:20,background:C.border,margin:"0 2px"}}/>
            {iconBtn(duplicateEl,"copy","Duplicar")}
            {iconBtn(deleteSelected,"trash","Deletar",false,true)}
            {selectedEl.type==="image" && iconBtn(handleRemoveBg,"scissors",rmbLoading?"Processando...":"Remover fundo",rmbLoading,false,rmbLoading)}
            {selectedEl.type==="text" && (
              <div style={{fontSize:10,color:C.muted,paddingLeft:4}}>
                Duplo clique para editar
              </div>
            )}
          </>}
          <div style={{flex:1}}/>
          <div style={{display:"flex",background:"rgba(255,255,255,0.04)",borderRadius:10,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            {PRESETS.map(p=>(
              <button key={p.id} onClick={()=>{setPreset(p);setSelected(null);}} title={p.label} style={{
                padding:"6px 10px",background:preset.id===p.id?"rgba(0,229,255,0.12)":"transparent",
                border:"none",color:preset.id===p.id?C.accent:C.muted,cursor:"pointer",fontSize:13,
                borderRight:`1px solid ${C.border}`,transition:"all .15s",
              }}>{p.icon}</button>
            ))}
          </div>
          <div style={{width:1,height:20,background:C.border,margin:"0 4px"}}/>
          <button onClick={()=>setShowGrid(v=>!v)} title="Grid" style={{width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",background:showGrid?"rgba(0,229,255,0.1)":"transparent",color:showGrid?C.accent:C.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon name="grid" size={15} color={showGrid?C.accent:C.muted}/>
          </button>
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"4px 10px",border:`1px solid ${C.border}`}}>
            <input type="range" min=".3" max="2.5" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))} style={{width:60}}/>
            <span style={{fontSize:10,color:C.accent,fontWeight:700,minWidth:34}}>{Math.round(zoom*100)}%</span>
          </div>
          <button onClick={exportCanvas} disabled={exportLoading} style={{
            padding:"7px 16px",background:"linear-gradient(135deg,#FFD700,#FF8F00)",
            border:"none",borderRadius:10,color:"#0A0F1E",cursor:exportLoading?"wait":"pointer",
            fontFamily:"inherit",fontWeight:700,fontSize:12,
            display:"flex",alignItems:"center",gap:6,
            boxShadow:"0 4px 16px rgba(255,215,0,0.3)",opacity:exportLoading?.7:1,
          }}>
            <Icon name="download" size={14} color="#0A0F1E"/>
            {exportLoading?"Exportando...":"PNG"}
          </button>
        </div>

        {/* Canvas workspace */}
        <div style={{flex:1,overflow:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:40,background:`radial-gradient(ellipse at center,${C.bg2} 0%,${C.bg0} 100%)`}}
          onMouseDown={e=>{setSelected(null);setEditingText(null);startLasso(e);}}
          onMouseMove={moveLasso}
          onMouseUp={endLasso}>
          <div style={{transform:`scale(${zoom})`,transformOrigin:"center center"}}>
            <div style={{textAlign:"center",marginBottom:8,fontSize:9,color:"rgba(255,255,255,0.18)",letterSpacing:"0.2em",textTransform:"uppercase"}}>
              {preset.label} · {preset.w}×{preset.h}
            </div>
            <div ref={canvasRef} style={{
              width:cw,height:ch,background:bg,position:"relative",overflow:"hidden",borderRadius:2,
              boxShadow:"0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
              backgroundImage:showGrid
                ? `${bg.startsWith("linear")?bg:"none"},repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.025) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.025) 40px)`
                : bg,
            }}>
              {elements.map(renderEl)}
              {isLassoing && lassoPoints.length>1 && (
                <svg style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
                  <polyline points={lassoPoints.map(p=>`${p.x},${p.y}`).join(" ")} fill="rgba(0,229,255,0.08)" stroke="#00E5FF" strokeWidth="1.5" strokeDasharray="6,3"/>
                </svg>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{width:244,background:C.bg1,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"12px 14px 10px",borderBottom:`1px solid ${C.border}`,fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>
          {selectedEl ? (selectedEl.type==="text"?"Texto":selectedEl.type==="image"?"Imagem":"Forma") : "Canvas"}
        </div>
        <PropertiesContent/>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,padding:"12px 18px",borderRadius:12,fontWeight:600,fontSize:13,
          background:toast.type==="error"?"rgba(255,23,68,0.95)":toast.type==="info"?"rgba(21,101,192,0.95)":"rgba(0,200,83,0.95)",
          color:"#fff",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",backdropFilter:"blur(10px)",
          display:"flex",alignItems:"center",gap:8,animation:"fadeUp .2s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImageUpload}/>
    </div>
  );
}
