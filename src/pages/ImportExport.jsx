import { useState, useRef } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Sidebar from '../components/layout/Sidebar';
import { useTheme } from '../contexts/ThemeContext';
import ProductReportModal from '../components/ProductReportModal';

const BASE_URL = 'https://finance-control-api-production.up.railway.app/api';

const MODULES = [
  { key: 'transactions', label: 'Transações',  icon: '💰', description: 'Receitas e despesas',     hasTemplate: true,  supportsDateFilter: true,  canImport: true,  adminOnly: false },
  { key: 'bills',        label: 'Contas',       icon: '📄', description: 'Contas a pagar/receber',  hasTemplate: true,  supportsDateFilter: true,  canImport: true,  adminOnly: false },
  { key: 'clients',      label: 'Clientes',     icon: '👥', description: 'Base de clientes',        hasTemplate: true,  supportsDateFilter: true,  canImport: true,  adminOnly: false },
  { key: 'products',     label: 'Produtos',     icon: '📦', description: 'Produtos e serviços',     hasTemplate: true,  supportsDateFilter: false, canImport: true,  adminOnly: false },
  { key: 'quotes',       label: 'Orçamentos',   icon: '🧾', description: 'Orçamentos emitidos',     hasTemplate: false, supportsDateFilter: true,  canImport: false, adminOnly: false },
  { key: 'sales',        label: 'Vendas',       icon: '🛒', description: 'Pedidos e OS',            hasTemplate: false, supportsDateFilter: true,  canImport: false, adminOnly: false },
  { key: 'team',         label: 'Equipe',       icon: '👤', description: 'Membros da equipe',       hasTemplate: true,  supportsDateFilter: false, canImport: true,  adminOnly: true  },
];

// Campos esperados por módulo com label amigável
const MODULE_FIELDS = {
  transactions: [
    { key: 'type',         label: 'Tipo',             required: true,  hint: 'receita / despesa'     },
    { key: 'description',  label: 'Descrição',        required: true,  hint: null                    },
    { key: 'amount',       label: 'Valor',            required: true,  hint: null                    },
    { key: 'category',     label: 'Categoria',        required: false, hint: null                    },
    { key: 'date',         label: 'Data',             required: false, hint: 'dd/mm/aaaa'            },
    { key: 'source',       label: 'Origem',           required: false, hint: 'venda / os / manual'   },
    { key: 'client',       label: 'Cliente (venda)',  required: false, hint: 'nome do cliente'       },
    { key: 'item_name',    label: 'Produto (venda)',  required: false, hint: 'nome do produto/serviço'},
    { key: 'item_qty',     label: 'Quantidade',       required: false, hint: null                    },
    { key: 'item_price',   label: 'Preço Unitário',   required: false, hint: null                    },
    { key: 'order_number', label: 'Nº do Pedido/OS',  required: false, hint: 'ex: PED-2025-001'      },
  ],
  bills: [
    { key: 'type',        label: 'Tipo',        required: true  },
    { key: 'description', label: 'Descrição',   required: true  },
    { key: 'amount',      label: 'Valor',       required: true  },
    { key: 'due_date',    label: 'Vencimento',  required: true  },
    { key: 'category',    label: 'Categoria',   required: false },
    { key: 'status',      label: 'Status',      required: false },
    { key: 'notes',       label: 'Observações', required: false },
  ],
  clients: [
    { key: 'name',     label: 'Nome',        required: true  },
    { key: 'email',    label: 'Email',       required: false },
    { key: 'phone',    label: 'Telefone',    required: false },
    { key: 'document', label: 'Documento',   required: false },
    { key: 'address',  label: 'Endereço',    required: false },
    { key: 'notes',    label: 'Observações', required: false },
  ],
  products: [
    { key: 'name',        label: 'Nome',           required: true  },
    { key: 'sku',         label: 'SKU',            required: false },
    { key: 'type',        label: 'Tipo',           required: false },
    { key: 'category',    label: 'Categoria',      required: false },
    { key: 'price',       label: 'Preço de Venda', required: false },
    { key: 'cost',        label: 'Custo',          required: false },
    { key: 'stock_qty',   label: 'Estoque',        required: false },
    { key: 'stock_min',   label: 'Estoque Mínimo', required: false },
    { key: 'unit',        label: 'Unidade',        required: false },
    { key: 'description', label: 'Descrição',      required: false },
  ],
  team: [
    { key: 'name',   label: 'Nome',   required: true  },
    { key: 'email',  label: 'Email',  required: true  },
    { key: 'role',   label: 'Role',   required: true  },
    { key: 'active', label: 'Ativo',  required: false },
  ],
};

// Mapeamento automático por similaridade de nome
const AUTO_ALIASES = {
  transactions: {
    type:         ['Tipo','tipo','Natureza','natureza'],
    description:  ['Descrição','descricao','Histórico','historico','Description','Memo'],
    amount:       ['Valor','valor','Amount','Valor Lançamento'],
    category:     ['Categoria','categoria','Category','Plano de Contas'],
    date:         ['Data','data','Date','Competência','competencia'],
    source:       ['Origem','origem','Source','Fonte','Tipo Lançamento'],
    client:       ['Cliente','cliente','Client','Razão Social','Sacado'],
    item_name:    ['Produto','produto','Item','item','Serviço','servico','Descrição do Item'],
    item_qty:     ['Quantidade','quantidade','Qtd','qtd','Qty'],
    item_price:   ['Preço Unitário','preco_unitario','Unit Price','Preço Unit','Vlr Unit'],
    order_number: ['Número Pedido','numero_pedido','N. Pedido','Order Number','Nº OS','Nº Pedido'],
  },
  bills: {
    type:        ['Tipo','tipo','Natureza'],
    description: ['Descrição','descricao','Histórico','historico'],
    amount:      ['Valor','valor','Amount'],
    due_date:    ['Vencimento','vencimento','Data Vencimento','Due Date'],
    category:    ['Categoria','categoria'],
    status:      ['Status','status'],
    notes:       ['Observações','observacoes','Obs'],
  },
  clients: {
    name:     ['Nome','nome','Name','Cliente','Razão Social'],
    email:    ['Email','email','E-mail'],
    phone:    ['Telefone','telefone','Phone','Celular'],
    document: ['Documento','documento','CPF','CNPJ','CPF/CNPJ'],
    address:  ['Endereço','endereco','Address'],
    notes:    ['Observações','observacoes','Obs'],
  },
  products: {
    name:        ['Nome','nome','Produto','Name'],
    sku:         ['SKU','sku','Código','Cod','Referência'],
    type:        ['Tipo','tipo'],
    category:    ['Categoria','categoria'],
    price:       ['Preço de Venda','preco_venda','Preço','Price'],
    cost:        ['Custo','custo','Cost'],
    stock_qty:   ['Estoque','estoque','Stock','Quantidade'],
    stock_min:   ['Estoque Mínimo','estoque_min'],
    unit:        ['Unidade','unidade','Unit'],
    description: ['Descrição','descricao','Description'],
  },
  team: {
    name:   ['Nome','nome','Name'],
    email:  ['Email','email','E-mail'],
    role:   ['Role','role','Função','Perfil','Cargo'],
    active: ['Ativo','ativo','Active','Status'],
  },
};

const SYSTEMS = [
  { key: 'generico',   label: 'CSV Genérico',  icon: '📋', color: '#6366f1' },
  { key: 'conta_azul', label: 'Conta Azul',    icon: '🔵', color: '#2563eb' },
  { key: 'omie',       label: 'Omie',          icon: '🟠', color: '#ea580c' },
  { key: 'nibo',       label: 'Nibo',          icon: '🟢', color: '#15803d' },
  { key: 'linx',       label: 'Linx',          icon: '🔶', color: '#f59e0b' },
];

function buildAutoMapping(columns, module) {
  const aliases = AUTO_ALIASES[module] || {};
  const mapping = {};
  for (const [field, aliasList] of Object.entries(aliases)) {
    for (const alias of aliasList) {
      if (columns.includes(alias)) {
        mapping[field] = alias;
        break;
      }
    }
  }
  return mapping;
}

export default function ImportExport() {
  const { theme, themeId } = useTheme();
  const isGlass = themeId === 'glass' || themeId === 'gray';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab]     = useState('export');

  // ── Export state ──
  const [exportDates, setExportDates]     = useState({ from: '', to: '' });
  const [exportFormat, setExportFormat]   = useState('csv');
  const [exportLoading, setExportLoading] = useState({});
  const [exportSuccess, setExportSuccess] = useState({});
  const [exportAllLoading, setExportAllLoading] = useState(false);
  const [exportAllSuccess, setExportAllSuccess] = useState(false);
  const [exportAllProgress, setExportAllProgress] = useState([]);

  // ── Import state ──
  const [selectedSystem, setSelectedSystem] = useState('generico');
  const [uploadFile, setUploadFile]         = useState(null);
  const [csvText, setCsvText]               = useState('');
  const [importModule, setImportModule]     = useState('transactions');
  const [importPreview, setImportPreview]   = useState(null);
  const [importMapping, setImportMapping]   = useState({});
  const [importStep, setImportStep]         = useState('upload');
  const [importLoading, setImportLoading]   = useState(false);
  const [importResult, setImportResult]     = useState(null);
  const [dupAction, setDupAction]           = useState('skip');  // skip | update | create_anyway
  const [detectedSystem, setDetectedSystem] = useState(null);
  const fileRef = useRef();

  const token = () => localStorage.getItem('token');
  const role  = localStorage.getItem('role') || 'viewer';

  // Modal relatório de produtos
  const [reportModal, setReportModal] = useState(false);

  // Módulos visíveis conforme role
  const visibleModules = MODULES.filter(m => !m.adminOnly || role === 'admin');

  // ── cores ──
  const cardBg     = isGlass ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.06)';
  const cardBorder = isGlass ? 'rgba(255,255,255,0.5)'  : 'rgba(255,255,255,0.1)';
  const inputBg    = isGlass ? 'rgba(255,255,255,0.5)'  : 'rgba(255,255,255,0.08)';
  const textMain   = theme.textPrimary;
  const textSub    = theme.textSecondary || theme.textMuted;
  const card = {
    background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: 24,
    backdropFilter: isGlass ? 'blur(16px)' : undefined,
    WebkitBackdropFilter: isGlass ? 'blur(16px)' : undefined,
  };

  // ── helpers ──
  const triggerDownload = (blob, filename) => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = filename; link.click();
    URL.revokeObjectURL(link.href);
  };

  const fetchExport = async (modKey, params) => {
    const resp = await fetch(`${BASE_URL}/import-export/export/${modKey}?${params}`, {
      headers: { Authorization: `Bearer ${token()}` }
    });
    if (!resp.ok) throw new Error(`${modKey}: ${resp.status}`);
    return resp;
  };

  // ── EXPORTAR ──
  const handleExport = async (mod) => {
    setExportLoading(p => ({ ...p, [mod.key]: true }));
    try {
      const params = new URLSearchParams();
      if (mod.supportsDateFilter && exportDates.from) params.append('date_from', exportDates.from);
      if (mod.supportsDateFilter && exportDates.to)   params.append('date_to',   exportDates.to);
      params.append('format', exportFormat);
      const resp = await fetchExport(mod.key, params);
      const blob = await resp.blob();
      triggerDownload(blob, `${mod.key}_export.${exportFormat}`);
      setExportSuccess(p => ({ ...p, [mod.key]: true }));
      setTimeout(() => setExportSuccess(p => ({ ...p, [mod.key]: false })), 3000);
    } catch (err) { alert('Erro: ' + err.message); }
    finally { setExportLoading(p => ({ ...p, [mod.key]: false })); }
  };

  const handleExportAll = async () => {
    setExportAllLoading(true); setExportAllSuccess(false); setExportAllProgress([]);
    const params = new URLSearchParams();
    if (exportDates.from) params.append('date_from', exportDates.from);
    if (exportDates.to)   params.append('date_to',   exportDates.to);
    params.append('format', exportFormat);
    const blobs = []; const progress = [];
    for (const mod of visibleModules) {
      const p = new URLSearchParams(params);
      if (!mod.supportsDateFilter) { p.delete('date_from'); p.delete('date_to'); }
      try {
        const resp = await fetchExport(mod.key, p);
        const blob = await resp.blob();
        blobs.push({ name: `${mod.key}.${exportFormat}`, blob });
        progress.push({ key: mod.key, label: mod.label, ok: true });
      } catch { progress.push({ key: mod.key, label: mod.label, ok: false }); }
      setExportAllProgress([...progress]);
    }
    for (const { name, blob } of blobs) { triggerDownload(blob, name); await new Promise(r => setTimeout(r, 400)); }
    setExportAllSuccess(true);
    setTimeout(() => { setExportAllSuccess(false); setExportAllProgress([]); }, 5000);
    setExportAllLoading(false);
  };

  const handleDownloadTemplate = async (modKey) => {
    try {
      const resp = await fetch(`${BASE_URL}/import-export/export/template/${modKey}`, { headers: { Authorization: `Bearer ${token()}` } });
      if (!resp.ok) throw new Error('Falha');
      triggerDownload(await resp.blob(), `template_${modKey}.csv`);
    } catch (err) { alert('Erro: ' + err.message); }
  };

  // ── lê arquivo → csv text ──
  const readFileAsText = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = e => res(e.target.result);
    r.onerror = rej;
    r.readAsText(file, 'UTF-8');
  });

  // ── IMPORTAR: STEP 1 — PREVIEW + DETECÇÃO ──
  const handlePreview = async () => {
    if (!uploadFile) return;
    setImportLoading(true);
    try {
      const text = await readFileAsText(uploadFile);
      setCsvText(text);

      // 1. Detectar sistema automaticamente
      const detRes = await fetch(`${BASE_URL}/import/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ csv_text: text }),
      });
      const detData = await detRes.json();
      const detSys  = detData.sistema || 'generico';
      const detEnt  = detData.entity  || importModule;
      setDetectedSystem(detData);
      if (detSys !== 'generico') {
        setSelectedSystem(detSys);
        setImportModule(detEnt);
      }

      // 2. Preview
      const entity  = detSys !== 'generico' ? detEnt : importModule;
      const sistema = detSys !== 'generico' ? detSys : selectedSystem;
      const prevRes = await fetch(`${BASE_URL}/import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ csv_text: text, entity, sistema, col_map: importMapping }),
      });
      if (!prevRes.ok) throw new Error(`Servidor retornou ${prevRes.status}`);
      const data = await prevRes.json();
      setImportPreview(data);
      if (data.headers?.length) {
        const autoMap = buildAutoMapping(data.headers, entity);
        setImportMapping(autoMap);
      }
      setImportStep('mapping');
    } catch (err) { alert('Erro: ' + err.message); }
    finally { setImportLoading(false); }
  };

  // ── IMPORTAR: STEP 1b — REGENERAR PREVIEW ao mudar sistema/entidade ──
  const handleRepreview = async () => {
    if (!csvText) return;
    setImportLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/import/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ csv_text: csvText, entity: importModule, sistema: selectedSystem, col_map: importMapping }),
      });
      const data = await res.json();
      setImportPreview(data);
    } catch (err) { alert('Erro: ' + err.message); }
    finally { setImportLoading(false); }
  };

  // ── IMPORTAR: STEP 2 — CONFIRMAR ──
  const handleConfirmImport = async () => {
    setImportLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/import/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          csv_text: csvText, entity: importModule,
          sistema: selectedSystem, col_map: importMapping,
          duplicate_action: dupAction,
        }),
      });
      if (!res.ok) throw new Error(`Servidor retornou ${res.status}`);
      const result = await res.json();
      setImportResult(result);
      setImportStep('result');
    } catch (err) { alert('Erro na importação: ' + err.message); }
    finally { setImportLoading(false); }
  };

  // Reset completo (usado no "Voltar" e "Nova Importação")
  const resetImport = () => {
    setUploadFile(null); setImportPreview(null); setImportMapping({});
    setImportResult(null); setImportStep('upload');
  };

  // Troca de módulo — preserva o arquivo, limpa só preview/mapeamento
  const handleModuleChange = (newModule) => {
    setImportModule(newModule);
    setImportPreview(null);
    setImportMapping({});
    setImportResult(null);
    setImportStep('upload');
    // Não zera uploadFile — usuário pode reanalizar o mesmo arquivo
  };

  const tabBtn = (active) => ({
    padding: '9px 26px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
    background: active ? theme.primaryGrad : 'transparent',
    color: active ? '#fff' : textSub,
    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
  });

  const formatBtn = (active) => ({
    padding: '7px 18px', borderRadius: 8, cursor: 'pointer',
    border: `1px solid ${active ? '#6366f1' : cardBorder}`,
    background: active ? 'rgba(99,102,241,0.18)' : 'transparent',
    color: active ? '#818cf8' : textSub,
    fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
  });

  const stepIndicator = (step, label, current) => {
    const steps = ['upload', 'mapping', 'result'];
    const idx   = steps.indexOf(step);
    const cur   = steps.indexOf(current);
    const done  = idx < cur;
    const active = idx === cur;
    return (
      <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700,
          background: done ? '#16a34a' : active ? theme.primaryGrad : (isGlass ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'),
          color: done || active ? '#fff' : textSub,
          border: `2px solid ${done ? '#16a34a' : active ? '#6366f1' : cardBorder}`,
        }}>
          {done ? '✓' : idx + 1}
        </div>
        <span style={{ fontSize: 13, color: active ? textMain : textSub, fontWeight: active ? 600 : 400 }}>{label}</span>
        {idx < 2 && <span style={{ color: textSub, margin: '0 4px' }}>›</span>}
      </div>
    );
  };

  return (
    <PageLayout>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px', minWidth: 0 }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: textMain, fontSize: 24, fontWeight: 700, margin: 0 }}>📂 Importação & Exportação</h1>
          <p style={{ color: textSub, fontSize: 14, margin: '6px 0 0' }}>Exporte seus dados ou importe de outros sistemas</p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: 6, borderRadius: 14, background: cardBg, border: `1px solid ${cardBorder}`, marginBottom: 28, width: 'fit-content' }}>
          <button style={tabBtn(activeTab === 'export')} onClick={() => setActiveTab('export')}>⬇️ Exportar</button>
          <button style={tabBtn(activeTab === 'import')} onClick={() => setActiveTab('import')}>⬆️ Importar</button>
        </div>

        {/* ═══════════ EXPORTAÇÃO ═══════════ */}
        {activeTab === 'export' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Config */}
            <div style={card}>
              <h3 style={{ color: textMain, margin: '0 0 18px', fontSize: 15, fontWeight: 600 }}>⚙️ Configurações de Exportação</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-end' }}>
                <div>
                  <div style={{ color: textSub, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>📅 Período (opcional)</div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {['from','to'].map(k => (
                      <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ color: textSub, fontSize: 11 }}>{k === 'from' ? 'De' : 'Até'}</label>
                        <input type="date" value={exportDates[k]} onChange={e => setExportDates(p => ({ ...p, [k]: e.target.value }))}
                          style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: inputBg, color: textMain, fontSize: 14, outline: 'none' }} />
                      </div>
                    ))}
                    {(exportDates.from || exportDates.to) && (
                      <button onClick={() => setExportDates({ from:'', to:'' })} style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: 'transparent', color: textSub, cursor: 'pointer', fontSize: 13, alignSelf: 'flex-end' }}>✕ Limpar</button>
                    )}
                  </div>
                </div>
                <div>
                  <div style={{ color: textSub, fontSize: 11, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>📁 Formato</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={formatBtn(exportFormat==='csv')}  onClick={() => setExportFormat('csv')}>📋 CSV</button>
                    <button style={formatBtn(exportFormat==='xlsx')} onClick={() => setExportFormat('xlsx')}>📊 Excel</button>
                  </div>
                </div>
              </div>
              {!exportDates.from && !exportDates.to && <p style={{ color: textSub, fontSize: 12, margin: '14px 0 0', opacity: 0.7 }}>Sem filtro — exportará todos os registros.</p>}
            </div>

            {/* Exportar Tudo */}
            <div style={{ ...card, background: isGlass ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ color: textMain, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>📦 Exportar Tudo</div>
                  <div style={{ color: textSub, fontSize: 13, marginTop: 4 }}>Baixa todos os {visibleModules.length} módulos de uma vez{exportFormat === 'csv' ? ' em CSV' : ' em Excel'}</div>
                </div>
                <button onClick={handleExportAll} disabled={exportAllLoading} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', cursor: exportAllLoading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, background: exportAllSuccess ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#6366f1,#4f46e5)', color: '#fff', opacity: exportAllLoading ? 0.8 : 1, boxShadow: '0 4px 16px rgba(99,102,241,0.3)', whiteSpace: 'nowrap' }}>
                  {exportAllLoading ? '⏳ Exportando...' : exportAllSuccess ? '✅ Concluído!' : '📦 Exportar Tudo'}
                </button>
              </div>
              {exportAllProgress.length > 0 && (
                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {exportAllProgress.map(p => (
                    <span key={p.key} style={{ padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: p.ok ? 'rgba(22,163,74,0.15)' : 'rgba(239,68,68,0.15)', color: p.ok ? '#4ade80' : '#f87171', border: `1px solid ${p.ok ? 'rgba(22,163,74,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      {p.ok ? '✅' : '❌'} {p.label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ── RELATÓRIOS ── */}
            <div style={{ ...card, background: isGlass ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ color: textMain, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📊 Relatórios em PDF
                  </div>
                  <div style={{ color: textSub, fontSize: 13, marginTop: 4 }}>
                    Gere relatórios formatados com filtros e impressão temática
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {(role === 'admin' || role === 'financial' || role === 'stock') && (
                    <button
                      onClick={() => setReportModal(true)}
                      style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', boxShadow: '0 4px 16px rgba(22,163,74,0.35)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                      📦 Produtos & Estoque
                    </button>
                  )}
                </div>
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { icon: '📦', label: 'Produtos & Estoque', desc: 'Catálogo, margens, estoque e movimentações', action: () => setReportModal(true), roles: ['admin','financial','stock'] },
                ].filter(r => r.roles.includes(role)).map((r, i) => (
                  <div key={i} onClick={r.action} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.2)', background: isGlass ? 'rgba(255,255,255,0.2)' : 'rgba(34,197,94,0.06)', cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = isGlass ? 'rgba(255,255,255,0.3)' : 'rgba(34,197,94,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = isGlass ? 'rgba(255,255,255,0.2)' : 'rgba(34,197,94,0.06)'}
                  >
                    <span style={{ fontSize: 20 }}>{r.icon}</span>
                    <div>
                      <div style={{ color: textMain, fontWeight: 600, fontSize: 13 }}>{r.label}</div>
                      <div style={{ color: textSub, fontSize: 11, marginTop: 1 }}>{r.desc}</div>
                    </div>
                    <span style={{ color: '#22c55e', marginLeft: 'auto', fontSize: 14 }}>→</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid módulos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {visibleModules.map(mod => (
                <div key={mod.key} style={{ ...card, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 26 }}>{mod.icon}</span>
                    <div>
                      <div style={{ color: textMain, fontWeight: 700, fontSize: 15 }}>{mod.label}</div>
                      <div style={{ color: textSub, fontSize: 12 }}>{mod.description}</div>
                    </div>
                  </div>
                  {mod.supportsDateFilter && (exportDates.from || exportDates.to) ? (
                    <div style={{ fontSize: 11, color: '#818cf8', background: 'rgba(99,102,241,0.12)', borderRadius: 6, padding: '4px 8px' }}>📅 {exportDates.from||'...'} → {exportDates.to||'...'}</div>
                  ) : !mod.supportsDateFilter ? (
                    <div style={{ fontSize: 11, color: textSub, background: isGlass ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '4px 8px' }}>Exporta todos os registros</div>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                    <button onClick={() => handleExport(mod)} disabled={exportLoading[mod.key]}
                      style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', cursor: exportLoading[mod.key] ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, background: exportSuccess[mod.key] ? 'linear-gradient(135deg,#16a34a,#15803d)' : theme.primaryGrad, color: '#fff', opacity: exportLoading[mod.key] ? 0.7 : 1 }}>
                      {exportLoading[mod.key] ? '⏳...' : exportSuccess[mod.key] ? '✅ Baixado!' : exportFormat==='xlsx' ? '📊 Excel' : '📋 CSV'}
                    </button>
                    {mod.hasTemplate && (
                      <button onClick={() => handleDownloadTemplate(mod.key)} title="Template" style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: 'transparent', color: textSub, cursor: 'pointer', fontSize: 13 }}>📋</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════ IMPORTAÇÃO ═══════════ */}
        {activeTab === 'import' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Steps indicator */}
            <div style={{ ...card, padding: '16px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                {stepIndicator('upload',  '1. Arquivo',    importStep)}
                {stepIndicator('mapping', '2. Mapeamento', importStep)}
                {stepIndicator('result',  '3. Resultado',  importStep)}
              </div>
            </div>

            {/* ── STEP 1: UPLOAD ── */}
            {importStep === 'upload' && (
              <>
                {/* Sistemas */}
                <div style={card}>
                  <h3 style={{ color: textMain, margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>🔌 Sistema de Origem</h3>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {SYSTEMS.map(sys => (
                      <div key={sys.key} onClick={() => setSelectedSystem(sys.key)} style={{ padding: '8px 16px', borderRadius: 20, cursor: 'pointer', transition: 'all 0.2s', border: `2px solid ${selectedSystem===sys.key ? sys.color : cardBorder}`, background: selectedSystem===sys.key ? `${sys.color}22` : 'transparent', color: selectedSystem===sys.key ? textMain : textSub, fontWeight: selectedSystem===sys.key ? 700 : 400, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{sys.icon}</span><span>{sys.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload */}
                <div style={card}>
                  <h3 style={{ color: textMain, margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>⬆️ Enviar Arquivo</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <label style={{ color: textSub, fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Módulo de destino</label>
                      <select value={importModule} onChange={e => handleModuleChange(e.target.value)}
                        style={{ padding: '9px 12px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: inputBg, color: textMain, fontSize: 14, outline: 'none', minWidth: 220 }}>
                        {visibleModules.filter(m => m.canImport).map(m => (
                          <option key={m.key} value={m.key}>{m.icon} {m.label}{m.adminOnly ? ' (admin)' : ''}</option>
                        ))}
                      </select>
                    </div>

                    <div onClick={() => fileRef.current?.click()}
                      style={{ border: `2px dashed ${uploadFile ? '#16a34a' : cardBorder}`, borderRadius: 12, padding: '36px 20px', textAlign: 'center', cursor: 'pointer', background: uploadFile ? 'rgba(22,163,74,0.06)' : isGlass ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)', transition: 'all 0.2s' }}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f){setUploadFile(f);setImportPreview(null);} }}>
                      <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display:'none' }} onChange={e => { const f=e.target.files[0]; if(f){setUploadFile(f);setImportPreview(null);} }} />
                      {uploadFile ? (
                        <><div style={{ fontSize:32, marginBottom:8 }}>✅</div><div style={{ color:'#16a34a', fontWeight:700, fontSize:14 }}>{uploadFile.name}</div><div style={{ color:textSub, fontSize:12, marginTop:4 }}>{(uploadFile.size/1024).toFixed(1)} KB — clique para trocar</div></>
                      ) : (
                        <><div style={{ fontSize:38, marginBottom:8 }}>📂</div><div style={{ color:textMain, fontWeight:600, fontSize:14 }}>Arraste um arquivo CSV ou Excel</div><div style={{ color:textSub, fontSize:12, marginTop:4 }}>ou clique para selecionar</div></>
                      )}
                    </div>

                    <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:textSub }}>
                      <span>💡</span><span>Não tem o arquivo no formato correto?</span>
                      <button onClick={() => handleDownloadTemplate(importModule)} style={{ background:'none', border:'none', color:'#818cf8', cursor:'pointer', fontWeight:700, fontSize:13, padding:0, textDecoration:'underline' }}>Baixe o template aqui</button>
                    </div>

                    <button onClick={handlePreview} disabled={!uploadFile || importLoading}
                      style={{ padding:'11px 0', borderRadius:10, border:'none', cursor:!uploadFile||importLoading?'not-allowed':'pointer', fontWeight:700, fontSize:14, background:!uploadFile?(isGlass?'rgba(0,0,0,0.08)':'rgba(255,255,255,0.08)'):theme.primaryGrad, color:!uploadFile?textSub:'#fff', opacity:importLoading?0.7:1 }}>
                      {importLoading ? '⏳ Analisando...' : '🔍 Analisar arquivo'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── STEP 2: MAPEAMENTO ── */}
            {importStep === 'mapping' && importPreview && (
              <>
                {/* Preview das primeiras linhas */}
                <div style={card}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
                    <h3 style={{ color:textMain, margin:0, fontSize:15, fontWeight:600 }}>📄 Preview — {uploadFile?.name}</h3>
                    <div style={{ display:'flex', gap:8 }}>
                      <span style={{ background:'rgba(99,102,241,0.15)', color:'#818cf8', padding:'4px 10px', borderRadius:8, fontSize:12, fontWeight:600 }}>{importPreview.headers?.length || 0} colunas</span>
                      <span style={{ background:'rgba(22,163,74,0.15)', color:'#4ade80', padding:'4px 10px', borderRadius:8, fontSize:12, fontWeight:600 }}>{importPreview.preview?.length || 0} linhas (preview)</span>
                    </div>
                  </div>
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead><tr>
                        {Object.keys(importPreview.preview?.[0]||{}).filter(k=>!k.startsWith('_')).map(col => (
                          <th key={col} style={{ padding:'8px 10px', background:isGlass?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)', color:textSub, fontWeight:600, textAlign:'left', borderBottom:`1px solid ${cardBorder}`, whiteSpace:'nowrap' }}>{col}</th>
                        ))}
                        <th style={{ padding:'8px 10px', background:isGlass?'rgba(0,0,0,0.06)':'rgba(255,255,255,0.05)', color:textSub, fontWeight:600, textAlign:'left', borderBottom:`1px solid ${cardBorder}` }}>Duplicata?</th>
                      </tr></thead>
                      <tbody>{(importPreview.preview||[]).map((row,i) => (
                        <tr key={i}>
                          {Object.entries(row).filter(([k])=>!k.startsWith('_')).map(([k,v]) => (
                            <td key={k} style={{ padding:'6px 10px', color:textMain, borderBottom:`1px solid ${isGlass?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.04)'}`, whiteSpace:'nowrap', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis' }}>
                              {v !== null && v !== '' && v !== undefined ? String(v) : <span style={{ opacity:0.3 }}>—</span>}
                            </td>
                          ))}
                          <td style={{ padding:'6px 10px', borderBottom:`1px solid ${isGlass?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.04)'}` }}>
                            {row._duplicate
                              ? <span style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>⚠️ {row._duplicate_name||'Duplicata'}</span>
                              : <span style={{ background:'rgba(34,197,94,0.1)', color:'#4ade80', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>✅ Novo</span>
                            }
                          </td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>

                {/* Banner detecção automática */}
                {detectedSystem && detectedSystem.sistema !== 'generico' && (
                  <div style={{ ...card, border:'1px solid rgba(34,197,94,0.3)', background:isGlass?'rgba(34,197,94,0.1)':'rgba(34,197,94,0.06)', padding:'14px 18px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ fontSize:20 }}>🎯</span>
                      <div>
                        <div style={{ color:'#4ade80', fontWeight:700, fontSize:14 }}>
                          Sistema detectado automaticamente: <strong>
                            {detectedSystem.sistema === 'conta_azul' ? 'Conta Azul' :
                             detectedSystem.sistema === 'omie' ? 'Omie' :
                             detectedSystem.sistema === 'linx' ? 'Linx' : 'Nibo'}
                          </strong>
                        </div>
                        <div style={{ color:textSub, fontSize:12, marginTop:2 }}>
                          Confiança: {Math.round((detectedSystem.confidence||0)*100)}% · Entidade: {detectedSystem.entity}
                          {' — '}campos mapeados automaticamente, sem necessidade de ajustes.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Ação de duplicatas */}
                <div style={card}>
                  <h3 style={{ color:textMain, margin:'0 0 8px', fontSize:15, fontWeight:600 }}>🔁 Duplicatas</h3>
                  <p style={{ color:textSub, fontSize:13, margin:'0 0 14px' }}>O que fazer quando o registro já existir no sistema?</p>
                  <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                    {[
                      { v:'skip',          label:'⏭️ Ignorar',          desc:'Mantém o registro existente'    },
                      { v:'update',        label:'✏️ Atualizar',         desc:'Atualiza dados do existente'    },
                      { v:'create_anyway', label:'➕ Criar mesmo assim', desc:'Cria um registro duplicado'     },
                    ].map(opt => (
                      <div key={opt.v} onClick={() => setDupAction(opt.v)}
                        style={{ flex:1, minWidth:140, padding:'12px 14px', borderRadius:10, cursor:'pointer', border:`2px solid ${dupAction===opt.v?theme.primary:cardBorder}`, background:dupAction===opt.v?`${theme.primary}18`:'transparent', transition:'all 0.2s' }}>
                        <div style={{ fontWeight:700, fontSize:13, color:dupAction===opt.v?theme.primary:textMain, marginBottom:3 }}>{opt.label}</div>
                        <div style={{ fontSize:11, color:textSub }}>{opt.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mapeamento de colunas */}
                <div style={card}>
                  <h3 style={{ color:textMain, margin:'0 0 8px', fontSize:15, fontWeight:600 }}>🗂️ Mapeamento de Colunas</h3>
                  <p style={{ color:textSub, fontSize:13, margin:'0 0 20px' }}>
                    {selectedSystem !== 'generico'
                      ? `Mapeamento automático do ${selectedSystem === 'conta_azul' ? 'Conta Azul' : selectedSystem === 'omie' ? 'Omie' : selectedSystem === 'linx' ? 'Linx' : 'Nibo'} aplicado. Confira e ajuste se necessário.`
                      : 'Campos com ✅ foram mapeados automaticamente. Ajuste os que ficaram em branco.'}
                  </p>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:12 }}>
                    {(MODULE_FIELDS[importModule] || []).map(field => {
                      const mapped  = importMapping[field.key];
                      const isAuto  = !!mapped;
                      return (
                        <div key={field.key} style={{ background:isGlass?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.04)', borderRadius:10, padding:'12px 14px', border:`1px solid ${isAuto?'rgba(99,102,241,0.3)':cardBorder}` }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              <span style={{ color:textMain, fontWeight:600, fontSize:13 }}>{field.label}</span>
                              {field.required && <span style={{ fontSize:10, color:'#f87171', background:'rgba(239,68,68,0.15)', padding:'1px 6px', borderRadius:4 }}>obrigatório</span>}
                            </div>
                            {isAuto && <span style={{ fontSize:11, color:'#818cf8' }}>✅ auto</span>}
                          </div>
                          {field.hint && <div style={{ fontSize:11, color:textSub, marginBottom:6, opacity:0.7 }}>ex: {field.hint}</div>}
                          <select
                            value={importMapping[field.key] || ''}
                            onChange={e => setImportMapping(p => ({ ...p, [field.key]: e.target.value || undefined }))}
                            style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:`1px solid ${cardBorder}`, background:inputBg, color:textMain, fontSize:13, outline:'none' }}
                          >
                            <option value="">— não importar —</option>
                            {(importPreview.headers||[]).map(col => (
                              <option key={col} value={col}>{col}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ações */}
                <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
                  <button onClick={resetImport} style={{ padding:'11px 24px', borderRadius:10, border:`1px solid ${cardBorder}`, background:'transparent', color:textSub, cursor:'pointer', fontWeight:600, fontSize:14 }}>
                    ← Voltar
                  </button>
                  <button onClick={handleConfirmImport} disabled={importLoading}
                    style={{ padding:'11px 32px', borderRadius:10, border:'none', cursor:importLoading?'not-allowed':'pointer', fontWeight:700, fontSize:14, background:theme.primaryGrad, color:'#fff', opacity:importLoading?0.7:1, boxShadow:'0 4px 16px rgba(99,102,241,0.3)' }}>
                    {importLoading ? '⏳ Importando...' : '✅ Confirmar Importação'}
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 3: RESULTADO ── */}
            {importStep === 'result' && importResult && (
              <>
                {/* Cards resumo */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:12 }}>
                  {[
                    { label:'Criados',     value:importResult.created,          color:'#4ade80', bg:'rgba(22,163,74,0.12)',  icon:'✅' },
                    { label:'Atualizados', value:importResult.updated,          color:'#60a5fa', bg:'rgba(37,99,235,0.12)',  icon:'🔄' },
                    { label:'Ignorados',   value:importResult.skipped,          color:'#f59e0b', bg:'rgba(245,158,11,0.12)', icon:'⏭️' },
                    { label:'Erros',       value:importResult.errors?.length||0,color:'#f87171', bg:'rgba(239,68,68,0.12)', icon:'❌' },
                  ].map(s => (
                    <div key={s.label} style={{ ...card, textAlign:'center', padding:'20px 16px' }}>
                      <div style={{ fontSize:28, marginBottom:6 }}>{s.icon}</div>
                      <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:12, color:textSub, marginTop:4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Info especial (ex: equipe precisa redefinir senha) */}
                {importResult.info && (
                  <div style={{ ...card, border: '1px solid rgba(99,102,241,0.3)', background: isGlass ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.06)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 20 }}>ℹ️</span>
                      <div style={{ color: textMain, fontSize: 13, lineHeight: 1.5 }}>{importResult.info}</div>
                    </div>
                  </div>
                )}

                {/* Vendas criadas sem cliente */}
                {importResult.orders_no_client?.length > 0 && (
                  <div style={{ ...card, border:'1px solid rgba(245,158,11,0.35)', background:isGlass?'rgba(245,158,11,0.1)':'rgba(245,158,11,0.06)' }}>
                    <h4 style={{ color:'#f59e0b', margin:'0 0 12px', fontSize:14, fontWeight:700 }}>
                      ⚠️ {importResult.orders_no_client.length} venda(s) criada(s) sem cliente identificado
                    </h4>
                    <p style={{ color:textSub, fontSize:12, margin:'0 0 12px' }}>
                      Acesse <strong>Vendas</strong> e edite essas ordens para vincular o cliente correto:
                    </p>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {importResult.orders_no_client.map((o, i) => (
                        <div key={i} style={{ background:isGlass?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 14px', border:`1px solid rgba(245,158,11,0.2)`, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
                          <div>
                            <div style={{ color:textMain, fontWeight:600, fontSize:13 }}>{o.order_number}</div>
                            <div style={{ color:textSub, fontSize:12, marginTop:2 }}>{o.description} — linha {o.row}</div>
                          </div>
                          <a href="/sales" style={{ fontSize:12, color:'#f59e0b', fontWeight:600, textDecoration:'underline' }}>Ver em Vendas →</a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duplicatas notificadas */}
                {importResult.duplicates_notified?.length > 0 && (
                  <div style={{ ...card, border:'1px solid rgba(251,191,36,0.3)', background:isGlass?'rgba(251,191,36,0.1)':'rgba(251,191,36,0.06)' }}>
                    <h4 style={{ color:'#fbbf24', margin:'0 0 12px', fontSize:14, fontWeight:700 }}>⚠️ Registros Atualizados com Dados Conflitantes</h4>
                    <p style={{ color:textSub, fontSize:12, margin:'0 0 12px' }}>Estes registros já existiam com dados diferentes. Verifique se a atualização está correta:</p>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {importResult.duplicates_notified.map((d, i) => (
                        <div key={i} style={{ background:isGlass?'rgba(255,255,255,0.2)':'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 14px', border:`1px solid rgba(251,191,36,0.2)` }}>
                          <div style={{ color:textMain, fontWeight:600, fontSize:13 }}>{d.name}{d.sku ? ` (SKU: ${d.sku})` : ''}</div>
                          <div style={{ color:textSub, fontSize:12, marginTop:2 }}>Linha {d.row} — {d.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Relatório de erros */}
                {importResult.errors?.length > 0 && (
                  <div style={{ ...card, border:'1px solid rgba(239,68,68,0.3)', background:isGlass?'rgba(239,68,68,0.08)':'rgba(239,68,68,0.05)' }}>
                    <h4 style={{ color:'#f87171', margin:'0 0 12px', fontSize:14, fontWeight:700 }}>❌ Erros encontrados ({importResult.errors.length})</h4>
                    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      {importResult.errors.map((err, i) => {
                        const msg = typeof err === 'string' ? err : `Linha ${err.row}: ${err.field ? err.field + ' — ' : ''}${err.message || JSON.stringify(err)}`;
                        return (
                          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'9px 12px', background:'rgba(239,68,68,0.08)', borderRadius:8, border:'1px solid rgba(239,68,68,0.2)' }}>
                            <span style={{ color:'#f87171', fontWeight:700, fontSize:12, flexShrink:0 }}>#{i+1}</span>
                            <span style={{ color:textMain, fontSize:12 }}>{msg}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Ações finais */}
                <div style={{ display:'flex', gap:12 }}>
                  <button onClick={resetImport} style={{ padding:'11px 28px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:14, background:theme.primaryGrad, color:'#fff', boxShadow:'0 4px 16px rgba(99,102,241,0.3)' }}>
                    ⬆️ Nova Importação
                  </button>
                  <button onClick={() => { setActiveTab('export'); }} style={{ padding:'11px 24px', borderRadius:10, border:`1px solid ${cardBorder}`, background:'transparent', color:textSub, cursor:'pointer', fontWeight:600, fontSize:14 }}>
                    ⬇️ Ir para Exportação
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* MODAL RELATÓRIO DE PRODUTOS */}
      {reportModal && (
        <ProductReportModal
          onClose={() => setReportModal(false)}
          theme={theme}
          isGlass={isGlass}
        />
      )}
    </PageLayout>
  );
}