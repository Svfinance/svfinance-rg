// src/pages/BrandStudio.jsx
import { useState, useRef, useEffect, useCallback } from "react";

const API = "https://finance-control-api-production.up.railway.app/api";

// ── Auth com refresh automático ──────────────────────────────
async function apiFetch(url, opts = {}) {
  const tkn = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${tkn}`, ...(opts.headers || {}) };
  let res = await fetch(url, { ...opts, headers });
  if (res.status === 401) {
    // token expirado — força novo login silencioso não é possível sem refresh token
    // então apenas limpa e redireciona
    localStorage.removeItem("token");
    window.location.href = "/";
    return res;
  }
  return res;
}

// ── Presets ──────────────────────────────────────────────────
const PRESETS = [
  { id:"insta_post",      label:"Instagram Post",   icon:"📸", w:1080, h:1080, dw:460, dh:460 },
  { id:"insta_story",     label:"Instagram Story",  icon:"📱", w:1080, h:1920, dw:258, dh:460 },
  { id:"linkedin_post",   label:"LinkedIn Post",    icon:"💼", w:1200, h:627,  dw:460, dh:240 },
  { id:"linkedin_banner", label:"LinkedIn Banner",  icon:"🏷", w:1584, h:396,  dw:460, dh:115 },
  { id:"landing_hero",    label:"Landing Hero",     icon:"🌐", w:1440, h:600,  dw:460, dh:192 },
];

const PALETTE = [
  "#0A0F1E","#0F3460","#1565C0","#1976D2","#42A5F5",
  "#00B4D8","#00E5FF","#FFD700","#FFC107","#FF8F00",
  "#FFFFFF","#E0E0E0","#9E9E9E","#424242","#00C853",
  "#FF1744","#E040FB","#FF6D00","#0D1B2A","#1A2744",
];

const FONTS = ["Rajdhani","Exo 2","Orbitron","Bebas Neue","Montserrat","Poppins","Space Grotesk","DM Sans"];

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
  "#0A0F1E","#0F3460","#1565C0","#1A2744",
];

let _id = 200;
const uid = () => `e${_id++}`;
const defText = () => ({ fontFamily:"Rajdhani", fontSize:48, fontWeight:"700", color:"#FFFFFF", textAlign:"left", letterSpacing:2, lineHeight:1.2, opacity:1, shadow:false, shadowColor:"#000", shadowBlur:8 });

const TEMPLATES = [
  { id:"tpl_launch", label:"🚀 Lançamento", bg:"linear-gradient(135deg,#0A0F1E 0%,#0F3460 50%,#1565C0 100%)",
    elements:[
      { id:uid(),type:"rect",x:.05,y:.05,w:.9,h:.018,fill:"#FFD700",opacity:1,clip:"none" },
      { id:uid(),type:"text",x:.08,y:.15,w:.84,h:.15,text:"SV FINANCE",style:{...defText(),fontSize:72,letterSpacing:8,color:"#FFD700"} },
      { id:uid(),type:"text",x:.08,y:.32,w:.84,h:.1,text:"Controle total do seu negócio",style:{...defText(),fontSize:32,fontWeight:"400",color:"#00E5FF",letterSpacing:1} },
      { id:uid(),type:"text",x:.08,y:.72,w:.6,h:.1,text:"Experimente grátis →",style:{...defText(),fontSize:28,color:"#FFFFFF"} },
      { id:uid(),type:"rect",x:.05,y:.93,w:.9,h:.018,fill:"#FFD700",opacity:.4,clip:"none" },
    ]},
  { id:"tpl_feature", label:"✨ Feature", bg:"linear-gradient(160deg,#0D1B2A 0%,#1A2744 60%,#0F3460 100%)",
    elements:[
      { id:uid(),type:"rect",x:0,y:0,w:.006,h:1,fill:"#00E5FF",opacity:1,clip:"none" },
      { id:uid(),type:"text",x:.08,y:.1,w:.84,h:.12,text:"NOVA FUNCIONALIDADE",style:{...defText(),fontSize:22,color:"#00E5FF",letterSpacing:5} },
      { id:uid(),type:"text",x:.08,y:.28,w:.84,h:.2,text:"Integração NF-e",style:{...defText(),fontSize:64,color:"#FFFFFF"} },
      { id:uid(),type:"text",x:.08,y:.55,w:.84,h:.25,text:"Emita notas fiscais direto pelo sistema.",style:{...defText(),fontSize:26,fontWeight:"400",color:"#9E9E9E",letterSpacing:0,lineHeight:1.5} },
    ]},
  { id:"tpl_promo", label:"💰 Promoção", bg:"linear-gradient(135deg,#0A0F1E 0%,#1A2744 100%)",
    elements:[
      { id:uid(),type:"rect",x:.05,y:.08,w:.9,h:.84,fill:"#FFD700",opacity:.05,clip:"none" },
      { id:uid(),type:"text",x:.1,y:.12,w:.8,h:.15,text:"PLANO PRO",style:{...defText(),fontSize:52,color:"#FFD700",letterSpacing:6} },
      { id:uid(),type:"text",x:.1,y:.3,w:.8,h:.2,text:"R$ 49/mês",style:{...defText(),fontSize:72,color:"#FFFFFF"} },
      { id:uid(),type:"text",x:.1,y:.55,w:.8,h:.1,text:"Tudo que seu negócio precisa",style:{...defText(),fontSize:24,fontWeight:"400",color:"#00E5FF"} },
    ]},
  { id:"tpl_blank", label:"⬜ Em branco", bg:"#0A0F1E", elements:[] },
];

function deepClone(els) {
  return els.map(e => ({ ...e, style: e.style ? { ...e.style } : undefined }));
}

// ── Ícones SVG inline ─────────────────────────────────────────
const Icon = ({ name, size = 16, color = "currentColor" }) => {
  const icons = {
    undo:     <path d="M3 7h10a5 5 0 010 10H8M3 7l4-4M3 7l4 4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>,
    redo:     <path d="M21 7H11a5 5 0 000 10h5M21 7l-4-4M21 7l-4 4" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>,
    text:     <><rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M8 8h8M12 8v8" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></>,
    shape:    <rect x="4" y="4" width="16" height="16" rx="3" stroke={color} strokeWidth="1.5" fill="none"/>,
    image:    <><rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><circle cx="8.5" cy="8.5" r="1.5" fill={color}/><path d="M21 15l-5-5L5 21" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/></>,
    magic:    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" stroke={color} strokeWidth="1.5" fill="none"/>,
    layers:   <><path d="M12 2L2 7l10 5 10-5-10-5z" stroke={color} strokeWidth="1.5" fill="none"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth="1.5" fill="none"/></>,
    save:     <><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke={color} strokeWidth="1.5" fill="none"/><polyline points="17 21 17 13 7 13 7 21" stroke={color} strokeWidth="1.5" fill="none"/><polyline points="7 3 7 8 15 8" stroke={color} strokeWidth="1.5" fill="none"/></>,
    download: <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/></>,
    trash:    <><polyline points="3 6 5 6 21 6" stroke={color} strokeWidth="1.5" fill="none"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/></>,
    copy:     <><rect x="9" y="9" width="13" height="13" rx="2" stroke={color} strokeWidth="1.5" fill="none"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke={color} strokeWidth="1.5" fill="none"/></>,
    up:       <path d="M12 19V5M5 12l7-7 7 7" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>,
    down:     <path d="M12 5v14M19 12l-7 7-7-7" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>,
    scissors: <><circle cx="6" cy="6" r="3" stroke={color} strokeWidth="1.5" fill="none"/><circle cx="6" cy="18" r="3" stroke={color} strokeWidth="1.5" fill="none"/><line x1="20" y1="4" x2="8.12" y2="15.88" stroke={color} strokeWidth="1.5"/><line x1="14.47" y1="14.48" x2="20" y2="20" stroke={color} strokeWidth="1.5"/></>,
    grid:     <><rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth="1.5" fill="none"/><rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth="1.5" fill="none"/><rect x="14" y="14" width="7" height="7" stroke={color} strokeWidth="1.5" fill="none"/><rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth="1.5" fill="none"/></>,
    lasso:    <path d="M12 3C7 3 3 6 3 10c0 3 2 5 5 6l1 5h6l1-5c3-1 5-3 5-6 0-4-4-7-9-7z" stroke={color} strokeWidth="1.5" fill="none"/>,
    ai:       <><path d="M12 2a10 10 0 100 20A10 10 0 0012 2z" stroke={color} strokeWidth="1.5" fill="none"/><path d="M12 8v4l3 3" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/></>,
    chevron:  <path d="M9 18l6-6-6-6" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>,
    plus:     <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>,
    close:    <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round"/>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink:0 }}>
      {icons[name]}
    </svg>
  );
};

export default function BrandStudio() {
  const [preset, setPreset]         = useState(PRESETS[0]);
  const [bg, setBg]                 = useState(TEMPLATES[1].bg);
  const [elements, setElements]     = useState(deepClone(TEMPLATES[1].elements));
  const [selected, setSelected]     = useState(null);
  const [dragging, setDragging]     = useState(null);
  const [dragOffset, setDragOffset] = useState({x:0,y:0});
  const [showGrid, setShowGrid]     = useState(true);
  const [zoom, setZoom]             = useState(1);
  const [history, setHistory]       = useState([]);
  const [histIdx, setHistIdx]       = useState(-1);
  const [aiPrompt, setAiPrompt]     = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [rmbLoading, setRmbLoading] = useState(false);
  const [lassoMode, setLassoMode]   = useState(false);
  const [lassoPoints, setLassoPoints] = useState([]);
  const [isLassoing, setIsLassoing] = useState(false);
  const [toast, setToast]           = useState(null);
  const [projects, setProjects]     = useState([]);
  const [assets, setAssets]         = useState([]);
  const [projectName, setProjectName] = useState("Meu Post");
  const [exportLoading, setExportLoading] = useState(false);
  const [leftPanel, setLeftPanel]   = useState("templates"); // templates|layers|projects|assets|ai
  const [leftCollapsed, setLeftCollapsed] = useState(false);

  const canvasRef = useRef(null);
  const fileRef   = useRef(null);
  const assetRef  = useRef(null);

  const cw = preset.dw;
  const ch = preset.dh;
  const selectedEl = elements.find(e => e.id === selected);

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
      if ((e.metaKey||e.ctrlKey) && e.key==="z") { e.preventDefault(); undo(); }
      if ((e.metaKey||e.ctrlKey) && e.key==="y") { e.preventDefault(); redo(); }
      if ((e.key==="Delete"||e.key==="Backspace") && document.activeElement.tagName!=="INPUT" && document.activeElement.tagName!=="TEXTAREA") deleteSelected();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [undo, redo, selected]);

  function showToast(msg, type="success") {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3500);
  }

  // ── Element ops ──────────────────────────────────────────
  const updateEl = (id, patch) => setElements(els => { const n=els.map(e=>e.id===id?{...e,...patch}:e); pushHistory(n); return n; });
  const updateStyle = (id, patch) => setElements(els => { const n=els.map(e=>e.id===id?{...e,style:{...e.style,...patch}}:e); pushHistory(n); return n; });

  const addText = () => {
    const el = {id:uid(),type:"text",x:.1,y:.1,w:.8,h:.12,text:"Novo Texto",style:defText(),clip:"none"};
    setElements(els=>{const n=[...els,el];pushHistory(n);return n;});
    setSelected(el.id);
  };

  const addRect = () => {
    const el = {id:uid(),type:"rect",x:.2,y:.2,w:.6,h:.1,fill:"#1565C0",opacity:1,clip:"none"};
    setElements(els=>{const n=[...els,el];pushHistory(n);return n;});
    setSelected(el.id);
  };

  const duplicateEl = () => {
    if (!selectedEl) return;
    const clone = {...selectedEl,id:uid(),x:selectedEl.x+.03,y:selectedEl.y+.03,style:selectedEl.style?{...selectedEl.style}:undefined};
    setElements(els=>{const n=[...els,clone];pushHistory(n);return n;});
    setSelected(clone.id);
  };

  const deleteSelected = () => {
    if (!selected) return;
    setElements(els=>{const n=els.filter(e=>e.id!==selected);pushHistory(n);return n;});
    setSelected(null);
  };

  const moveLayer = (id, dir) => {
    setElements(els=>{
      const idx=els.findIndex(e=>e.id===id);
      if(idx<0)return els;
      const n=[...els];const t=idx+dir;
      if(t<0||t>=n.length)return els;
      [n[idx],n[t]]=[n[t],n[idx]];
      pushHistory(n);return n;
    });
  };

  const applyTemplate = (tpl) => {
    setBg(tpl.bg);
    const els = deepClone(tpl.elements).map(e=>({...e,id:uid(),clip:e.clip||"none"}));
    setElements(els); pushHistory(els); setSelected(null);
  };

  // ── Upload ────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file=e.target.files[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const el={id:uid(),type:"image",x:.1,y:.1,w:.4,h:.4,src:ev.target.result,opacity:1,clip:"none"};
      setElements(els=>{const n=[...els,el];pushHistory(n);return n;});
      setSelected(el.id);
    };
    reader.readAsDataURL(file);
    e.target.value="";
  };

  // ── Remover fundo da imagem SELECIONADA ──────────────────
  const handleRemoveBgSelected = async () => {
    if (!selectedEl || selectedEl.type !== "image") {
      showToast("Selecione uma imagem no canvas primeiro.", "error");
      return;
    }
    setRmbLoading(true);
    showToast("Removendo fundo... aguarde.", "info");
    try {
      // converte data URL para blob
      const src = selectedEl.src;
      let blob;
      if (src.startsWith("data:")) {
        const arr = src.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        const u8 = new Uint8Array(bstr.length);
        for (let i=0;i<bstr.length;i++) u8[i]=bstr.charCodeAt(i);
        blob = new Blob([u8], {type:mime});
      } else {
        const r = await fetch(src);
        blob = await r.blob();
      }
      const formData = new FormData();
      formData.append("image", blob, "image.png");
      const res = await apiFetch(`${API}/brand-studio/remove-bg`, {
        method:"POST", body:formData,
      });
      if (!res.ok) {
        const d=await res.json();
        throw new Error(d.msg||"Erro ao remover fundo");
      }
      const resultBlob = await res.blob();
      const url = URL.createObjectURL(resultBlob);
      updateEl(selected, {src:url});
      showToast("✨ Fundo removido com sucesso!");
    } catch(err) {
      showToast(err.message||"Erro ao remover fundo.", "error");
    }
    setRmbLoading(false);
  };

  // ── AI copy ───────────────────────────────────────────────
  const generateAICopy = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiFetch(`${API}/brand-studio/ai-copy`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({prompt:aiPrompt}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      const {title,subtitle,cta} = data;
      const els = [
        {id:uid(),type:"text",x:.08,y:.2,w:.84,h:.15,text:title,style:{...defText(),fontSize:52},clip:"none"},
        {id:uid(),type:"text",x:.08,y:.4,w:.84,h:.1,text:subtitle,style:{...defText(),fontSize:28,fontWeight:"400",color:"#00E5FF"},clip:"none"},
        {id:uid(),type:"text",x:.08,y:.72,w:.6,h:.1,text:cta,style:{...defText(),fontSize:26,color:"#FFD700"},clip:"none"},
      ];
      setElements(prev=>{const n=[...prev,...els];pushHistory(n);return n;});
      setAiPrompt("");
      showToast("✨ Textos gerados!");
    } catch(err) { showToast(err.message||"Erro ao gerar.", "error"); }
    setAiLoading(false);
  };

  // ── Projetos & Assets ────────────────────────────────────
  const loadProjects = async () => {
    try { const res=await apiFetch(`${API}/brand-studio/projects`); const d=await res.json(); setProjects(Array.isArray(d)?d:[]); } catch {}
  };
  const loadAssets = async () => {
    try { const res=await apiFetch(`${API}/brand-studio/assets`); const d=await res.json(); setAssets(Array.isArray(d)?d:[]); } catch {}
  };
  const saveProject = async () => {
    const payload={name:projectName,canvas_data:JSON.stringify({bg,elements}),format:preset.id};
    try {
      const res=await apiFetch(`${API}/brand-studio/projects`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      if(res.ok){showToast("💾 Projeto salvo!");loadProjects();}
    } catch {showToast("Erro ao salvar.","error");}
  };
  const loadProject = (proj) => {
    try {
      const {bg:b,elements:els}=JSON.parse(proj.canvas_data);
      setBg(b);
      const loaded=deepClone(els).map(e=>({...e,clip:e.clip||"none"}));
      setElements(loaded);pushHistory(loaded);setSelected(null);
      const p=PRESETS.find(p=>p.id===proj.format)||PRESETS[0];
      setPreset(p);setProjectName(proj.name);
      showToast("Projeto carregado!");
    } catch {showToast("Erro ao carregar.","error");}
  };
  const deleteProject = async (id) => {
    try { await apiFetch(`${API}/brand-studio/projects/${id}`,{method:"DELETE"}); loadProjects(); } catch {}
  };
  const handleAssetUpload = async (e) => {
    const file=e.target.files[0]; if(!file)return;
    const formData=new FormData(); formData.append("file",file);
    try {
      const res=await apiFetch(`${API}/brand-studio/assets`,{method:"POST",body:formData});
      if(res.ok){showToast("Asset salvo!");loadAssets();}
    } catch {} e.target.value="";
  };
  const useAsset = (url) => {
    const el={id:uid(),type:"image",x:.1,y:.1,w:.4,h:.4,src:url,opacity:1,clip:"none"};
    setElements(els=>{const n=[...els,el];pushHistory(n);return n;});
    setSelected(el.id);
  };

  // ── Export ────────────────────────────────────────────────
  const exportCanvas = () => {
    setExportLoading(true);
    const script=document.createElement("script");
    script.src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload=()=>{
      window.html2canvas(canvasRef.current,{useCORS:true,allowTaint:true,scale:preset.w/cw,backgroundColor:null}).then(canvas=>{
        const link=document.createElement("a");
        link.download=`sv-finance-${preset.id}-${Date.now()}.png`;
        link.href=canvas.toDataURL("image/png");
        link.click();
        setExportLoading(false);
        showToast("PNG exportado!");
      });
    };
    document.head.appendChild(script);
  };

  // ── Drag ─────────────────────────────────────────────────
  const onMouseDown = (e,id) => {
    e.stopPropagation();
    setSelected(id);
    if(lassoMode)return;
    const rect=canvasRef.current.getBoundingClientRect();
    const el=elements.find(x=>x.id===id);
    setDragging(id);
    setDragOffset({x:e.clientX-rect.left-el.x*cw,y:e.clientY-rect.top-el.y*ch});
  };
  const onMouseMove=useCallback((e)=>{
    if(!dragging||!canvasRef.current)return;
    const rect=canvasRef.current.getBoundingClientRect();
    const nx=(e.clientX-rect.left-dragOffset.x)/cw;
    const ny=(e.clientY-rect.top-dragOffset.y)/ch;
    setElements(els=>els.map(el=>el.id===dragging?{...el,x:Math.max(0,Math.min(nx,.97)),y:Math.max(0,Math.min(ny,.97))}:el));
  },[dragging,dragOffset,cw,ch]);
  const onMouseUp=useCallback(()=>{ if(dragging)pushHistory(elements); setDragging(null); },[dragging,elements]);
  useEffect(()=>{
    window.addEventListener("mousemove",onMouseMove);
    window.addEventListener("mouseup",onMouseUp);
    return()=>{window.removeEventListener("mousemove",onMouseMove);window.removeEventListener("mouseup",onMouseUp);};
  },[onMouseMove,onMouseUp]);

  // ── Lasso ────────────────────────────────────────────────
  const startLasso=(e)=>{ if(!lassoMode)return; const rect=canvasRef.current.getBoundingClientRect(); setIsLassoing(true); setLassoPoints([{x:e.clientX-rect.left,y:e.clientY-rect.top}]); };
  const moveLasso=(e)=>{ if(!isLassoing||!lassoMode)return; const rect=canvasRef.current.getBoundingClientRect(); setLassoPoints(pts=>[...pts,{x:e.clientX-rect.left,y:e.clientY-rect.top}]); };
  const endLasso=()=>{
    if(!isLassoing||!lassoMode||!selectedEl||selectedEl.type!=="image"){setIsLassoing(false);setLassoPoints([]);return;}
    const pts=lassoPoints; if(pts.length<3){setIsLassoing(false);setLassoPoints([]);return;}
    const el=selectedEl;
    const poly=pts.map(p=>{
      const px=Math.max(0,Math.min(100,((p.x-el.x*cw)/(el.w*cw))*100));
      const py=Math.max(0,Math.min(100,((p.y-el.y*ch)/(el.h*ch))*100));
      return `${px.toFixed(1)}% ${py.toFixed(1)}%`;
    }).join(",");
    updateEl(selected,{clip:`polygon(${poly})`});
    setIsLassoing(false);setLassoPoints([]);
    showToast("Recorte lasso aplicado!");
  };

  // ── Render element ────────────────────────────────────────
  const renderEl=(el)=>{
    const isSel=el.id===selected;
    const clipShape=CLIP_SHAPES.find(c=>c.id===el.clip)||CLIP_SHAPES[0];
    const clipVal=el.clip?.startsWith("polygon(")?el.clip:(clipShape?.clip||"none");
    const base={
      position:"absolute",left:el.x*cw,top:el.y*ch,width:el.w*cw,height:el.h*ch,
      opacity:el.opacity??1,cursor:dragging===el.id?"grabbing":"grab",
      boxSizing:"border-box",clipPath:clipVal!=="none"?clipVal:undefined,
      outline:isSel?"2px solid rgba(0,229,255,0.9)":"none",outlineOffset:"2px",
    };
    if(el.type==="rect") return <div key={el.id} style={{...base,background:el.fill}} onMouseDown={e=>onMouseDown(e,el.id)}/>;
    if(el.type==="text"){
      const s=el.style||{};
      return <div key={el.id} style={{...base,fontFamily:`'${s.fontFamily}',sans-serif`,fontSize:s.fontSize*(cw/480),fontWeight:s.fontWeight,color:s.color,textAlign:s.textAlign,letterSpacing:s.letterSpacing,lineHeight:s.lineHeight,userSelect:"none",display:"flex",alignItems:"center",textShadow:s.shadow?`0 2px ${s.shadowBlur}px ${s.shadowColor}`:"none",whiteSpace:"pre-wrap",wordBreak:"break-word",padding:"2px 4px"}} onMouseDown={e=>onMouseDown(e,el.id)}>{el.text}</div>;
    }
    if(el.type==="image") return <img key={el.id} src={el.src} alt="" draggable={false} style={{...base,objectFit:"contain"}} onMouseDown={e=>onMouseDown(e,el.id)}/>;
    return null;
  };

  // ── Design tokens ─────────────────────────────────────────
  const C = {
    bg0:     "#070B14",
    bg1:     "#0D1221",
    bg2:     "#141A2E",
    bg3:     "#1A2240",
    border:  "rgba(255,255,255,0.06)",
    border2: "rgba(255,255,255,0.10)",
    accent:  "#00E5FF",
    gold:    "#FFD700",
    muted:   "rgba(255,255,255,0.4)",
    text:    "rgba(255,255,255,0.85)",
    danger:  "#FF1744",
  };

  const leftTabs = [
    {id:"templates", icon:"grid",     label:"Templates"},
    {id:"layers",    icon:"layers",   label:"Layers"},
    {id:"projects",  icon:"save",     label:"Projetos"},
    {id:"assets",    icon:"image",    label:"Assets"},
    {id:"ai",        icon:"ai",       label:"IA Copy"},
  ];

  const iconBtn = (onClick, iconName, label, active=false, danger=false, disabled=false) => (
    <button onClick={onClick} disabled={disabled} title={label} style={{
      display:"flex",alignItems:"center",justifyContent:"center",
      width:36,height:36,borderRadius:10,border:"none",cursor:disabled?"not-allowed":"pointer",
      background:active?"rgba(0,229,255,0.15)":danger?"rgba(255,23,68,0.12)":"rgba(255,255,255,0.05)",
      color:active?C.accent:danger?C.danger:C.muted,
      transition:"all .15s",opacity:disabled?.4:1,
    }}
    onMouseEnter={e=>{if(!disabled)e.currentTarget.style.background=active?"rgba(0,229,255,0.25)":danger?"rgba(255,23,68,0.22)":"rgba(255,255,255,0.10)";}}
    onMouseLeave={e=>{e.currentTarget.style.background=active?"rgba(0,229,255,0.15)":danger?"rgba(255,23,68,0.12)":"rgba(255,255,255,0.05)";}}>
      <Icon name={iconName} size={16} color={active?C.accent:danger?C.danger:C.muted}/>
    </button>
  );

  const propLabel = (t) => <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:5,marginTop:12}}>{t}</div>;

  const propInput = {
    width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${C.border2}`,
    borderRadius:8,padding:"7px 10px",color:C.text,fontSize:12,fontFamily:"inherit",
    boxSizing:"border-box",outline:"none",
  };
  const propSelect = {...propInput,cursor:"pointer"};

  const miniSlider = (val, min, max, step, onChange, label, fmt=(v)=>v) => (
    <div>
      {propLabel(`${label} — ${fmt(val)}`)}
      <input type="range" min={min} max={max} step={step} value={val} onChange={onChange}
        style={{width:"100%",accentColor:C.accent,height:3}}/>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg0,fontFamily:"'Rajdhani','DM Sans',sans-serif",color:C.text,overflow:"hidden",userSelect:"none"}}>
      <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Exo+2:wght@300;400;600;700&family=Orbitron:wght@400;700&family=Bebas+Neue&family=Montserrat:wght@400;600;700&family=Poppins:wght@400;600&family=Space+Grotesk:wght@400;600&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <style>{`
        *{box-sizing:border-box;}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:4px}
        input[type=range]{-webkit-appearance:none;height:3px;border-radius:2px;background:rgba(255,255,255,0.1)}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#00E5FF;cursor:pointer;box-shadow:0 0 6px rgba(0,229,255,0.5)}
        .el-btn{transition:all .15s}
        .el-btn:hover{background:rgba(255,255,255,0.08)!important}
        .tpl-btn:hover{border-color:rgba(0,229,255,0.4)!important;background:rgba(0,229,255,0.05)!important}
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      `}</style>

      {/* ══ LEFT PANEL ══ */}
      <div style={{display:"flex",flexShrink:0}}>
        {/* Icon rail */}
        <div style={{width:52,background:C.bg1,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",paddingTop:12,gap:4,zIndex:10}}>
          {/* Logo */}
          <div style={{marginBottom:16,paddingBottom:12,borderBottom:`1px solid ${C.border}`,width:"100%",display:"flex",justifyContent:"center"}}>
            <svg viewBox="0 0 28 28" style={{width:24,height:24}}>
              <polygon points="14,2 26,24 2,24" fill="none" stroke="url(#g1)" strokeWidth="2"/>
              <polygon points="14,8 22,22 6,22" fill="none" stroke="url(#g2)" strokeWidth="1.5"/>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#FFD700"/><stop offset="100%" stopColor="#FF8F00"/></linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#00E5FF"/><stop offset="100%" stopColor="#1565C0"/></linearGradient>
              </defs>
            </svg>
          </div>

          {leftTabs.map(t=>(
            <button key={t.id} title={t.label} onClick={()=>{if(leftPanel===t.id&&!leftCollapsed){setLeftCollapsed(true);}else{setLeftPanel(t.id);setLeftCollapsed(false);}}} style={{
              width:36,height:36,borderRadius:10,border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              background:leftPanel===t.id&&!leftCollapsed?"rgba(0,229,255,0.12)":"transparent",
              color:leftPanel===t.id&&!leftCollapsed?C.accent:C.muted,transition:"all .15s",
            }}>
              <Icon name={t.icon} size={16} color={leftPanel===t.id&&!leftCollapsed?C.accent:C.muted}/>
            </button>
          ))}

          <div style={{flex:1}}/>

          {/* Quick add */}
          <div style={{paddingBottom:12,display:"flex",flexDirection:"column",gap:4,alignItems:"center"}}>
            {iconBtn(addText,"text","Adicionar Texto")}
            {iconBtn(addRect,"shape","Adicionar Forma")}
            {iconBtn(()=>fileRef.current.click(),"image","Upload Imagem")}
          </div>
        </div>

        {/* Expandable panel */}
        {!leftCollapsed && (
          <div style={{width:220,background:C.bg1,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",overflowY:"auto",animation:"fadeUp .15s ease"}}>

            {/* Panel header */}
            <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>
                {leftTabs.find(t=>t.id===leftPanel)?.label}
              </span>
              <button onClick={()=>setLeftCollapsed(true)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,padding:2}}>
                <Icon name="close" size={13} color={C.muted}/>
              </button>
            </div>

            <div style={{flex:1,padding:"10px 12px",overflowY:"auto"}}>

              {/* TEMPLATES */}
              {leftPanel==="templates" && (
                <div>
                  <div style={{display:"flex",flexDirection:"column",gap:5}}>
                    {TEMPLATES.map(tpl=>(
                      <button key={tpl.id} className="tpl-btn" onClick={()=>applyTemplate(tpl)} style={{
                        width:"100%",padding:"9px 12px",background:"rgba(255,255,255,0.03)",
                        border:`1px solid ${C.border}`,borderRadius:10,color:C.text,
                        cursor:"pointer",textAlign:"left",fontSize:12,fontFamily:"inherit",
                        display:"flex",alignItems:"center",gap:8,
                      }}>
                        <div style={{width:28,height:28,borderRadius:6,background:tpl.bg,flexShrink:0,border:`1px solid ${C.border}`}}/>
                        {tpl.label}
                      </button>
                    ))}
                  </div>

                  <div style={{marginTop:16,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                    <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:10}}>Formato</div>
                    <div style={{display:"flex",flexDirection:"column",gap:4}}>
                      {PRESETS.map(p=>(
                        <button key={p.id} onClick={()=>{setPreset(p);setSelected(null);}} style={{
                          width:"100%",padding:"7px 10px",background:preset.id===p.id?"rgba(0,229,255,0.08)":"rgba(255,255,255,0.02)",
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
                </div>
              )}

              {/* LAYERS */}
              {leftPanel==="layers" && (
                <div style={{display:"flex",flexDirection:"column",gap:3}}>
                  {elements.length===0 && <div style={{fontSize:11,color:C.muted,textAlign:"center",padding:"24px 0"}}>Nenhum elemento</div>}
                  {[...elements].reverse().map(el=>(
                    <div key={el.id} onClick={()=>setSelected(el.id)} style={{
                      padding:"8px 10px",borderRadius:8,cursor:"pointer",
                      background:el.id===selected?"rgba(0,229,255,0.08)":"rgba(255,255,255,0.02)",
                      border:`1px solid ${el.id===selected?"rgba(0,229,255,0.25)":C.border}`,
                      display:"flex",alignItems:"center",justifyContent:"space-between",
                      fontSize:11,color:el.id===selected?C.accent:C.muted,
                    }}>
                      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>
                        {el.type==="text"?`T ${el.text?.slice(0,12)}`:el.type==="image"?"🖼 Imagem":"▪ Forma"}
                      </span>
                      <div style={{display:"flex",gap:2,flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();moveLayer(el.id,1);}} style={{width:18,height:18,background:"none",border:"none",borderRadius:4,color:C.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Icon name="down" size={11} color={C.muted}/>
                        </button>
                        <button onClick={e=>{e.stopPropagation();moveLayer(el.id,-1);}} style={{width:18,height:18,background:"none",border:"none",borderRadius:4,color:C.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                          <Icon name="up" size={11} color={C.muted}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PROJECTS */}
              {leftPanel==="projects" && (
                <div>
                  <input value={projectName} onChange={e=>setProjectName(e.target.value)} style={{...propInput,marginBottom:8}} placeholder="Nome do projeto"/>
                  <button onClick={saveProject} style={{width:"100%",padding:"9px",background:"linear-gradient(135deg,#1565C0,#00B4D8)",border:"none",borderRadius:10,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12,marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <Icon name="save" size={13} color="#fff"/> Salvar Projeto
                  </button>
                  <div style={{fontSize:9,color:C.muted,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:8}}>Salvos</div>
                  {projects.length===0 && <div style={{fontSize:11,color:C.muted,textAlign:"center",padding:"12px 0"}}>Nenhum projeto</div>}
                  {projects.map(p=>(
                    <div key={p.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:10,padding:"10px 12px",marginBottom:6}}>
                      <div style={{fontSize:12,color:C.text,fontWeight:600,marginBottom:3}}>{p.name}</div>
                      <div style={{fontSize:9,color:C.muted,marginBottom:8}}>{p.format} · {new Date(p.created_at).toLocaleDateString("pt-BR")}</div>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={()=>loadProject(p)} style={{flex:1,padding:"5px",background:"rgba(0,229,255,0.08)",border:`1px solid rgba(0,229,255,0.2)`,borderRadius:6,color:C.accent,cursor:"pointer",fontSize:10,fontFamily:"inherit"}}>Abrir</button>
                        <button onClick={()=>deleteProject(p.id)} style={{padding:"5px 8px",background:"rgba(255,23,68,0.08)",border:"1px solid rgba(255,23,68,0.2)",borderRadius:6,color:C.danger,cursor:"pointer",fontSize:10}}>
                          <Icon name="trash" size={11} color={C.danger}/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ASSETS */}
              {leftPanel==="assets" && (
                <div>
                  <button onClick={()=>assetRef.current.click()} style={{width:"100%",padding:"9px",background:"rgba(255,215,0,0.06)",border:`1px solid rgba(255,215,0,0.2)`,borderRadius:10,color:C.gold,cursor:"pointer",fontSize:11,fontFamily:"inherit",marginBottom:10,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <Icon name="plus" size={13} color={C.gold}/> Upload Asset
                  </button>
                  <input ref={assetRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleAssetUpload}/>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {assets.map(a=>(
                      <div key={a.id} onClick={()=>useAsset(a.url)} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden",cursor:"pointer",aspectRatio:"1",position:"relative"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="rgba(0,229,255,0.3)"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
                        <img src={a.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
                      </div>
                    ))}
                    {assets.length===0 && <div style={{gridColumn:"1/-1",fontSize:11,color:C.muted,textAlign:"center",padding:"12px 0"}}>Nenhum asset</div>}
                  </div>
                </div>
              )}

              {/* AI */}
              {leftPanel==="ai" && (
                <div>
                  <div style={{fontSize:11,color:C.muted,marginBottom:10,lineHeight:1.6}}>Descreva o que quer comunicar e a IA gera título, subtítulo e CTA.</div>
                  <textarea value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)}
                    placeholder="Ex: post promovendo o plano gratuito para MEIs que precisam de controle financeiro"
                    style={{...propInput,height:90,resize:"none",lineHeight:1.5}}/>
                  <button onClick={generateAICopy} disabled={aiLoading} style={{
                    width:"100%",marginTop:8,padding:"10px",
                    background:aiLoading?"rgba(255,255,255,0.05)":"linear-gradient(135deg,#1565C0,#00B4D8)",
                    border:"none",borderRadius:10,color:"#fff",
                    cursor:aiLoading?"wait":"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12,
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                    opacity:aiLoading?.6:1,
                  }}>
                    <Icon name="magic" size={14} color="#fff"/>
                    {aiLoading?"Gerando...":"Gerar Textos"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ══ CENTER — Canvas ══ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",background:C.bg0,minWidth:0}}>

        {/* Top bar */}
        <div style={{height:48,background:C.bg1,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",padding:"0 14px",gap:8,flexShrink:0}}>

          {/* Undo/Redo */}
          {iconBtn(undo,"undo","Desfazer (Ctrl+Z)",false,false,histIdx<=0)}
          {iconBtn(redo,"redo","Refazer (Ctrl+Y)",false,false,histIdx>=history.length-1)}

          <div style={{width:1,height:20,background:C.border,margin:"0 4px"}}/>

          {/* Lasso */}
          {iconBtn(()=>{setLassoMode(v=>!v);}, "lasso", lassoMode?"Desativar Lasso":"Recorte Lasso", lassoMode)}

          {/* Selected actions */}
          {selectedEl && <>
            <div style={{width:1,height:20,background:C.border,margin:"0 2px"}}/>
            {iconBtn(duplicateEl,"copy","Duplicar elemento")}
            {iconBtn(deleteSelected,"trash","Deletar (Del)",false,true)}
            {selectedEl.type==="image" && iconBtn(
              handleRemoveBgSelected,
              "scissors",
              rmbLoading?"Removendo fundo...":"Remover fundo (IA)",
              rmbLoading,false,rmbLoading
            )}
          </>}

          <div style={{flex:1}}/>

          {/* Preset selector pill */}
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

          {/* Grid toggle */}
          <button onClick={()=>setShowGrid(v=>!v)} title="Grid" style={{width:32,height:32,borderRadius:8,border:"none",cursor:"pointer",background:showGrid?"rgba(0,229,255,0.1)":"transparent",color:showGrid?C.accent:C.muted,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon name="grid" size={15} color={showGrid?C.accent:C.muted}/>
          </button>

          {/* Zoom */}
          <div style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"4px 10px",border:`1px solid ${C.border}`}}>
            <input type="range" min=".3" max="2.5" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))} style={{width:60}}/>
            <span style={{fontSize:10,color:C.accent,fontWeight:700,minWidth:34}}>{Math.round(zoom*100)}%</span>
          </div>

          {/* Export */}
          <button onClick={exportCanvas} disabled={exportLoading} style={{
            padding:"7px 16px",background:"linear-gradient(135deg,#FFD700,#FF8F00)",
            border:"none",borderRadius:10,color:"#0A0F1E",
            cursor:exportLoading?"wait":"pointer",fontFamily:"inherit",fontWeight:700,fontSize:12,
            display:"flex",alignItems:"center",gap:6,letterSpacing:.5,
            boxShadow:"0 4px 16px rgba(255,215,0,0.3)",opacity:exportLoading?.7:1,
          }}>
            <Icon name="download" size={14} color="#0A0F1E"/>
            {exportLoading?"Exportando...":"PNG"}
          </button>
        </div>

        {/* Canvas workspace */}
        <div style={{flex:1,overflow:"auto",display:"flex",alignItems:"center",justifyContent:"center",padding:40,background:`radial-gradient(ellipse at center, ${C.bg2} 0%, ${C.bg0} 100%)`}}
          onMouseDown={e=>{setSelected(null);startLasso(e);}}
          onMouseMove={moveLasso}
          onMouseUp={endLasso}>
          <div style={{transform:`scale(${zoom})`,transformOrigin:"center center"}}>
            <div style={{textAlign:"center",marginBottom:8,fontSize:9,color:"rgba(255,255,255,0.2)",letterSpacing:"0.2em",textTransform:"uppercase"}}>
              {preset.label} · {preset.w}×{preset.h}
            </div>
            <div ref={canvasRef} style={{
              width:cw,height:ch,background:bg,position:"relative",overflow:"hidden",
              borderRadius:2,
              boxShadow:"0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
              backgroundImage:showGrid
                ? `${bg.startsWith("linear")?bg:`url('')`},repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(255,255,255,0.025) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(255,255,255,0.025) 40px)`
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

      {/* ══ RIGHT PANEL — Properties (contextual) ══ */}
      {(selectedEl || true) && (
        <div style={{width:240,background:C.bg1,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflowY:"auto"}}>
          <div style={{padding:"14px 16px 10px",borderBottom:`1px solid ${C.border}`,fontSize:10,fontWeight:700,color:C.muted,letterSpacing:"0.15em",textTransform:"uppercase"}}>
            {selectedEl ? `${selectedEl.type==="text"?"Texto":selectedEl.type==="image"?"Imagem":"Forma"}` : "Canvas"}
          </div>

          <div style={{padding:"8px 14px",overflowY:"auto",flex:1}}>

            {/* Sem seleção — fundo do canvas */}
            {!selectedEl && (
              <>
                {propLabel("Plano de Fundo")}
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:10}}>
                  {BG_PRESETS.map((b,i)=>(
                    <div key={i} onClick={()=>setBg(b)} style={{
                      height:32,background:b,borderRadius:7,cursor:"pointer",
                      border:bg===b?`2px solid ${C.accent}`:`2px solid ${C.border}`,transition:"border .15s",
                    }}/>
                  ))}
                </div>
                {propLabel("Cor personalizada")}
                <input type="color" defaultValue="#0A0F1E" onChange={e=>setBg(e.target.value)}
                  style={{width:"100%",height:36,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",background:"none"}}/>
                {lassoMode && (
                  <div style={{marginTop:14,padding:"10px 12px",background:"rgba(0,229,255,0.06)",border:`1px solid rgba(0,229,255,0.15)`,borderRadius:10,fontSize:10,color:C.accent,lineHeight:1.6}}>
                    🔲 <strong>Lasso ativo</strong><br/>Selecione uma imagem e desenhe sobre ela para recortar livremente.
                  </div>
                )}
              </>
            )}

            {/* Texto */}
            {selectedEl?.type==="text" && (
              <>
                {propLabel("Conteúdo")}
                <textarea value={selectedEl.text} onChange={e=>updateEl(selected,{text:e.target.value})}
                  style={{...propInput,height:64,resize:"none",lineHeight:1.5}}/>

                {propLabel("Fonte")}
                <select value={selectedEl.style.fontFamily} onChange={e=>updateStyle(selected,{fontFamily:e.target.value})} style={propSelect}>
                  {FONTS.map(f=><option key={f} value={f}>{f}</option>)}
                </select>

                {miniSlider(selectedEl.style.fontSize,8,150,1,e=>updateStyle(selected,{fontSize:Number(e.target.value)}),"Tamanho",v=>`${v}px`)}

                {propLabel("Peso")}
                <select value={selectedEl.style.fontWeight} onChange={e=>updateStyle(selected,{fontWeight:e.target.value})} style={propSelect}>
                  {["300","400","500","600","700","800"].map(w=><option key={w} value={w}>{w}</option>)}
                </select>

                {propLabel("Alinhamento")}
                <div style={{display:"flex",gap:4}}>
                  {[["left","⬅"],["center","↔"],["right","➡"]].map(([a,ic])=>(
                    <button key={a} onClick={()=>updateStyle(selected,{textAlign:a})} style={{flex:1,padding:"6px",background:selectedEl.style.textAlign===a?"rgba(0,229,255,0.12)":"rgba(255,255,255,0.04)",border:`1px solid ${selectedEl.style.textAlign===a?"rgba(0,229,255,0.3)":C.border}`,borderRadius:8,color:selectedEl.style.textAlign===a?C.accent:C.muted,cursor:"pointer",fontSize:13}}>{ic}</button>
                  ))}
                </div>

                {miniSlider(selectedEl.style.letterSpacing,0,20,1,e=>updateStyle(selected,{letterSpacing:Number(e.target.value)}),"Espaçamento",v=>`${v}px`)}
                {miniSlider(selectedEl.opacity??1,0,1,.05,e=>updateEl(selected,{opacity:Number(e.target.value)}),"Opacidade",v=>`${Math.round(v*100)}%`)}

                {propLabel("Cor")}
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,marginBottom:6}}>
                  {PALETTE.slice(0,15).map(c=>(
                    <div key={c} onClick={()=>updateStyle(selected,{color:c})} style={{height:22,background:c,borderRadius:5,cursor:"pointer",border:selectedEl.style.color===c?`2px solid ${C.accent}`:`1px solid ${C.border}`}}/>
                  ))}
                </div>
                <input type="color" value={selectedEl.style.color} onChange={e=>updateStyle(selected,{color:e.target.value})}
                  style={{width:"100%",height:32,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",background:"none"}}/>

                {propLabel("Sombra")}
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:11,color:C.muted,cursor:"pointer"}}>
                  <input type="checkbox" checked={selectedEl.style.shadow||false} onChange={e=>updateStyle(selected,{shadow:e.target.checked})} style={{accentColor:C.accent}}/>
                  Ativar sombra de texto
                </label>
              </>
            )}

            {/* Forma */}
            {selectedEl?.type==="rect" && (
              <>
                {propLabel("Cor")}
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:4,marginBottom:6}}>
                  {PALETTE.slice(0,15).map(c=>(
                    <div key={c} onClick={()=>updateEl(selected,{fill:c})} style={{height:22,background:c,borderRadius:5,cursor:"pointer",border:selectedEl.fill===c?`2px solid ${C.accent}`:`1px solid ${C.border}`}}/>
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

            {/* Imagem */}
            {selectedEl?.type==="image" && (
              <>
                {/* Remover fundo destaque */}
                <div style={{padding:"10px 12px",background:"rgba(0,229,255,0.05)",border:`1px solid rgba(0,229,255,0.15)`,borderRadius:12,marginBottom:8}}>
                  <div style={{fontSize:10,color:C.accent,fontWeight:700,letterSpacing:"0.1em",marginBottom:8}}>REMOVER FUNDO</div>
                  <button onClick={handleRemoveBgSelected} disabled={rmbLoading} style={{
                    width:"100%",padding:"9px",background:rmbLoading?"rgba(255,255,255,0.04)":"linear-gradient(135deg,rgba(0,229,255,0.15),rgba(0,180,216,0.15))",
                    border:`1px solid ${rmbLoading?"rgba(255,255,255,0.08)":"rgba(0,229,255,0.3)"}`,borderRadius:9,
                    color:rmbLoading?C.muted:C.accent,cursor:rmbLoading?"wait":"pointer",
                    fontFamily:"inherit",fontWeight:700,fontSize:12,
                    display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                    opacity:rmbLoading?.6:1,
                  }}>
                    <Icon name="scissors" size={14} color={rmbLoading?C.muted:C.accent}/>
                    {rmbLoading?"Processando...":"Remover fundo desta imagem"}
                  </button>
                </div>

                {miniSlider(selectedEl.opacity??1,0,1,.05,e=>updateEl(selected,{opacity:Number(e.target.value)}),"Opacidade",v=>`${Math.round(v*100)}%`)}
                {miniSlider(selectedEl.w,.05,1,.01,e=>updateEl(selected,{w:Number(e.target.value)}),"Largura",v=>`${Math.round(v*100)}%`)}
                {miniSlider(selectedEl.h,.05,1,.01,e=>updateEl(selected,{h:Number(e.target.value)}),"Altura",v=>`${Math.round(v*100)}%`)}

                {propLabel("Recorte por Forma")}
                <select value={CLIP_SHAPES.find(s=>s.clip===selectedEl.clip)?.id||"none"}
                  onChange={e=>{const shape=CLIP_SHAPES.find(s=>s.id===e.target.value);updateEl(selected,{clip:shape?.clip||"none"});}} style={propSelect}>
                  {CLIP_SHAPES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
                </select>

                <div style={{marginTop:10,padding:"10px 12px",background:"rgba(255,255,255,0.03)",border:`1px solid ${C.border}`,borderRadius:10,fontSize:10,color:C.muted,lineHeight:1.6}}>
                  🔲 Para <strong style={{color:C.text}}>recorte lasso</strong>, ative na toolbar, selecione esta imagem e desenhe no canvas.
                </div>
              </>
            )}

            {/* Posição numérica */}
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position:"fixed",bottom:24,right:24,zIndex:9999,
          padding:"12px 18px",borderRadius:12,fontWeight:600,fontSize:13,
          background:toast.type==="error"?"rgba(255,23,68,0.95)":toast.type==="info"?"rgba(21,101,192,0.95)":"rgba(0,200,83,0.95)",
          color:"#fff",boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
          animation:"fadeUp .2s ease",backdropFilter:"blur(10px)",
          display:"flex",alignItems:"center",gap:8,
        }}>
          {toast.msg}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImageUpload}/>
    </div>
  );
}