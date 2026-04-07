# 💻 SV Finance Control — Web

Interface web do sistema de gestão financeira empresarial desenvolvido em React + Vite.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript)
![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?logo=vite)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)

> 🔗 Backend: [controle_financeiro](https://github.com/Salvatini95/controle_financeiro)

---

## ✨ Funcionalidades

- 🔐 Login e cadastro de empresa com animação de números financeiros
- 🏢 Multi-tenant — cada empresa tem seus próprios dados isolados
- 👥 Gestão de equipe com roles (Admin, Financeiro, Vendedor, Estoque, Visualizador)
- 🔒 Sidebar e rotas protegidas por role de usuário
- 📊 Dashboard financeiro com gráficos de saldo, entradas e saídas
- 📋 Transações com filtros por origem, tipo e mês
- 📄 Contas a pagar e receber
- 📈 Analytics avançado
- 🧾 Orçamentos com impressão em PDF (tema escuro e claro)
- 🛒 Fluxo completo: Orçamento → Aprovação → Venda → Conclusão
- 📦 Produtos e serviços com controle de estoque e estoque inicial
- 👤 Clientes com histórico de pedidos
- 🎨 4 temas visuais: Azul/Roxo, Glass e Gelo, Aurora Glass, Cinza/Prata
- 📱 Responsivo — mobile e desktop

---

## 🛠️ Stack

| Tecnologia | Uso |
|---|---|
| React 18 | Interface |
| React Router DOM | Navegação e rotas protegidas |
| Vite | Bundler e servidor de desenvolvimento |
| Recharts | Gráficos interativos |
| Context API | Gerenciamento de temas |
| JWT (localStorage) | Autenticação |

---

## 📁 Estrutura
'''
src/
├── assets/
├── components/
│   ├── layout/
│   │   ├── PageLayout.jsx
│   │   └── Sidebar.jsx
│   └── ProtectedRoute.jsx
├── contexts/
│   └── ThemeContext.jsx
├── themes/
│   └── themes.js
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Transactions.jsx
│   ├── Bills.jsx
│   ├── Analytics.jsx
│   ├── Products.jsx
│   ├── Quotes.jsx
│   ├── Sales.jsx
│   ├── Clients.jsx
│   ├── Team.jsx
│   └── Settings.jsx
└── services/
└── api.js
'''
---

## 🚀 Como rodar localmente

### Pré-requisitos
- Node.js 18+
- Backend rodando

### Instalação
git clone https://github.com/Salvatini95/finance-control-web.git
cd finance-control-web
npm install
npm run dev

Acesse em: http://localhost:5173

---

## 🔒 Autenticação e Permissões

- Login com JWT — token salvo no localStorage com expiração de 8h
- Rotas protegidas por ProtectedRoute com suporte a roles
- Sidebar filtra itens visíveis conforme o role do usuário

| Role | Acesso |
|---|---|
| Admin | Tudo |
| Financeiro | Transações, Contas, Analytics |
| Vendedor | Clientes, Orçamentos, Vendas, Produtos |
| Estoque | Produtos e movimentações |
| Visualizador | Leitura geral |

---

## 🗺️ Próximos passos

- [ ] Dashboard personalizado por role
- [ ] Analytics por vendedor
- [ ] Relatórios em PDF
- [ ] Deploy em produção (Vercel)

---

## 👨‍💻 Autor

Desenvolvido por **Guilherme Salvatini**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-blue?logo=linkedin)](https://www.linkedin.com/in/guilherme-salvatini-623326361/)
[![GitHub](https://img.shields.io/badge/GitHub-black?logo=github)](https://github.com/Salvatini95)  