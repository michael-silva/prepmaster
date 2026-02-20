# PrepMaster

Gerenciador de cadeia de suprimentos para a cozinha — extração de receitas via IA, listas de compras e planejamento semanal.

## Sprint 1 — Setup concluído ✓

- [x] Vite + React + TypeScript
- [x] ESLint
- [x] PWA (vite-plugin-pwa)
- [x] Firebase Auth + Firestore
- [x] Google SSO
- [x] Zustand para sessão
- [x] Regras Firestore multi-tenant
- [x] CI/CD Vercel (vercel.json)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar Firebase

1. Crie um projeto em [Firebase Console](https://console.firebase.google.com/)
2. Ative **Authentication** → **Google** como provedor
3. Crie um banco **Firestore**
4. Copie as credenciais e crie `.env.local`:

```bash
cp env.example .env.local
```

Preencha com os valores do seu projeto Firebase.

### 3. Publicar regras do Firestore

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

### 4. Rodar em desenvolvimento

```bash
npm run dev
```

### 5. Build e deploy (Vercel)

```bash
npm run build
```

Conecte o repositório na Vercel e adicione as variáveis de ambiente (VITE_*) no painel.
