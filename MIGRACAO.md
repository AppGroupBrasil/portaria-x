# Plano de Migração — PortariaX (100 Condomínios)

> Documento de referência para quando for hora de escalar. Não executar até decisão explícita.

---

## Infraestrutura Atual

| Item | Detalhe |
|---|---|
| Servidor | Hetzner VPS (46.225.191.114) — provavelmente CX21/CX31 |
| Banco de dados | SQLite (better-sqlite3) — arquivo único `data.db` |
| Backend | Node.js 20 + Express — processo único, sem clustering |
| WebSocket | 2 servidores WS separados (porta 3002 interfone, 3003 estou chegando) — estado in-memory |
| Face Recognition | @vladmandic/face-api com TensorFlow.js WASM — server-side, bloqueia event loop |
| Leitura de Placa | Tesseract.js — client-side (sem custo no servidor) |
| IoT (eWeLink) | Token único global — suporta apenas 1 conta |
| Interfone (WebRTC) | STUN-only (Google), sem TURN — ~30-40% das chamadas falham em NAT restritivo |
| Push | Firebase FCM (gratuito) |
| WhatsApp | Apenas links wa.me/, sem API programática |
| Deploy | Docker container único, sem réplicas, sem limites de CPU/RAM |
| Custo atual | ~R$70-120/mês |

---

## Capacidade Atual Estimada

| Escala | Status |
|---|---|
| 1-10 condos | ✅ Funciona bem |
| 10-20 condos | ⚠️ Começa a ter lentidão em escritas SQLite |
| 20-50 condos | 🔴 SQLite trava, face recognition bloqueia servidor |
| 50-100 condos | 🔴 Inutilizável sem migração |

---

## O Que Quebra a 100 Condos (~20.000 usuários)

| Prioridade | Componente | Problema |
|---|---|---|
| 🔴 P0 | SQLite single-file DB | Write contention, SQLITE_BUSY, risco de corrupção |
| 🔴 P0 | Node.js processo único | Event loop bloqueia, todos os requests dão timeout |
| 🔴 P0 | Face Recognition (WASM) | 2-3 requests simultâneos travam o servidor inteiro por segundos |
| 🔴 P0 | Sem servidor TURN | ~30-40% das chamadas de vídeo falham |
| 🟡 P1 | eWeLink token único | Não suporta contas IoT por condomínio |
| 🟡 P1 | Docker container único | Sem scaling, sem failover, OOM imprevisível |
| 🟡 P1 | WS ports não expostos | Interfone e Estou Chegando podem não funcionar em produção |
| 🟢 P2 | FCM push | OK — FCM suporta a escala |
| 🟢 P2 | Leitura de placa | OK — roda client-side |
| 🟢 P2 | Camera snapshots | OK — depende de rede local do condomínio |

---

## Tabela de Funcionalidade por Escala

| Função | 10 condos | 50 condos | 100 condos |
|---|---|---|---|
| Cadastro/Visitantes/Delivery | ✅ OK | ✅ OK | ⚠️ Lento (SQLite) |
| Leitura de Placa | ✅ OK | ✅ OK | ✅ OK (client-side) |
| Biometria Facial por Câmera IP | ⚠️ Lento | 🔴 Trava | 🔴 Inutilizável |
| Biometria pelo Celular | ✅ OK | ✅ OK | ✅ OK (client-side) |
| Interfone Vídeo | ⚠️ ~70% funciona | ⚠️ ~70% funciona | 🔴 ~60% funciona |
| Portaria Virtual (IoT) | ✅ OK | 🔴 Não funciona (1 token) | 🔴 Não funciona |
| Câmeras CFTV | ✅ OK | ✅ OK | ✅ OK (direto da câmera) |
| Rondas/Protocolo | ✅ OK | ✅ OK | ⚠️ Lento (SQLite) |

---

## Plano de Migração — Opção C (Híbrida, Recomendada)

### Infraestrutura Alvo

| Componente | Solução | Custo/mês |
|---|---|---|
| Servidor app | Hetzner CCX33 (8 vCPU AMD, 32GB RAM) — Node.js cluster + Redis | €36 (~R$210) |
| PostgreSQL | Self-hosted com pgBackRest (backup automático) | R$0 (incluso) |
| Redis | Self-hosted no mesmo servidor | R$0 (incluso) |
| TURN server | Coturn self-hosted no Hetzner CX22 (2 vCPU, 4GB) | €6 (~R$35) |
| Face Recognition | Worker threads separados (4 workers dedicados) | R$0 (incluso nos 8 vCPUs) |
| Backup Hetzner | Snapshot + volume backup | €8 (~R$47) |
| **TOTAL** | | **~R$290/mês** |

### Tarefas de Desenvolvimento

| # | Tarefa | Estimativa | Detalhes |
|---|---|---|---|
| 1 | SQLite → PostgreSQL | 2-3 dias | Migrar schema, adaptar queries (better-sqlite3 → pg/drizzle), connection pool, migrar dados existentes |
| 2 | PM2 cluster + Redis | 1-2 dias | PM2 cluster mode (4-8 workers), Redis para compartilhar estado WS entre workers, pub/sub para eventos real-time |
| 3 | Face recognition em worker threads | 1-2 dias | Isolar face-api em Node.js Worker Threads dedicados com fila de processamento, não bloquear event loop principal |
| 4 | Coturn setup + WebRTC config | 1 dia | Instalar Coturn no CX22, configurar credenciais TURN estáticas ou temporárias, atualizar ICE servers no frontend |
| 5 | eWeLink multi-token | 1 dia | Armazenar credenciais eWeLink por condomínio no PostgreSQL, pool de SDK instances, refresh token por conta |
| 6 | Testes + deploy | 1-2 dias | Load testing com k6/Artillery, teste de failover, deploy blue-green |
| **TOTAL** | | **7-12 dias** | |

### Ordem de Execução (por impacto)

1. **SQLite → PostgreSQL** (resolve o gargalo #1, desbloqueia replicas)
2. **PM2 cluster + Redis** (resolve processo único, permite escalar horizontal)
3. **Face recognition workers** (resolve bloqueio do event loop)
4. **Coturn TURN server** (resolve 30-40% das chamadas de vídeo falhando)
5. **eWeLink multi-token** (habilita IoT por condomínio)
6. **Load testing + deploy**

---

## Receita vs Custo (100 condos)

| Item | Valor/mês |
|---|---|
| Receita base (100 × R$199 plano mínimo) | R$19.900 |
| Addons IoT (~30 condos × R$200) | +R$6.000 |
| Addons Biometria/Placa (~20 condos × R$200) | +R$4.000 |
| **Receita total estimada** | **~R$29.900** |
| **Custo infraestrutura** | **~R$290** |
| **Margem** | **~99%** |

---

## Alternativas de Custo (para referência)

### Opção A: Tudo Self-hosted (mesmo da Opção C)
- Custo: ~R$290/mês
- Prós: Barato, controle total
- Contras: Manutenção manual de PostgreSQL, Redis, Coturn

### Opção B: Serviços Gerenciados
| Componente | Serviço | Custo/mês |
|---|---|---|
| Servidor | Hetzner CCX23 (4 vCPU, 16GB) | ~R$105 |
| PostgreSQL | DigitalOcean/Supabase Pro | ~R$80-150 |
| Redis | Upstash | ~R$30-60 |
| TURN | Twilio TURN (~200GB) | ~R$460 |
| Face Recognition | AWS Rekognition (~150k/mês) | ~R$870 |
| **TOTAL** | | **~R$1.500-1.700/mês** |

---

## Pontos de Atenção

- **Migração de dados**: SQLite → PostgreSQL precisa de script de migração com zero downtime (exportar, importar, switch)
- **Fotos em base64 no SQLite**: Campos `foto`, `face_descriptor` armazenam base64 direto no banco. No PostgreSQL, considerar mover para object storage (Hetzner Storage Box) para reduzir tamanho do DB
- **Senhas de câmera**: Armazenadas em plaintext no SQLite. Na migração, criptografar com AES-256
- **WebSocket ports**: Atualmente 3002/3003 podem não estar expostos no Docker. Garantir na migração
- **Backup**: Implementar backup incremental diário do PostgreSQL + snapshot semanal do servidor

---

*Última atualização: 5 de março de 2026*
