# 📋 Estado do Projeto — Mockup App Base
> Salvo em: 24/02/2026

---

## 🔐 Logins de Teste
| Papel | E-mail | Senha |
|-------|--------|-------|
| **Master** | eduardodominikus@hotmail.com | 1234 |
| **Administradora** | administradora@exemplo.com | 1234 |
| **Síndico** | sindico@exemplo.com | 1234 |
| **Funcionário** | funcionario@exemplo.com | 1234 |
| **Morador** | morador@exemplo.com | 1234 |

---

## ✅ O que já está pronto

### Infraestrutura
- [x] React 19 + Vite 6 + Tailwind CSS 4 + TypeScript (frontend :5173)
- [x] Express 4 + better-sqlite3 + bcryptjs + JWT (backend :3001)
- [x] Proxy Vite `/api` → `localhost:3001`
- [x] Dev runner: `npm run dev` (concurrently: tsx watch + vite)
- [x] Seed script: `node seed-full.cjs`

### Autenticação & RBAC
- [x] JWT em httpOnly cookie (`session_token`, 7 dias)
- [x] Todos usam PIN de 4 dígitos como senha
- [x] Hierarquia: master(100) > administradora(80) > sindico(60) > funcionario(40) > morador(20)
- [x] Middleware: `authenticate`, `authorize(...roles)`, `condominioScope`, `moradorSelfScope`
- [x] Funções frontend: `hasMinRole`, `canEdit`, `canDelete`, `getRoleLabel`

### Páginas Frontend
- [x] **Login** — e-mail + PIN 4 dígitos
- [x] **Register Condomínio** — CNPJ (BrasilAPI) + dados + criação de conta sindico
- [x] **Register Morador** — busca condomínio + cadastro
- [x] **Dashboard** — grid de ícones filtrado por role, badge de role no header
- [x] **Cadastros** — 5 itens filtrados por role:
  - Administradoras (master)
  - Síndicos (administradora+)
  - Funcionários (sindico+)
  - Blocos (sindico+)
  - Moradores (sindico+)

### Cadastro de Administradoras (`/cadastros/administradoras`)
- [x] Criar (POST) — nome, email, whatsapp, PIN
- [x] Listar — card com ícone amber
- [x] Editar (PUT) — lápis abre form preenchido, senha opcional
- [x] Excluir (DELETE) — confirm + desvincula condominios

### Cadastro de Síndicos (`/cadastros/sindicos`)
- [x] Criar (POST) — nome, email, whatsapp, condomínio (select), PIN
- [x] Listar — card com ícone sky, mostra condomínio
- [x] Editar (PUT) — lápis abre form, senha opcional
- [x] Excluir (DELETE)

### Cadastro de Funcionários (`/cadastros/funcionarios`)
- [x] Criar (POST) — nome, sobrenome, cargo (select), login auto-gerado, PIN
- [x] Listar — card com ícone emerald, mostra cargo + @login
- [x] Editar (PUT) — lápis abre form, senha opcional
- [x] Excluir (DELETE)

### Cadastro de Blocos (`/cadastros/blocos`)
- [x] Criar automático (quantidade) ou personalizado (1 por 1)
- [x] Listar — card com ícone violet
- [x] Editar (PUT) — inline rename com ✓/✗
- [x] Excluir (DELETE)

### Cadastro de Moradores (`/cadastros/moradores`)
- [x] 4 métodos de cadastro: Manual, Via Link, Via QR Code, Cadastro em Lote (planilha)
- [x] Listar existentes abaixo dos métodos
- [x] Editar (PUT) — form inline com todos os campos, senha opcional
- [x] Excluir (DELETE)
- [x] **Manual** — form completo (nome, bloco, unidade, perfil, whatsapp, email, PIN)
- [x] **Via Link** — gera link curto com copy/share
- [x] **Via QR Code** — gera QR com print/PDF
- [x] **Cadastro em Lote** — download template CSV + upload + preview + import

---

## 🗂️ Estrutura de Arquivos Relevante

```
Mockup App Base/
├── src/
│   ├── App.tsx                           # Rotas (ProtectedRoute/PublicRoute)
│   ├── hooks/useAuth.tsx                 # AuthProvider + role utilities
│   └── pages/
│       ├── Login.tsx
│       ├── SearchCondominio.tsx
│       ├── RegisterMorador.tsx
│       ├── RegisterCondominio.tsx
│       ├── Dashboard.tsx
│       ├── Cadastros.tsx                 # Grid de 5 itens filtrados por role
│       ├── CadastroAdministradoras.tsx   # CRUD completo
│       ├── CadastroSindicos.tsx          # CRUD completo
│       ├── CadastroFuncionarios.tsx      # CRUD completo
│       ├── CadastroBlocos.tsx            # CRUD completo
│       ├── CadastroMoradores.tsx         # Seletor + lista + edit/delete
│       ├── CadastroMoradoresManual.tsx   # Form de criação
│       ├── CadastroMoradoresLink.tsx
│       ├── CadastroMoradoresQRCode.tsx
│       └── CadastroMoradoresPlanilha.tsx
├── server/
│   ├── index.ts          # Express app + all routers
│   ├── db.ts             # SQLite setup + schema (users, condominios, blocks, funcionarios)
│   ├── auth.ts           # Login/register/me endpoints
│   ├── middleware.ts      # authenticate, authorize, condominioScope, moradorSelfScope
│   ├── users.ts          # CRUD administradora + síndico (com PUT)
│   ├── funcionarios.ts   # CRUD funcionários (com PUT)
│   ├── blocos.ts         # CRUD blocos (com PUT rename + DELETE)
│   ├── moradores.ts      # CRUD moradores (com PUT) + gerar-link + importar
│   └── condominios.ts    # CRUD condominios
├── seed-full.cjs          # Seed: master + sindico + condominio + blocos
└── package.json
```

---

## 🔧 Banco de Dados (SQLite — `data.db`)

### Tabelas
- **users**: id, name, email, phone, password, role, perfil, unit, block, condominio_id, created_at
- **condominios**: id, name, cnpj, admin_user_id, administradora_id, created_at
- **blocks**: id, condominio_id, name, created_at
- **funcionarios**: id, nome, sobrenome, cargo, login, password, condominio_id, created_by, created_at

### Roles
| Role | Nível | Quem cria |
|------|-------|-----------|
| master | 100 | (pré-cadastrado) |
| administradora | 80 | master |
| sindico | 60 | master, administradora |
| funcionario | 40 | master, administradora, sindico |
| morador | 20 | master, administradora, sindico |

---

## 🔄 Para Continuar

### Como iniciar o projeto
```bash
cd "Mockup App Base"
npm run dev           # Inicia back+front
node seed-full.cjs    # Popula DB (se data.db não existir)
```
Se der erro de porta, deletar `data.db` e matar processos node:
```bash
Get-Process -Name node | Stop-Process -Force
Remove-Item data.db -Force
npm run dev
node seed-full.cjs
```

### Próximos passos sugeridos
- [ ] Módulo "Comunicação" (avisos, enquetes, chat)
- [ ] Módulo "Financeiro" (boletos, receitas/despesas)
- [ ] Módulo "Ocorrências" (abertura, acompanhamento)
- [ ] Módulo "Reservas" (áreas comuns)
- [ ] Módulo "Documentos" (regimento, atas)
- [ ] Melhorar Dashboard com cards de resumo
- [ ] Adicionar busca/filtro nas listas de cadastros
- [ ] Upload de foto de perfil
- [ ] Notificações push
