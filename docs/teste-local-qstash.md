# Testar a fila QStash localmente

Para testar o fluxo de extração (Importar Magicamente) sem fazer deploy na Vercel, use um **túnel** para expor seu localhost à internet. O QStash precisa de uma URL pública para chamar o webhook.

---

## Pré-requisitos

- Variáveis de ambiente em `.env.local` (Firebase, QStash, Gemini) — ver [env-setup.md](./env-setup.md)
- `vercel dev` instalado globalmente ou via `npx`

---

## Opção 1: localtunnel (mais simples)

### 1. Iniciar o app com API

```bash
npm run dev:api
# ou: npx vercel dev
```

Aguarde até aparecer algo como `Ready! Local: http://localhost:3000`. A porta pode ser outra (ex.: 3000 ou 5173).

### 2. Em outro terminal, criar o túnel

```bash
npx localtunnel --port 3000
```

Ajuste a porta se o `vercel dev` usar outra. A saída será algo como:

```
your url is: https://good-months-leave.loca.lt
```

### 3. Configurar a URL do webhook

No `.env.local`, defina:

```
QSTASH_WEBHOOK_URL=https://good-months-leave.loca.lt/api/webhooks/extract-recipe
```

**Nota:** localtunnel pode exibir uma página de "reminder" na primeira visita. Se o QStash retornar erro ao chamar o webhook, tente acessar a URL do túnel no navegador primeiro ou use ngrok (Opção 2).

### 4. Configurar a base URL da API (frontend)

Para o frontend chamar a API local:

```
VITE_API_URL=http://localhost:3000
```

### 5. Reiniciar e testar

Reinicie o `vercel dev` para carregar as novas variáveis:

```bash
# Ctrl+C no terminal do vercel dev, depois:
vercel dev
```

Acesse `http://localhost:3000`, faça login, vá em **Nova Receita**, cole uma URL de blog (ex.: receita de algum site) e clique em **Importar Magicamente**.

O fluxo será: Frontend → API local → QStash → Túnel → Webhook local → Gemini → Firestore.

---

## Opção 2: ngrok (mais estável)

### 1. Instalar e autenticar ngrok

- Crie conta em [dashboard.ngrok.com/signup](https://dashboard.ngrok.com/signup)
- Siga as instruções para instalar o CLI e configurar o token:

```bash
ngrok config add-authtoken SEU_TOKEN
```

### 2. Iniciar o app e o túnel

Terminal 1:

```bash
npm run dev:api
```

Terminal 2:

```bash
ngrok http 3000
```

Copie a URL de **Forwarding** (ex.: `https://e02f-xxx.eu.ngrok.io`).

### 3. Configurar `.env.local`

```
QSTASH_WEBHOOK_URL=https://e02f-xxx.eu.ngrok.io/api/webhooks/extract-recipe
VITE_API_URL=http://localhost:3000
```

### 4. Reiniciar e testar

Reinicie o servidor (`Ctrl+C` e `npm run dev:api` de novo) para carregar as novas variáveis e teste o fluxo como na Opção 1.

---

## Debug

- **ngrok**: acesse `http://127.0.0.1:4040` para ver as requisições que chegam ao webhook
- **QStash**: [Console Upstash](https://console.upstash.com/qstash) → aba **Logs** para mensagens e tentativas de delivery
- **Firestore**: verifique as coleções `jobs` e `recipes` no Firebase Console

---

## Porta do vercel dev

Por padrão, `vercel dev` (ou `npm run dev:api`) usa a porta **3000**. Se estiver ocupada, ele pode usar outra (ex.: 3001). Use a porta correta no túnel:

```bash
npx localtunnel --port 3001   # se vercel dev estiver em 3001
ngrok http 3001              # idem para ngrok
```
