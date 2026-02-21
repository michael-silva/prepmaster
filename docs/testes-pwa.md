# Guia de Testes — PWA e Funcionalidades

Passo a passo para validar que o PrepMaster está funcionando corretamente e que o PWA pode ser instalado e usado.

---

## Pré-requisitos

- **Ícones PNG gerados:** rode `npm run generate-icons` uma vez (ou após alterar o favicon)
- App em execução: `npm run dev` (local) ou URL de deploy (ex.: Vercel)
- **HTTPS obrigatório** para PWA (localhost conta como seguro)
- Navegador Chromium (Chrome, Edge) ou Safari para testes completos

---

## 1. Testes de Autenticação

### 1.1 Login com Google (Popup — Desktop)

1. Acesse a tela de login
2. Clique em **Entrar com Google**
3. Abra o popup do Google e escolha a conta
4. **Esperado:** Redirecionamento para a tela de boas-vindas com avatar e nome
5. **Esperado:** Avatar do usuário carregando (sem erro 403)

### 1.2 Login com Google (Redirect — Mobile)

1. Em um dispositivo móvel ou emulador (DevTools → Device Mode)
2. Ou use User-Agent de mobile no DevTools
3. Clique em **Entrar com Google**
4. **Esperado:** Redirecionamento para a página do Google (sem popup)
5. Faça login e confirme
6. **Esperado:** Volta ao app já autenticado

### 1.3 Offline no login

1. Abra DevTools → **Application** → **Service Workers** → Offline
2. Ou use Network throttling: **Offline**
3. Clique em **Entrar com Google**
4. **Esperado:** Mensagem "Sem conexão com a internet. Conecte-se para fazer login."
5. Não deve ocorrer tela em branco ou erro genérico

### 1.4 Logout

1. Com usuário logado, clique em **Sair**
2. **Esperado:** Retorno à tela de login
3. **Esperado:** Estado limpo (sem dados da sessão anterior)

---

## 2. Testes do PWA

### 2.1 Verificar se é PWA

1. Abra o app em **HTTPS** (ou localhost)
2. DevTools → **Application** → **Manifest**
3. **Esperado:**
   - Nome: PrepMaster
   - Short name: PrepMaster
   - Start URL: /
   - Display: standalone
   - Ícones listados

### 2.2 Verificar Service Worker

1. DevTools → **Application** → **Service Workers**
2. **Esperado:** Um Service Worker registrado e ativo
3. Status: **activated and is running**
4. Em produção, verificar se `sw.js` e `workbox-*.js` existem

### 2.3 Instalação do PWA

**Chrome / Edge (Desktop):**

1. Acesse o app via HTTPS
2. **Esperado:** Ícone de instalação na barra de endereço (➕ ou computador)
3. Ou use o menu ⋮ → **Instalar PrepMaster**
4. Clique em **Instalar**
5. **Esperado:** App abre em janela separada (sem barra do navegador)

**Botão "Instalar app" na tela de login:**

1. Na tela de login (usuário não logado)
2. **Esperado:** Se o navegador suporta `beforeinstallprompt`, o botão **Instalar app** aparece
3. Clique no botão
4. **Esperado:** Diálogo nativo de instalação
5. Instale e verifique se abre em standalone

**Safari (iOS):**

1. Abra o app no Safari
2. Toque em **Compartilhar** (ícone de compartilhar)
3. Role e toque em **Adicionar à Tela de Início**
4. **Esperado:** Ícone do app na home screen

### 2.4 Modo standalone após instalação

1. Com o app instalado, abra pelo ícone (não pela aba do navegador)
2. **Esperado:** Sem barra de endereço, toolbar ou botões do navegador
3. **Esperado:** `display-mode: standalone` (verificável em CSS)

---

## 3. Testes Offline

### 3.1 Persistência do Firestore

1. Faça login e carregue a tela inicial
2. DevTools → **Network** → **Offline**
3. Recarregue a página
4. **Esperado:** Tela carrega (dados do usuário vêm do cache/IndexedDB)
5. **Esperado:** Usuário continua logado

### 3.2 Sessão mantida offline

1. Logado, ative Offline
2. Feche a aba e reabra o app (com Offline ainda ativo)
3. **Esperado:** Usuário permanece logado e vê a Home
4. **Esperado:** Não redireciona para a tela de login

### 3.3 Primeiro acesso offline

1. **Sem** ter visitado o app antes, ative Offline
2. Acesse o app
3. **Esperado:** Tela de login ou mensagem de falta de conexão
4. **Esperado:** Não quebra; o app não depende de dados ainda não cacheados

---

## 4. Checklist de Sanidade

Use esta tabela para validar o ambiente:

| Item | OK |
|------|-----|
| Login Google (popup) funciona | ☐ |
| Login Google (redirect em mobile) funciona | ☐ |
| Erro offline no login é exibido | ☐ |
| Avatar do usuário carrega | ☐ |
| Logout funciona | ☐ |
| Manifest carregado | ☐ |
| Service Worker ativo | ☐ |
| Instalação via barra de endereço (se disponível) | ☐ |
| Botão "Instalar app" aparece (quando elegível) | ☐ |
| App abre em standalone após instalação | ☐ |
| Sessão mantida offline | ☐ |

---

## 5. Comandos úteis

```bash
# Desenvolvimento
npm run dev

# Build de produção (simula deploy)
npm run build
npm run preview

# Lint
npm run lint
```

---

## 6. Problemas comuns e soluções

| Problema | Causa | Solução |
|----------|-------|---------|
| PWA não instala / botão não aparece | Manifest sem ícones PNG 192x192 e 512x512 | Rodar `npm run generate-icons` |
| Service Worker não registra em dev | Registro via script injetado usa `/sw.js` (só existe em prod) | Importar `registerSW` de `virtual:pwa-register` no código (usa `/dev-sw.js` em dev) |
| beforeinstallprompt não dispara | Chrome exige manifest com ícones válidos | Ícones PNG configurados no manifest |

## 7. Observações

- **beforeinstallprompt:** Nem todos os navegadores disparam. Chrome/Edge no desktop costumam disparar; Safari não usa esse evento.
- **iOS:** Instalação apenas via "Adicionar à Tela de Início" no Safari.
- **Android:** Pode aparecer banner automático de instalação além do botão customizado.
