# Configuração das Variáveis de Ambiente

Passo a passo para obter cada uma das credenciais necessárias no PrepMaster.

---

## Pré-requisitos

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Entre com sua conta Google

---

## 1. Criar o projeto Firebase

1. Clique em **"Adicionar projeto"** (ou **"Criar projeto"**)
2. Informe um nome (ex: `prepmaster`)
3. Desative o Google Analytics se quiser (não é obrigatório)
4. Clique em **"Criar projeto"**
5. Aguarde a conclusão e clique em **"Continuar"**

---

## 2. Registrar o app web

1. No painel do projeto, clique no ícone **</>** (Web)
2. Registre o app com um apelido (ex: `PrepMaster Web`)
3. **Não** marque "Firebase Hosting" por enquanto (usamos Vercel)
4. Clique em **"Registrar app"**
5. Uma janela mostrará um trecho de configuração similar a:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "prepmaster-xxx.firebaseapp.com",
  projectId: "prepmaster-xxx",
  storageBucket: "prepmaster-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

6. Copie cada valor para as variáveis abaixo

---

## 3. Ativar autenticação com Google

1. No menu lateral, vá em **"Build"** → **"Authentication"**
2. Clique em **"Começar"**
3. Em "Métodos de login", clique em **"Google"**
4. Ative o provedor e defina o **"E-mail de suporte do projeto"**
5. Clique em **"Salvar"**

---

## 4. Criar o Firestore

1. No menu lateral, vá em **"Build"** → **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de produção"**
4. Selecione a região mais próxima (ex: `southamerica-east1` para São Paulo)
5. Clique em **"Ativar"**
6. Depois, publique as regras de segurança:

   ```bash
   firebase deploy --only firestore:rules
   ```

---

## 5. Mapear cada variável

| Variável | Onde encontrar | Exemplo |
|----------|----------------|---------|
| `VITE_FIREBASE_API_KEY` | Config do app → `apiKey` | `AIzaSyB...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Config do app → `authDomain` | `prepmaster-abc123.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Config do app → `projectId` | `prepmaster-abc123` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Config do app → `storageBucket` | `prepmaster-abc123.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Config do app → `messagingSenderId` | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Config do app → `appId` | `1:123456789012:web:abc123def456` |

---

## 6. Onde pegar a config no console

Se não salvou os valores na etapa 2:

1. No Firebase Console, clique no ícone **engrenagem** ao lado de "Visão geral do projeto"
2. Vá em **"Configurações do projeto"**
3. Role até **"Seus aplicativos"**
4. Clique no app web cadastrado
5. Na seção **"Configuração do SDK"**, use o objeto `firebaseConfig` para extrair os valores

---

## 7. Criar o arquivo `.env.local`

1. Copie o exemplo:

   ```bash
   cp env.example .env.local
   ```

2. Abra `.env.local` e preencha:

   ```env
   VITE_FIREBASE_API_KEY=AIzaSyB...
   VITE_FIREBASE_AUTH_DOMAIN=prepmaster-abc123.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=prepmaster-abc123
   VITE_FIREBASE_STORAGE_BUCKET=prepmaster-abc123.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
   VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456
   ```

3. Reinicie o servidor de desenvolvimento (`npm run dev`) após alterar o arquivo

---

## 8. Deploy na Vercel

Ao fazer deploy na Vercel, adicione as mesmas variáveis:

1. No projeto, vá em **Settings** → **Environment Variables**
2. Cadastre cada uma das `VITE_*` com os mesmos valores
3. Marque o ambiente (Production, Preview, Development)
4. Faça um novo deploy para aplicar as mudanças

---

## 9. Variáveis da API (Sprint 2+)

Para a extração assíncrona de receitas (Importar Magicamente):

### 9.1 Firebase Admin (conta de serviço)

1. Firebase Console → **Configurações do projeto** (ícone engrenagem)
2. Aba **Contas de serviço** → **Gerar nova chave privada**
3. Baixe o JSON e extraia:
   - `project_id` → `FIREBASE_PROJECT_ID` (ou use o mesmo `VITE_FIREBASE_PROJECT_ID`)
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (copie inteiro, incluindo `-----BEGIN` e `-----END`)

### 9.2 Upstash QStash

1. Acesse [Upstash Console](https://console.upstash.com/) → QStash
2. Copie **Token** → `QSTASH_TOKEN`
3. Em **Signing Keys**, copie **Current** e **Next** → `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
4. `QSTASH_WEBHOOK_URL`: URL pública do webhook após deploy, ex: `https://seu-projeto.vercel.app/api/webhooks/extract-recipe`

### 9.3 Google AI (Gemini)

1. Acesse [Google AI Studio](https://aistudio.google.com/apikey) e crie uma API key
2. Copie → `GEMINI_API_KEY`

### 9.4 Testar localmente (sem deploy)

Para rodar a fila QStash contra sua máquina, use um túnel (ngrok ou localtunnel). Ver [teste-local-qstash.md](./teste-local-qstash.md).

---

## 10. CORS e Deployment Protection

Se o frontend rodando em `localhost:5173` não conseguir chamar a API na Vercel (erro "blocked by CORS policy"):

1. **Headers no vercel.json**: O projeto já inclui CORS no `vercel.json` para `http://localhost:5173`. Se usar outra porta (ex.: 3000), ajuste no `vercel.json` e faça redeploy.

2. **Deployment Protection**: Se o projeto tiver **Vercel Authentication**, **Password Protection** ou **Trusted IPs** ativos, requisições OPTIONS (preflight) podem ser bloqueadas antes de chegar à API. Nesse caso:
   - Vercel → **Settings** → **Deployment Protection**
   - Verifique se **OPTIONS Allowlist** está habilitada
   - Garanta que `/api` (ou `/api/import-recipe`) está na lista de paths liberados para OPTIONS
