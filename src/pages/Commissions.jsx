import { useState, useEffect, useRef } from 'react';
import PageLayout from '../components/layout/PageLayout';
import Sidebar from '../components/layout/Sidebar';
import { useTheme } from '../contexts/ThemeContext';

const BASE_URL = 'https://api.svfinance.com.br/api';

const TYPE_LABELS = {
  percent_total:  { label: '% do Total',  icon: '📊', desc: 'Percentual sobre valor total da venda' },
  percent_profit: { label: '% do Lucro',  icon: '💹', desc: 'Percentual sobre lucro estimado'       },
  fixed:          { label: 'Valor Fixo',  icon: '🔒', desc: 'Valor fixo por venda concluída'        },
};

const fmt = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'R$ 0,00';
const fmtPct = (v) => `${v?.toFixed(1) ?? 0}%`;

export default function Commissions() {
  const { theme, themeId } = useTheme();
  const isGlass   = themeId === 'glass' || themeId === 'gray';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = localStorage.getItem('role') || 'viewer';
  const isAdmin = role === 'admin';

  // ── States ──
  const [rules,      setRules]      = useState([]);
  const [report,     setReport]     = useState(null);
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [repLoading, setRepLoading] = useState(false);
  const [toast,      setToast]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('report'); // report | rules
  const [detailSeller, setDetailSeller] = useState(null);

  // Filtros do relatório
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [filterSeller, setFilterSeller] = useState('');

  // Form de regra
  const [ruleForm, setRuleForm] = useState({ seller_id:'', type:'percent_total', value:'' });
  const [editRule, setEditRule] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const token = () => localStorage.getItem('token');

  // ── Cores do tema ──
  const cardBg     = isGlass ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.05)';
  const cardBorder = isGlass ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.1)';
  const inputBg    = isGlass ? 'rgba(255,255,255,0.5)'  : 'rgba(255,255,255,0.07)';
  const textMain   = theme.textPrimary;
  const textSub    = theme.textSecondary || theme.textMuted;
  const primary    = theme.primary || '#6366f1';
  const primaryGrad= theme.primaryGrad || 'linear-gradient(135deg,#6366f1,#8b5cf6)';

  const card = {
    background: cardBg,
    border: `1px solid ${cardBorder}`,
    borderRadius: 16,
    backdropFilter: isGlass ? 'blur(16px)' : undefined,
    WebkitBackdropFilter: isGlass ? 'blur(16px)' : undefined,
  };

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch ──
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rRes, uRes] = await Promise.all([
        fetch(`${BASE_URL}/commissions/rules`, { headers: { Authorization: `Bearer ${token()}` } }),
        fetch(`${BASE_URL}/company/users`,     { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      if (rRes.ok) setRules(await rRes.json());
      if (uRes.ok) setUsers(await uRes.json());
    } catch {}
    setLoading(false);
  };

  const fetchReport = async () => {
    setRepLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFrom)     params.append('date_from', dateFrom);
      if (dateTo)       params.append('date_to',   dateTo);
      if (filterSeller) params.append('seller_id', filterSeller);
      const res = await fetch(`${BASE_URL}/commissions/report?${params}`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      if (res.ok) setReport(await res.json());
    } catch {}
    setRepLoading(false);
  };

  useEffect(() => { fetchAll(); fetchReport(); }, []);

  // ── CRUD Regras ──
  const handleSaveRule = async () => {
    if (!ruleForm.seller_id || !ruleForm.value) return showToast('Preencha todos os campos', 'error');
    const url    = editRule ? `${BASE_URL}/commissions/rules/${editRule.id}` : `${BASE_URL}/commissions/rules`;
    const method = editRule ? 'PUT' : 'POST';
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ ...ruleForm, value: parseFloat(ruleForm.value) }),
    });
    if (res.ok) {
      showToast(editRule ? 'Regra atualizada!' : 'Regra criada!');
      setShowForm(false); setEditRule(null);
      setRuleForm({ seller_id:'', type:'percent_total', value:'' });
      fetchAll(); fetchReport();
    } else showToast('Erro ao salvar', 'error');
  };

  const handleDeleteRule = async (id) => {
    if (!confirm('Remover esta regra de comissão?')) return;
    const res = await fetch(`${BASE_URL}/commissions/rules/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token()}` }
    });
    if (res.ok) { showToast('Regra removida'); fetchAll(); fetchReport(); }
    else showToast('Erro ao remover', 'error');
  };

  const openEditRule = (rule) => {
    setEditRule(rule);
    setRuleForm({ seller_id: rule.seller_id, type: rule.type, value: rule.value });
    setShowForm(true);
  };

  // ── Helpers de UI ──
  const tabBtn = (active) => ({
    padding: '9px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontWeight: 600, fontSize: 14, transition: 'all 0.2s',
    background: active ? primaryGrad : 'transparent',
    color: active ? '#fff' : textSub,
    boxShadow: active ? '0 4px 12px rgba(0,0,0,0.2)' : 'none',
  });

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1px solid ${cardBorder}`, background: inputBg,
    color: textMain, fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  const sellerName = (id) => {
    const u = users.find(u => u.id === id);
    return u ? (u.name || u.email) : `Vendedor #${id}`;
  };

  const avatarColor = (name='') => {
    const colors = ['#6366f1','#8b5cf6','#ec4899','#14b8a6','#f59e0b','#22c55e','#3b82f6'];
    return colors[name.charCodeAt(0) % colors.length];
  };

  // ── Ordenar vendedores por comissão para ranking ──
  const ranked = report?.by_seller || [];

  return (
    <PageLayout>
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}/>

      <div style={{ flex:1, padding:'32px 36px', overflowY:'auto', position:'relative', zIndex:1 }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ margin:0, fontSize:'1.75rem', fontWeight:700, color:textMain }}>💰 Comissões</h1>
            <p style={{ margin:'6px 0 0', color:textSub, fontSize:14 }}>
              Gestão de comissões por vendedor — regras, relatórios e rankings
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => { setShowForm(true); setEditRule(null); setRuleForm({ seller_id:'', type:'percent_total', value:'' }); }}
              style={{ padding:'10px 22px', borderRadius:12, border:'none', cursor:'pointer',
                background:primaryGrad, color:'#fff', fontWeight:700, fontSize:14,
                boxShadow:`0 4px 16px ${primary}44` }}>
              + Nova Regra
            </button>
          )}
        </div>

        {/* KPI Cards topo */}
        {report && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:28 }}>
            {[
              { icon:'🛒', label:'Vendas no período', value:report.total_orders,          color:'#60a5fa', raw:true },
              { icon:'💳', label:'Faturamento total',  value:fmt(report.total_revenue),    color:'#4ade80' },
              { icon:'💰', label:'Total comissões',    value:fmt(report.total_commission),  color:'#f59e0b' },
              { icon:'👥', label:'Vendedores ativos',  value:ranked.length,                color:'#c084fc', raw:true },
            ].map(k => (
              <div key={k.label} style={{ ...card, padding:'20px 18px' }}>
                <div style={{ fontSize:'1.6rem', marginBottom:8 }}>{k.icon}</div>
                <div style={{ fontSize: k.raw?'1.8rem':'1.4rem', fontWeight:800, color:k.color, marginBottom:4 }}>{k.value}</div>
                <div style={{ fontSize:12, color:textSub, textTransform:'uppercase', letterSpacing:'0.5px' }}>{k.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', gap:6, padding:6, borderRadius:14, background:cardBg,
          border:`1px solid ${cardBorder}`, marginBottom:24, width:'fit-content' }}>
          <button style={tabBtn(activeTab==='report')} onClick={()=>setActiveTab('report')}>📊 Relatório</button>
          <button style={tabBtn(activeTab==='rules')}  onClick={()=>setActiveTab('rules')}>⚙️ Regras</button>
        </div>

        {/* ══ ABA RELATÓRIO ══ */}
        {activeTab === 'report' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* Filtros */}
            <div style={{ ...card, padding:'18px 20px' }}>
              <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'flex-end' }}>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ fontSize:11, color:textSub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>De</label>
                  <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={inp}/>
                </div>
                <div style={{ flex:1, minWidth:140 }}>
                  <label style={{ fontSize:11, color:textSub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>Até</label>
                  <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={inp}/>
                </div>
                <div style={{ flex:1, minWidth:160 }}>
                  <label style={{ fontSize:11, color:textSub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>Vendedor</label>
                  <select value={filterSeller} onChange={e=>setFilterSeller(e.target.value)} style={inp}>
                    <option value="">Todos</option>
                    {users.filter(u=>u.role==='seller'||u.role==='admin').map(u=>(
                      <option key={u.id} value={u.id}>{u.name||u.email}</option>
                    ))}
                  </select>
                </div>
                <button onClick={fetchReport} disabled={repLoading}
                  style={{ padding:'10px 22px', borderRadius:10, border:'none', cursor:'pointer',
                    background:primaryGrad, color:'#fff', fontWeight:700, fontSize:14,
                    opacity:repLoading?0.7:1, flexShrink:0 }}>
                  {repLoading ? '⏳' : '🔍 Filtrar'}
                </button>
              </div>
            </div>

            {/* Ranking de vendedores */}
            {ranked.length > 0 && (
              <div style={{ ...card, padding:'20px 22px' }}>
                <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:textMain }}>🏆 Ranking de Vendedores</h3>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {ranked.map((s, i) => {
                    const maxComm = ranked[0]?.total_commission || 1;
                    const pct = (s.total_commission / maxComm) * 100;
                    const medals = ['🥇','🥈','🥉'];
                    const ac = avatarColor(s.seller_name);
                    return (
                      <div key={s.seller_id}
                        onClick={() => setDetailSeller(detailSeller?.seller_id===s.seller_id ? null : s)}
                        style={{ padding:'14px 16px', borderRadius:12, cursor:'pointer',
                          background: detailSeller?.seller_id===s.seller_id ? `${primary}18` : isGlass?'rgba(255,255,255,0.15)':'rgba(255,255,255,0.04)',
                          border: `1px solid ${detailSeller?.seller_id===s.seller_id ? primary : cardBorder}`,
                          transition:'all 0.2s' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:10 }}>
                          <div style={{ fontSize:20, flexShrink:0 }}>{medals[i] || `#${i+1}`}</div>
                          <div style={{ width:36, height:36, borderRadius:'50%', background:ac,
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontWeight:700, fontSize:14, color:'#fff', flexShrink:0 }}>
                            {s.seller_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontWeight:700, color:textMain, fontSize:14 }}>{s.seller_name}</div>
                            <div style={{ fontSize:12, color:textSub }}>
                              {s.total_sales} venda{s.total_sales!==1?'s':''} · {
                                s.commission_type==='percent_total'  ? `${s.commission_rate}% do total` :
                                s.commission_type==='percent_profit' ? `${s.commission_rate}% do lucro` :
                                s.commission_type==='fixed'          ? `${fmt(s.commission_rate)} fixo/venda` :
                                'Sem regra'
                              }
                            </div>
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontSize:18, fontWeight:800, color:'#4ade80' }}>{fmt(s.total_commission)}</div>
                            <div style={{ fontSize:11, color:textSub }}>em comissão</div>
                          </div>
                          <div style={{ fontSize:12, color:textSub, flexShrink:0 }}>{detailSeller?.seller_id===s.seller_id?'▲':'▼'}</div>
                        </div>

                        {/* Barra de progresso */}
                        <div style={{ height:5, borderRadius:5, background:'rgba(255,255,255,0.08)', overflow:'hidden' }}>
                          <div style={{ height:'100%', borderRadius:5, width:`${pct}%`,
                            background:i===0?'linear-gradient(90deg,#f59e0b,#fbbf24)':
                                       i===1?'linear-gradient(90deg,#94a3b8,#cbd5e1)':
                                       i===2?'linear-gradient(90deg,#b45309,#d97706)':primaryGrad,
                            transition:'width 0.8s ease' }}/>
                        </div>

                        {/* Detalhe expansível */}
                        {detailSeller?.seller_id === s.seller_id && (
                          <div style={{ marginTop:14, paddingTop:14, borderTop:`1px solid ${cardBorder}` }}>
                            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12 }}>
                              {[
                                { label:'Faturamento', value:fmt(s.total_revenue) },
                                { label:'Comissão',    value:fmt(s.total_commission) },
                                { label:'Ticket Médio',value:fmt(s.total_revenue/(s.total_sales||1)) },
                              ].map(m=>(
                                <div key={m.label} style={{ flex:1, minWidth:100, ...card, padding:'10px 14px' }}>
                                  <div style={{ fontSize:15, fontWeight:700, color:textMain }}>{m.value}</div>
                                  <div style={{ fontSize:11, color:textSub }}>{m.label}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ fontSize:12, color:textSub }}>
                              Pedidos: {s.orders?.join(', ') || '—'}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tabela de vendas detalhada */}
            {report?.sales?.length > 0 && (
              <div style={{ ...card, padding:'20px 22px' }}>
                <h3 style={{ margin:'0 0 16px', fontSize:15, fontWeight:700, color:textMain }}>📋 Detalhamento por Venda</h3>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                    <thead>
                      <tr>
                        {['Pedido','Vendedor','Data','Total','Tipo Comissão','Comissão'].map(h=>(
                          <th key={h} style={{ padding:'10px 12px', textAlign:'left', color:textSub,
                            fontWeight:700, fontSize:11, textTransform:'uppercase', letterSpacing:'0.5px',
                            borderBottom:`1px solid ${cardBorder}`, whiteSpace:'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {report.sales.map((s,i)=>(
                        <tr key={s.order_id} style={{ borderBottom:`1px solid ${isGlass?'rgba(0,0,0,0.04)':'rgba(255,255,255,0.04)'}` }}>
                          <td style={{ padding:'10px 12px', color:primary, fontWeight:600 }}>{s.order_number}</td>
                          <td style={{ padding:'10px 12px', color:textMain }}>{s.seller_name}</td>
                          <td style={{ padding:'10px 12px', color:textSub, whiteSpace:'nowrap' }}>{s.date?.substring(0,10) || '—'}</td>
                          <td style={{ padding:'10px 12px', color:textMain, fontWeight:600 }}>{fmt(s.total)}</td>
                          <td style={{ padding:'10px 12px' }}>
                            {s.commission_type ? (
                              <span style={{ background:`${primary}18`, color:primary, padding:'3px 10px',
                                borderRadius:20, fontSize:11, fontWeight:600 }}>
                                {TYPE_LABELS[s.commission_type]?.label || s.commission_type}
                                {s.commission_rate && ` · ${s.commission_type==='fixed'?fmt(s.commission_rate):fmtPct(s.commission_rate)}`}
                              </span>
                            ) : <span style={{ color:textSub, fontSize:12 }}>Sem regra</span>}
                          </td>
                          <td style={{ padding:'10px 12px', color:'#4ade80', fontWeight:700 }}>{fmt(s.commission_value)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ borderTop:`2px solid ${cardBorder}` }}>
                        <td colSpan={3} style={{ padding:'12px', color:textSub, fontWeight:700, fontSize:13 }}>TOTAL</td>
                        <td style={{ padding:'12px', color:textMain, fontWeight:800 }}>{fmt(report.total_revenue)}</td>
                        <td/>
                        <td style={{ padding:'12px', color:'#4ade80', fontWeight:800 }}>{fmt(report.total_commission)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {report?.sales?.length === 0 && !repLoading && (
              <div style={{ ...card, padding:'60px 20px', textAlign:'center' }}>
                <div style={{ fontSize:'2.5rem', marginBottom:12 }}>📭</div>
                <div style={{ color:textMain, fontWeight:600, marginBottom:6 }}>Nenhuma venda no período</div>
                <div style={{ color:textSub, fontSize:13 }}>Ajuste os filtros ou conclua vendas para ver o relatório</div>
              </div>
            )}
          </div>
        )}

        {/* ══ ABA REGRAS ══ */}
        {activeTab === 'rules' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {!isAdmin && (
              <div style={{ ...card, padding:'20px', textAlign:'center', color:textSub }}>
                Apenas administradores podem gerenciar regras de comissão.
              </div>
            )}

            {/* Formulário */}
            {isAdmin && showForm && (
              <div style={{ ...card, padding:'22px 24px' }}>
                <h3 style={{ margin:'0 0 18px', fontSize:15, fontWeight:700, color:textMain }}>
                  {editRule ? '✏️ Editar Regra' : '➕ Nova Regra de Comissão'}
                </h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
                  <div>
                    <label style={{ fontSize:11, color:textSub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>Vendedor</label>
                    <select value={ruleForm.seller_id} onChange={e=>setRuleForm(p=>({...p,seller_id:e.target.value}))} style={inp}>
                      <option value="">Selecione...</option>
                      {users.filter(u=>u.role==='seller'||u.role==='admin').map(u=>(
                        <option key={u.id} value={u.id}>{u.name||u.email}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:textSub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>Tipo</label>
                    <select value={ruleForm.type} onChange={e=>setRuleForm(p=>({...p,type:e.target.value}))} style={inp}>
                      {Object.entries(TYPE_LABELS).map(([k,v])=>(
                        <option key={k} value={k}>{v.icon} {v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize:11, color:textSub, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:6 }}>
                      {ruleForm.type==='fixed' ? 'Valor (R$)' : 'Percentual (%)'}
                    </label>
                    <input type="number" min="0" step="0.1" placeholder={ruleForm.type==='fixed'?'Ex: 50.00':'Ex: 5.0'}
                      value={ruleForm.value} onChange={e=>setRuleForm(p=>({...p,value:e.target.value}))} style={inp}/>
                  </div>
                </div>

                {ruleForm.type && (
                  <div style={{ marginTop:12, padding:'10px 14px', borderRadius:10,
                    background:`${primary}12`, border:`1px solid ${primary}30`,
                    fontSize:12, color:textSub }}>
                    {TYPE_LABELS[ruleForm.type]?.desc}
                    {ruleForm.value && ruleForm.type !== 'fixed' && ` — ${ruleForm.value}% sobre cada venda`}
                    {ruleForm.value && ruleForm.type === 'fixed' && ` — ${fmt(parseFloat(ruleForm.value))} por venda concluída`}
                  </div>
                )}

                <div style={{ display:'flex', gap:10, marginTop:18, justifyContent:'flex-end' }}>
                  <button onClick={()=>{setShowForm(false);setEditRule(null);}}
                    style={{ padding:'9px 20px', borderRadius:10, border:`1px solid ${cardBorder}`,
                      background:'transparent', color:textSub, cursor:'pointer', fontWeight:600, fontSize:14 }}>
                    Cancelar
                  </button>
                  <button onClick={handleSaveRule}
                    style={{ padding:'9px 24px', borderRadius:10, border:'none', cursor:'pointer',
                      background:primaryGrad, color:'#fff', fontWeight:700, fontSize:14,
                      boxShadow:`0 4px 14px ${primary}44` }}>
                    {editRule ? 'Salvar alterações' : 'Criar regra'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de regras */}
            {rules.length === 0 && !loading && (
              <div style={{ ...card, padding:'50px 20px', textAlign:'center' }}>
                <div style={{ fontSize:'2rem', marginBottom:10 }}>⚙️</div>
                <div style={{ color:textMain, fontWeight:600, marginBottom:6 }}>Nenhuma regra configurada</div>
                <div style={{ color:textSub, fontSize:13 }}>
                  {isAdmin ? 'Clique em "+ Nova Regra" para começar' : 'Peça ao administrador para configurar as regras'}
                </div>
              </div>
            )}

            {rules.map(rule => {
              const ac = avatarColor(rule.seller_name);
              return (
                <div key={rule.id} style={{ ...card, padding:'18px 20px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                    <div style={{ width:42, height:42, borderRadius:'50%', background:ac,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight:700, fontSize:16, color:'#fff', flexShrink:0 }}>
                      {rule.seller_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, color:textMain, fontSize:15 }}>{rule.seller_name}</div>
                      <div style={{ fontSize:12, color:textSub, marginTop:2 }}>
                        {TYPE_LABELS[rule.type]?.icon} {TYPE_LABELS[rule.type]?.label}
                        {' — '}
                        <strong style={{ color:textMain }}>
                          {rule.type==='fixed' ? fmt(rule.value) : fmtPct(rule.value)}
                        </strong>
                        {' por venda'}
                      </div>
                    </div>
                    <span style={{ padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700,
                      background:rule.active?'rgba(34,197,94,0.15)':'rgba(255,255,255,0.08)',
                      color:rule.active?'#4ade80':textSub }}>
                      {rule.active ? '✅ Ativa' : '⏸ Inativa'}
                    </span>
                    {isAdmin && (
                      <div style={{ display:'flex', gap:8 }}>
                        <button onClick={()=>openEditRule(rule)}
                          style={{ padding:'7px 14px', borderRadius:8, border:`1px solid ${cardBorder}`,
                            background:'transparent', color:primary, cursor:'pointer', fontWeight:600, fontSize:13 }}>
                          ✏️ Editar
                        </button>
                        <button onClick={()=>handleDeleteRule(rule.id)}
                          style={{ padding:'7px 14px', borderRadius:8, border:'1px solid rgba(239,68,68,0.3)',
                            background:'rgba(239,68,68,0.1)', color:'#f87171', cursor:'pointer', fontWeight:600, fontSize:13 }}>
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position:'fixed', bottom:24, right:24, color:'#fff',
          padding:'12px 22px', borderRadius:12, fontWeight:600, fontSize:14, zIndex:9999,
          boxShadow:'0 8px 30px rgba(0,0,0,0.4)',
          background:toast.type==='error'?'#ef4444':primaryGrad }}>
          {toast.msg}
        </div>
      )}
    </PageLayout>
  );
}
