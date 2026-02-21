# Deploy do MVP — PrepMaster

Passo a passo completo para colocar o PrepMaster no ar (Sprint 1).

---

## Pré-requisitos

- [ ] Conta no [GitHub](https://github.com)
- [ ] Conta no [Firebase](https://console.firebase.google.com/)
- [ ] Conta na [Vercel](https://vercel.com)
- [ ] Node.js 18+ e npm
- [ ] Git instalado

---

## Parte 1: Repositório Git

### 1.1 Criar repositório no GitHub

1. Acesse [github.com/new](https://github.com/new)
2. Nome do repositório: `prepmaster` (ou outro)
3. Crie como **público** ou **privado**
4. **Não** marque "Add a README" se o projeto já existir localmente
5. Clique em **Create repository**

### 1.2 Enviar o código

```bash
cd /caminho/do/prepmaster

git init
git add .
git commit -m "Sprint 1: Setup e autenticação PWA"

git branch -M main
git remote add origin https://github.com/SEU_USUARIO/prepmaster.git
git push -u origin main
```

---

## Parte 2: Firebase

### 2.1 Criar projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. **Adicionar projeto** → nome: `prepmaster` → Continue
3. Analytics: ativar ou desativar conforme preferir
4. **Criar projeto**

### 2.2 Registrar app web

1. No painel, clique no ícone **</>** (Web)
2. Apelido: `PrepMaster Web`
3. **Não** marque Firebase Hosting
4. **Registrar app**
5. Copie o objeto `firebaseConfig` (você usará na Parte 4)

### 2.3 Ativar Authentication (Google)

1. Menu lateral → **Build** → **Authentication**
2. **Começar**
3. **Google** → Ativar
4. Defina o **E-mail de suporte do projeto**
5. **Salvar**

### 2.4 Criar Firestore

1. Menu lateral → **Build** → **Firestore Database**
2. **Criar banco de dados**
3. Modo **Produção**
4. Região: `southamerica-east1` (ou mais próxima)
5. **Ativar**

### 2.5 Vincular projeto ao Firebase CLI (local)

```bash
npm install -g firebase-tools
firebase login
firebase use --add
```

- Escolha o projeto `prepmaster` na lista
- Alias sugerido: `default`

### 2.6 Publicar regras do Firestore

```bash
firebase deploy --only firestore:rules
```

Confira: **Firestore** → **Regras** no console e veja se as regras foram atualizadas.

---

## Parte 3: Domínios autorizados no Firebase (Auth)

⚠️ **Importante:** o Firebase Auth só aceita login em domínios previamente autorizados.

### 3.1 Adicionar domínio da Vercel

1. Firebase Console → **Authentication** → **Settings** (Configurações)
2. Aba **Authorized domains** (Domínios autorizados)
3. **Adicionar domínio**
4. Adicione:
   - `prepmaster.vercel.app` (genérico)
   - Ou `SEU-PROJETO.vercel.app` (nome exato após o primeiro deploy)
5. Se usar domínio próprio mais tarde, adicione-o aqui também

---

## Parte 4: Variáveis de ambiente

Use o `firebaseConfig` copiado na etapa 2.2.

| Variável | Valor (exemplo) |
|----------|-----------------|
| `VITE_FIREBASE_API_KEY` | `apiKey` do config |
| `VITE_FIREBASE_AUTH_DOMAIN` | `authDomain` (ex: `prepmaster-xxx.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | `projectId` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `storageBucket` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |
| `VITE_FIREBASE_APP_ID` | `appId` |

Referência completa: [docs/env-setup.md](./env-setup.md)

---

## Parte 4.5: Gerar ícones PWA (antes do build)

```bash
npm run generate-icons
```

Sem os ícones PNG (192x192, 512x512), o PWA não é instalável. Rode este comando pelo menos uma vez.

---

## Parte 5: Deploy na Vercel

### Opção A: Via painel (recomendado)

1. Acesse [vercel.com](https://vercel.com) e faça login (preferencialmente com GitHub)
2. **Add New** → **Project**
3. Importe o repositório `prepmaster`
4. **Configure Project:**
   - Framework Preset: **Vite**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `.` (padrão)
5. **Environment Variables** — adicione as 6 variáveis `VITE_*`:
   - Para cada uma: Name, Value e ambiente (Production, Preview, Development)
6. **Deploy**
7. Aguarde o build e copie a URL (ex: `prepmaster-xxx.vercel.app`)

### Opção B: Via CLI

```bash
npm install -g vercel
vercel login
vercel
```

- Seguir as perguntas (link ao projeto existente ou criar novo)
- Antes do deploy, cadastrar as variáveis:

```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
# ... repetir para as outras
```

Ou adicione no painel: **Settings** → **Environment Variables**.

---

## Parte 6: Conferir o domínio no Firebase

Após o primeiro deploy, a Vercel gera uma URL. Garanta que ela esteja em **Authorized domains** no Firebase:

1. Firebase → **Authentication** → **Settings** → **Authorized domains**
2. Se a URL não estiver (ex: `prepmaster-xyz123.vercel.app`), adicione-a
3. Faça um novo deploy na Vercel se precisar refazer o build com as env corretas

---

## Parte 7: Validação

### 7.1 Checklist

- [ ] App abre na URL da Vercel
- [ ] Botão **Entrar com Google** funciona
- [ ] Após login, a tela de boas-vindas aparece
- [ ] Avatar do usuário carrega
- [ ] Botão **Sair** funciona
- [ ] PWA: no mobile/desktop, opção **Instalar app** ou **Adicionar à tela inicial**

### 7.2 Possíveis problemas

| Problema | Verificar |
|----------|-----------|
| Erro ao fazer login | Domínio da Vercel em Authorized domains? Variáveis env preenchidas? |
| Avatar quebrado | Já corrigido com `referrerPolicy="no-referrer"` |
| PWA não instala | Acesso via HTTPS? Build gerou `sw.js` e `manifest.webmanifest`? |
| Variáveis não aplicadas | Rodar deploy novamente após alterar env |

---

## Resumo do fluxo

```
GitHub (código) → Vercel (hosting)
                       ↓
Firebase (Auth + Firestore)
  └── Domínio Vercel em Authorized domains
  └── Regras Firestore publicadas
```

---

## Próximos deploys (CI/CD)

Com o repositório ligado à Vercel, cada push em `main` gera um novo deploy automaticamente:

```bash
git add .
git commit -m "Sua mensagem"
git push origin main
```

A Vercel faz o build e publica. Para mudar variáveis de ambiente, use o painel **Settings** → **Environment Variables** e faça um redeploy.
