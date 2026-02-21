# Observabilidade — PrepMaster

Guia para diagnosticar problemas no fluxo **import-recipe → QStash → extract-recipe → Firestore**.

---

## 1. Structured Logging

Os endpoints usam **structured logging** via `api/lib/logger.ts`. Cada log é emitido como JSON com campos padronizados, o que facilita busca e correlação nos logs da Vercel.

### Formato dos logs

```json
{
  "level": "info",
  "fn": "import-recipe",
  "msg": "job created",
  "ts": "2026-02-21T15:30:00.000Z",
  "jobId": "abc123",
  "userId": "user456",
  "url": "https://example.com/receita"
}
```

### Campos padronizados

| Campo | Descrição |
|---|---|
| `level` | `info`, `warn` ou `error` |
| `fn` | Nome da function: `import-recipe` ou `extract-recipe` |
| `msg` | Mensagem curta descrevendo o evento |
| `ts` | Timestamp ISO 8601 |
| `jobId` | ID do job (quando disponível) |
| `userId` | UID do Firebase Auth (quando disponível) |
| `error` | Mensagem do erro (apenas em logs de erro) |
| `stack` | Stack trace (apenas em logs de erro) |

### Eventos logados por function

**`import-recipe`:**

| Mensagem | Quando |
|---|---|
| `auth ok` | Token Firebase verificado com sucesso |
| `job created` | Documento criado no Firestore `jobs/` |
| `queued` | Mensagem publicada no QStash |
| `handler failed` | Exceção no handler (com stack trace) |

**`extract-recipe`:**

| Mensagem | Quando |
|---|---|
| `processing started` | Webhook recebeu mensagem válida |
| `youtube url detected` | URL identificada como YouTube |
| `page fetched` | Conteúdo da página baixado (com `contentLength`) |
| `gemini response received` | Gemini retornou resposta (com `responseLength`) |
| `completed` | Receita salva com sucesso (com `recipeId` e `title`) |
| `extraction failed` | Exceção na extração (com stack trace) |
| `missing signing keys` | Env vars de signing QStash ausentes |
| `signature verification failed` | Assinatura QStash inválida |
| `failed to update job status` | Firestore rejeitou update do job |

### Como usar o logger em novos endpoints

```typescript
import { createLogger } from "./lib/logger.js";

const log = createLogger({ fn: "meu-endpoint" });
log.info("mensagem", { chave: "valor" });
log.error("falhou", err);

// child logger adiciona contexto automaticamente
const jlog = log.child({ jobId, userId });
jlog.info("etapa concluída"); // inclui jobId e userId
```

---

## 2. Vercel Function Logs

### Via Dashboard

1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard) → projeto **prepmaster**
2. Vá em **Logs** (menu lateral)
3. Filtre por:
   - **Function:** `api/import-recipe` ou `api/webhooks/extract-recipe`
   - **Status:** `500` (ou `4xx` para erros de validação)
   - **Timeframe:** últimos 30 minutos

### Via CLI

```bash
# Stream de logs em tempo real
npx vercel logs --follow

# Últimos logs (produção)
npx vercel logs prepmaster-ten.vercel.app

# Filtrar por função específica
npx vercel logs prepmaster-ten.vercel.app --filter "import-recipe"
```

### O que procurar nos logs

| Log prefix | Arquivo | Significado |
|---|---|---|
| `import-recipe error:` | `api/import-recipe.ts` | Erro no handler principal |
| `extract-recipe error:` | `api/webhooks/extract-recipe.ts` | Erro na extração |
| `QStash signature verification failed:` | `api/webhooks/extract-recipe.ts` | Assinatura QStash inválida |
| `Missing QStash signing keys` | `api/webhooks/extract-recipe.ts` | Env vars de signing ausentes |
| `Failed to update job status:` | `api/webhooks/extract-recipe.ts` | Firestore rejeitou update |
| `Missing Firebase Admin credentials` | `api/lib/firebase-admin.ts` | Env vars do Firebase ausentes |
| `FIREBASE_PRIVATE_KEY inválido` | `api/lib/firebase-admin.ts` | Chave PEM malformada |

---

## 3. Verificar Dados no Firebase/Firestore

### Via Console Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Selecione o projeto `gen-lang-client-0820821168`
3. Vá em **Firestore Database** (menu lateral)

### Collections a verificar

#### `jobs` — Status do processamento

```
jobs/{jobId}
├── user_id: string
├── url: string
├── status: "pending" | "completed" | "failed"
├── created_at: timestamp
├── completed_at: timestamp (quando finalizado)
├── recipe_id: string (se completed)
└── error: string (se failed)
```

**Checklist de diagnóstico:**

| Status do job | O que aconteceu | Próximo passo |
|---|---|---|
| Job **não existe** | `import-recipe` falhou antes do `jobRef.set()` | Verificar logs do `import-recipe` — provável erro de auth Firebase |
| `status: "pending"` | Job criado mas webhook não processou | Verificar QStash (seção 3) e logs do `extract-recipe` |
| `status: "failed"` + `error` | Webhook executou mas falhou | Ler campo `error` para detalhes |
| `status: "completed"` + `recipe_id` | Tudo OK | Verificar collection `recipes` |

#### `recipes` — Dados extraídos

```
recipes/{recipeId}
├── user_id: string
├── job_id: string
├── source_url: string
├── title: string
├── servings: number | null
├── prep_time_minutes: number | null
├── cook_time_minutes: number | null
├── ingredients: array
├── steps: array
├── mise_en_place: array
└── created_at: timestamp
```

### Via Firebase CLI

```bash
# Instalar se necessário
npm install -g firebase-tools
firebase login

# Listar últimos jobs (requer configuração de projeto)
firebase firestore:export --project gen-lang-client-0820821168
```

### Via Script rápido (Node.js)

Criar um arquivo temporário `scripts/check-job.mjs`:

```javascript
import admin from "firebase-admin";
import { readFileSync } from "fs";

const serviceAccount = JSON.parse(
  readFileSync("path/to/serviceAccountKey.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const jobId = process.argv[2];

if (!jobId) {
  console.log("Uso: node scripts/check-job.mjs <jobId>");
  process.exit(1);
}

const job = await db.collection("jobs").doc(jobId).get();
if (!job.exists) {
  console.log("Job não encontrado");
  process.exit(1);
}

console.log("Job:", JSON.stringify(job.data(), null, 2));

const recipeId = job.data()?.recipe_id;
if (recipeId) {
  const recipe = await db.collection("recipes").doc(recipeId).get();
  console.log("Recipe:", JSON.stringify(recipe.data(), null, 2));
}

process.exit(0);
```

### Firestore Security Rules

Se o erro for `PERMISSION_DENIED`, verificar as rules em **Firestore → Rules**. Para funções server-side (Firebase Admin SDK), as rules **não se aplicam** — o Admin SDK ignora security rules. Se mesmo assim estiver falhando, o problema é de credenciais.

---

## 4. Monitorar Fila QStash

### Via Dashboard Upstash

1. Acesse [console.upstash.com](https://console.upstash.com)
2. Vá em **QStash** (menu lateral)
3. Aba **Messages** — lista todas as mensagens publicadas

### O que verificar

| Campo | O que inspecionar |
|---|---|
| **Destination URL** | Deve ser `https://prepmaster-ten.vercel.app/api/webhooks/extract-recipe` |
| **Status** | `delivered`, `failed`, `retrying` |
| **Response Code** | `200` = sucesso, `401` = assinatura inválida, `500` = erro no webhook |
| **Retries** | QStash faz retry automático; muitos retries indicam problema persistente |
| **Created At** | Timestamp de quando a mensagem foi enfileirada |

### Via API QStash

```bash
# Listar mensagens recentes
curl -H "Authorization: Bearer $QSTASH_TOKEN" \
  https://qstash.upstash.io/v2/messages

# Ver detalhes de uma mensagem específica
curl -H "Authorization: Bearer $QSTASH_TOKEN" \
  https://qstash.upstash.io/v2/messages/<messageId>

# Ver status de delivery
curl -H "Authorization: Bearer $QSTASH_TOKEN" \
  https://qstash.upstash.io/v2/events
```

### Problemas comuns do QStash

| Sintoma | Causa provável | Solução |
|---|---|---|
| Mensagem nunca chega no webhook | `QSTASH_WEBHOOK_URL` incorreta | Corrigir para URL do webhook Vercel |
| Status `401` no delivery | Signing keys desatualizadas | Atualizar `QSTASH_CURRENT_SIGNING_KEY` e `QSTASH_NEXT_SIGNING_KEY` |
| Status `500` no delivery | Erro na function `extract-recipe` | Verificar logs Vercel da function |
| Mensagem em loop de retry | Webhook retornando erro consistentemente | Verificar logs + corrigir root cause |

---

## 5. Verificar Environment Variables na Vercel

As env vars locais (`.env.local`) **não são usadas no deploy**. Cada ambiente Vercel tem suas próprias variáveis.

### Via Dashboard

1. **Vercel Dashboard** → projeto → **Settings** → **Environment Variables**
2. Verificar que **todas** existem para o ambiente correto (Production / Preview / Development):

| Variável | Onde obter | Validação |
|---|---|---|
| `FIREBASE_PROJECT_ID` | Firebase Console → Configurações | Deve ser `gen-lang-client-0820821168` |
| `FIREBASE_CLIENT_EMAIL` | Service Account JSON → `client_email` | Formato: `*@*.iam.gserviceaccount.com` |
| `FIREBASE_PRIVATE_KEY` | Service Account JSON → `private_key` | Deve começar com `-----BEGIN PRIVATE KEY-----` |
| `QSTASH_TOKEN` | Upstash Console → QStash → REST API | Base64 string |
| `QSTASH_CURRENT_SIGNING_KEY` | Upstash Console → QStash → Signing Keys | Prefixo `sig_` |
| `QSTASH_NEXT_SIGNING_KEY` | Upstash Console → QStash → Signing Keys | Prefixo `sig_` |
| `QSTASH_WEBHOOK_URL` | URL da function Vercel | `https://<dominio>/api/webhooks/extract-recipe` |
| `GEMINI_API_KEY` | Google AI Studio | Prefixo `AIza` |

### Via CLI

```bash
# Listar variáveis configuradas (não mostra valores)
npx vercel env ls

# Puxar env vars do ambiente de produção
npx vercel env pull .env.production.local
```

### Armadilha comum: `FIREBASE_PRIVATE_KEY`

No dashboard Vercel, ao colar a private key:
- **Colar o valor completo** incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`
- **Manter os `\n`** como texto literal (o código faz `.replace(/\\n/g, "\n")`)
- **Não adicionar aspas** ao redor do valor no dashboard (Vercel já trata como string)

---

## 6. Fluxo de Debug Passo a Passo

Quando receber `500 Internal server error` do `import-recipe`:

```
1. Verificar logs Vercel
   └─ Procurar "import-recipe error:" para ver a exceção real
       │
       ├─ "Missing Firebase Admin credentials..."
       │   └─ Env vars do Firebase não configuradas na Vercel
       │
       ├─ "FIREBASE_PRIVATE_KEY inválido..."
       │   └─ Chave PEM corrompida/truncada
       │
       ├─ "Failed to parse private key" / "Invalid PEM"
       │   └─ \n não foi convertido para newline real
       │
       ├─ "PERMISSION_DENIED" / "UNAUTHENTICATED"
       │   └─ Service Account sem permissão no Firestore
       │
       ├─ Erro de rede / fetch / HTTP status
       │   └─ QStash publishJSON falhou — verificar QSTASH_TOKEN
       │
       └─ Outro erro
           └─ Verificar stack trace completo nos logs

2. Se job não aparece no Firestore
   └─ Erro aconteceu ANTES do jobRef.set() (linhas 60-93)
       └─ Provável: Firebase Admin init ou verifyIdToken

3. Se job aparece como "pending" indefinidamente
   └─ publishJSON pode ter falhado OU webhook nunca processou
       └─ Verificar QStash Dashboard → Messages

4. Se job aparece como "failed"
   └─ Ler campo "error" do documento
       └─ Verificar logs do extract-recipe
```

---

## 7. Teste Manual do Fluxo

### Testar `import-recipe` isoladamente

```bash
# Obter um ID Token válido do Firebase Auth (via app ou script)
TOKEN="<firebase-id-token>"

curl -X POST https://prepmaster-ten.vercel.app/api/import-recipe \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"url": "https://www.tudogostoso.com.br/receita/exemplo"}' \
  -v
```

Resposta esperada: `{"jobId": "abc123"}` com status `202`.

### Testar `extract-recipe` isoladamente (sem QStash)

Não é possível testar diretamente porque requer assinatura QStash válida. Use o QStash Dashboard para reenviar uma mensagem manualmente (botão "Retry" em mensagens falhadas).

---

## 8. Política de Retentativas (QStash)

### Como funciona

```
import-recipe                    QStash                         extract-recipe
     │                              │                                 │
     ├─ publishJSON(retries:3) ────>│                                 │
     │   delay: 10s                 │                                 │
     │                              ├── POST (tentativa 1) ─────────>│
     │                              │                                 ├── 200 OK → sucesso, para
     │                              │                                 ├── 500   → agenda retry
     │                              │                                 │
     │                              ├── POST (tentativa 2, +10s) ───>│
     │                              │        ...até 3 retries         │
```

### Configuração atual

| Parâmetro | Valor | Onde |
|---|---|---|
| `retries` | 3 | `import-recipe.ts` → `publishJSON()` |
| `delay` | 10s | Tempo entre retries |
| Backoff | Exponencial (padrão QStash) | 10s → 20s → 40s |

### Erros permanentes vs transientes

O webhook `extract-recipe` distingue dois tipos de erro:

| Tipo | Resposta HTTP | QStash faz retry? | Exemplos |
|---|---|---|---|
| **Transiente** | `500` | Sim (até 3x) | Timeout de rede, rate limit Gemini, Firestore temporário |
| **Permanente** | `200` (com body de erro) | Não | URL sem receita, vídeo privado, config ausente |

Retornar `200` para erros permanentes **impede que o QStash gaste retries** em algo que nunca vai funcionar.

No Firestore, jobs com erro permanente têm `permanent: true`:

```
jobs/{jobId}
├── status: "failed"
├── error: "Video may be private..."
└── permanent: true          ← indica que retry não resolve
```

### Onde ver mensagens falhadas

1. **Upstash Console** → QStash → **Events** (ou Messages)
   - Filtre por destination URL
   - Coluna **State**: `delivered` / `error` / `retry`
   - Clique na mensagem para ver: body enviado, response code, tentativas
2. **Firestore** → collection `jobs`
   - `status: "failed"` + `permanent: true` → erro definitivo
   - `status: "failed"` + sem `permanent` → falhou após todas as tentativas
   - `status: "processing"` parado há muito tempo → pode ter travado
   - `retry_count` mostra em qual tentativa estava

### Retry manual

No QStash Dashboard, mensagens falhadas têm botão **"Retry"** para reenviar manualmente.

---

## 9. Deduplicação de URL

### Como funciona

Antes de criar um novo job, `import-recipe` consulta o Firestore para verificar se já existe um job `pending` ou `processing` para a mesma URL + usuário:

```
POST /api/import-recipe  { url: "https://exemplo.com/bolo" }
  │
  ├─ Query: jobs where user_id == X AND url == Y AND status in ["pending","processing"]
  │
  ├─ Se existe → retorna jobId existente (200, deduplicated: true)
  └─ Se não    → cria novo job e enfileira (202)
```

Isso evita:
- Múltiplos jobs para a mesma URL enquanto um ainda está processando
- Gasto duplicado de quota do Gemini
- Receitas duplicadas no Firestore

**Nota:** A deduplicação permite reimportar uma URL que já foi processada (status `completed` ou `failed`), caso o usuário queira tentar novamente.

### Índice Firestore necessário

A query de deduplicação usa campos compostos. O Firestore pode pedir para criar um índice. Se aparecer um erro `FAILED_PRECONDITION` nos logs, o Firestore inclui um link direto para criar o índice necessário. Campos:

- Collection: `jobs`
- Campos: `user_id` (Ascending) + `url` (Ascending) + `status` (Ascending)

---

## 10. Idempotência do Webhook

O `extract-recipe` verifica o status do job antes de processar:

```
POST /api/webhooks/extract-recipe  (via QStash)
  │
  ├─ Busca job no Firestore
  ├─ Se status == "completed" → retorna 200 (skip, noop)
  └─ Se não → processa normalmente
```

Isso garante que retries do QStash **nunca criam receitas duplicadas**: se a primeira tentativa já completou com sucesso, todas as próximas são ignoradas com 200.

---

## 11. Checklist Rápido de Troubleshooting

- [ ] Logs Vercel mostram o erro real? (buscar `"fn":"import-recipe"` ou `"fn":"extract-recipe"`)
- [ ] Env vars existem no dashboard Vercel (não só no `.env.local`)?
- [ ] `FIREBASE_PRIVATE_KEY` está com formato PEM válido na Vercel?
- [ ] `QSTASH_WEBHOOK_URL` aponta para `https://.../api/webhooks/extract-recipe`?
- [ ] Job foi criado no Firestore? (collection `jobs`)
- [ ] QStash Dashboard mostra a mensagem como delivered?
- [ ] Job está com `permanent: true`? (erro que retry não resolve)
- [ ] Recipe foi criada no Firestore? (collection `recipes`)
