# SV Finance Control — Frontend

![SV Finance](public/logo.gif)

> Sistema SaaS de controle financeiro para pessoas físicas e empresas.  
> Desenvolvido com React + Vite, hospedado na Vercel.

---

## 🚀 Stack

- **React 18** + Vite
- **React Router DOM** — navegação SPA
- **Recharts** — gráficos e analytics
- **Context API** — tema e autenticação
- **CSS-in-JS** (inline styles) — sem dependência de UI libs
- **Vercel** — deploy automático via GitHub

---

## 🌐 URLs

| Ambiente   | URL                                                      |
|------------|----------------------------------------------------------|
| Produção   | https://finance-control-web-five.vercel.app              |
| Domínio    | https://svfinance.com.br *(em configuração)*             |
| API        | https://finance-control-api-production.up.railway.app/api|

---

## 📁 Estrutura do Projeto
```
finance-control-web/
├── public/
│   └── logo.gif                  # Favicon e ícone mobile
├── src/
│   ├── assets/                   # Imagens, GIFs, SVGs
│   ├── components/
│   │   ├── layout/
│   │   │   ├── PageLayout.jsx    # Layout base + sino de notificações
│   │   │   └── Sidebar.jsx       # Menu lateral (PF e PJ)
│   │   └── ProtectedRoute.jsx    # Proteção de rotas por role
│   ├── contexts/
│   │   └── ThemeContext.jsx      # Tema global (4 opções)
│   ├── pages/
│   │   ├── Login.jsx             # Auth: login, cadastro, verificação, reset
│   │   ├── Dashboard.jsx         # Dashboard PF e PJ
│   │   ├── Transactions.jsx      # Transações (PF e PJ)
│   │   ├── Bills.jsx             # Contas a pagar/receber
│   │   ├── Goals.jsx             # Metas financeiras (PF)
│   │   ├── Analytics.jsx         # Gráficos e relatórios
│   │   ├── Products.jsx          # Produtos e serviços (PJ)
│   │   ├── Clients.jsx           # Clientes (PJ)
│   │   ├── Quotes.jsx            # Orçamentos com PDF (PJ)
│   │   ├── Sales.jsx             # Vendas / Pedidos / OS (PJ)
│   │   ├── Team.jsx              # Equipe e roles (PJ admin)
│   │   └── Settings.jsx          # Temas visuais
│   ├── services/
│   │   └── api.js                # Funções de comunicação com a API
│   ├── themes/
│   │   └── themes.js             # 4 temas: blue, glass, aurora, gray
│   ├── App.jsx                   # Rotas principais
│   └── main.jsx                  # Entry point
├── index.html
├── vite.config.js
└── package.json
```
---

## 🎨 Temas Disponíveis

| Tema    | Descrição                        |
|---------|----------------------------------|
| Blue    | Escuro com tons de azul (padrão) |
| Glass   | Claro com glassmorphism          |
| Aurora  | Escuro com gradientes vibrantes  |
| Gray    | Escuro neutro cinza/prata        |

---

## 👥 Tipos de Conta

### Pessoa Física (PF)
Dashboard · Transações · Contas · Analytics · Metas 🎯 · Temas

### Empresa (PJ)
Dashboard · Clientes · Transações · Contas · Analytics · Produtos · Orçamentos · Vendas · Equipe · Temas

### Roles (PJ)
| Role      | Permissões                                      |
|-----------|-------------------------------------------------|
| admin     | Acesso total                                    |
| financial | Transações, Contas, Analytics                   |
| stock     | Produtos e Estoque                              |
| seller    | Vendas e Orçamentos (próprias vendas)           |
| viewer    | Somente leitura                                 |

---

## ⚙️ Variáveis de Ambiente

Cria um arquivo `.env` na raiz:

```env
VITE_API_URL=https://finance-control-api-production.up.railway.app/api
```

---

## 🛠️ Rodando Localmente

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build para produção
npm run build
```

Acesse: `http://localhost:5173`

---

## 🚀 Deploy

O deploy é automático via **GitHub + Vercel**.  
Qualquer push na branch `main` dispara um novo deploy.

---

## 📦 Funcionalidades Principais

- ✅ Autenticação com verificação de email (Resend)
- ✅ Recuperação de senha por email
- ✅ Multi-tenant (empresas isoladas)
- ✅ Dashboard financeiro com comparativos
- ✅ Transações e contas recorrentes
- ✅ Metas financeiras com progresso visual
- ✅ Orçamentos com geração de PDF (2 temas)
- ✅ Vendas com Pedido (PED) e Ordem de Serviço (OS)
- ✅ Controle de estoque com movimentações
- ✅ SKU de produtos
- ✅ Analytics com 7 tipos de gráficos
- ✅ Sistema de notificações globais 🔔
- ✅ 4 temas visuais personalizáveis
- ✅ Responsivo (mobile e desktop)

---

## 👨‍💻 Desenvolvido por

**Guilherme Salvatini**  
[github.com/Salvatini95](https://github.com/Salvatini95)