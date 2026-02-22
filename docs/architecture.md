# PrepMaster: Cooking helper

# PrepMaster - Blueprint e Arquitetura de Concepção

---

## 1. Visão Geral e Benchmarks de Mercado

O **PrepMaster** é um Gerenciador de Cadeia de Suprimentos Pessoal (*Personal Supply Chain Manager*) focado em produtividade extrema na cozinha. Ele supera concorrentes como Paprika e AnyList ao substituir a extração burra de dados por um motor cognitivo multimodal (Gemini 2.5 Flash).

O sistema opera sob uma arquitetura **Event-Driven PWA (Offline-First)** de custo zero, capaz de contornar limitações rígidas de infraestrutura *Serverless*. Ele não apenas cataloga receitas, mas atua ativamente na redução do tempo físico do usuário através da conversão automatizada de unidades, ordenação inteligente de supermercado e agendamento em lote de *Mise en Place*.

## 2. Requisitos Funcionais (RF)

| **ID** | **Funcionalidade** | **Descrição** | **Prioridade** |
| --- | --- | --- | --- |
| RF01 | Autenticação PWA | Login via Firebase Auth (Google SSO) vinculado ao `user_id`. | Alta |
| RF02 | Extração Multimodal Assíncrona | Input de URL. O sistema enfileira o trabalho, libera o cliente e processa o vídeo nativamente ou o HTML via LLM em *background*. | Alta |
| RF03 | Feedback Reativo de Processamento | UI exibe estado de *Loading/Processing* e reage em tempo real (via WebSocket) quando o banco de dados recebe o JSON final da IA. | Alta |
| RF04 | Importador de Playlists (Lote) | Geração sequencial de receitas a partir de uma Playlist, enviando um *array* de eventos para a fila de processamento. | Média |
| RF05 | Sincronização *Real-Time* | Lista de compras colaborativa com atualização via WebSockets < 300ms. | Alta |
| RF06 | Cardápio Semanal (Planner) | Alocação *drag-and-drop* de receitas no calendário, exportando ingredientes em lote para a lista de compras. | Alta |
| RF07 | Consolidação e Conversão no Front-end | Agrupamento client-side de ingredientes idênticos e conversão de volumetria para peso/unidade. | Alta |
| RF08 | Ordenação por Corredor (Aisle Sorting) | Classificação em macro-categorias (Hortifruti, Açougue) definida pelo LLM no momento da extração. | Alta |
| RF09 | Gestão Transparente de Despensa | Cruzamento da lista de compras gerada com o estoque local, omitindo itens marcados como "Em Estoque". | Alta |
| RF10 | Batch de Mise en Place | Agrupamento algorítmico de pré-preparos da semana em uma tela centralizada ("Preps de Domingo"). | Alta |
| RF11 | Modo "Cozinha Guiada" | Interface *stepper* em tela cheia com *Wake Lock API* ativa para impedir bloqueio do display. | Média |
| RF12 | Revisão Pré-Salvamento de Extração | Dados extraídos pela IA populam formulário editável; o usuário revisa e ajusta antes de salvar definitivamente na coleção `recipes`. | Alta |
| RF13 | Organização em Listas de Receitas | Livro de receitas organizável em listas temáticas compartilháveis; outros usuários podem importar receitas dessas listas para seus próprios livros. | Média |
| RF14 | Multiplicador de Porções na Lista de Compras | Ao enviar ingredientes de uma receita para a lista de compras, permitir informar multiplicador (N×) para ajustar quantidades proporcionalmente. | Alta |

## 3. Requisitos Não Funcionais (RNF)

- **Tolerância a Timeouts (Event-Driven):** Requisições de extração (RF02) não podem ultrapassar 2 segundos na Vercel (Front-facing API). O processamento pesado (15s - 30s) ocorrerá assincronamente via webhook disparado pelo Message Broker.
- **Limites de Custo e Infraestrutura (R$ 0,00):** - Vercel (Hobby): Requisições limitadas a 10s (mitigado).
    - Upstash QStash (Free): Até 10.000 mensagens/dia.
    - Gemini 2.5 Flash: Até 1.500 RPD (Requests Per Day).
    - Firestore (Spark): 50.000 leituras/dia.
- **Resiliência Offline:** O aplicativo deve utilizar *Service Workers* e persistência do IndexedDB para garantir leitura e edição de listas de compras em zonas sem rede (ex: supermercados).
- **Complexidade de Renderização:** Funções de consolidação de lista (RF07) devem executar no cliente com complexidade de tempo de agregação otimizada para manter os *frames per second* (FPS) estáveis.

## 4. Arquitetura de Sistema e Tech Stack Proposta

- **Padrão Arquitetural:** **Microserviços Serverless Orientados a Eventos (Event-Driven Asynchronous Architecture).**
    
    *Justificativa:* Desacoplar a ingestão da requisição (Vercel API) do processamento pesado (IA) via fila de mensagens impede erros HTTP 504 (*Gateway Timeout*), garantindo a estabilidade da aplicação em *Free Tiers*. A comunicação final com o cliente via conexão persistente (Firestore) elimina o desperdício de requisições do modelo de *Polling*.
    
- **Frontend / Clients:**
    - `React.js` via `Vite` com `vite-plugin-pwa`.
    - Gerenciamento de estado: `Zustand`.
    - Escuta assíncrona: `onSnapshot` (Firebase SDK) para reagir à conclusão das extrações no banco.
- **Backend / Mensageria (Serverless):**
    - **Produtor (Vercel API):** Recebe URL, gera um `job_id` no Firestore com status `pending`, publica mensagem no QStash e retorna HTTP 202.
    - **Message Broker:** `Upstash QStash` (Garante a entrega e permite *retries* em caso de falha transitória da API do Google).
    - **Consumidor (Vercel Webhook):** Rota protegida que recebe o gatilho do QStash, executa a extração via LLM e atualiza o documento no Firestore para o status `completed` com o JSON da receita.
- **Bancos de Dados / Cache:**
    - **Firebase Firestore:** Atua como Banco Primário, Motor de Sincronização *Real-time* Colaborativa e *State Store* para os Jobs assíncronos.
- **Integrações & Libs Cognitivas:**
    - **Google GenAI SDK (`@google/genai`):** Utilização estrita do modelo **Gemini 2.5 Flash** com suporte a *Multimodal Payloads* (`fileData` para bypass do YouTube) e *Structured Outputs* (`responseMimeType: "application/json"` para blogs de receita HTML).
    - **Upstash SDK:** `@upstash/qstash` para publicação de eventos.

## 5. Referências e Inspirações

- **Upstash QStash com Vercel:** [Documentação de Filas Assíncronas em Serverless](https://upstash.com/docs/qstash/quickstarts/vercel-nextjs).
- **Gemini Multimodal Video Processing:** [Análise nativa de arquivos de vídeo via API](https://www.google.com/search?q=https://ai.google.dev/docs/gemini_api_developer_guide).
- **Firestore Realtime Updates:** [Padrões de escuta de estado de Jobs Assíncronos no Client-Side](https://firebase.google.com/docs/firestore/query-data/listen).

---

## Requisitos detalhados

### RF01: Autenticação PWA e Single Sign-On

**Descrição:** Implementação de autenticação *frictionless* via Google, criando a fundação de segurança para isolamento de dados no banco (Multi-tenant logic). Sem login, não há persistência em nuvem, apenas no IndexedDB local.

**Infraestrutura/Libs:** `Firebase Auth` (SDK Frontend), `React Context API` (ou `Zustand`) para gerenciar a sessão global do usuário.

**Fluxo de usuário:**

1. Usuário abre o PWA. A tela inicial exibe os benefícios e um botão "Entrar com Google".
2. Usuário clica. O popup nativo do Google (ou redirecionamento PWA) abre.
3. Após aprovação, o PWA recebe o *token*. O estado global do React é atualizado com o `user_id`.
    
    **Tratamento de Edge Cases:** Se o usuário estiver offline no momento do login inicial, o sistema deve exibir erro claro pedindo conexão. Se o token expirar enquanto ele estiver offline no mercado, o Firebase Auth em cache no Service Worker deve mantê-lo logado localmente para não bloquear a leitura da lista.
    
    **Definition of Done (DoD):** Login efetuado com sucesso via Google; Objeto do usuário criado no Firestore (se for o primeiro login); Regras de segurança do Firestore bloqueando leitura/escrita de dados de outros `user_id`s.
    

---

### RF02: Extração Multimodal Assíncrona (O Motor Cognitivo)

**Descrição:** O coração do sistema. O app não espera a IA pensar. Ele enfileira a extração de URLs (YouTube ou Blogs) em um *Message Broker* para contornar o limite de 10s da Vercel e processa via Gemini 2.5 Flash em *background*.

**Infraestrutura/Libs:** `Vercel Functions` (API Produtora e Webhook Consumidor), `Upstash QStash` (Message Broker), SDK `@google/genai` (API Multimodal).

**Fluxo de usuário:**

1. Na tela de "Nova Receita", o usuário cola a URL do YouTube ou Blog e clica em "Importar Magicamente".
2. O Front-end envia a URL para a API da Vercel.
3. A API cria um documento em uma coleção `jobs` no Firestore com status `pending` e delega a tarefa para o QStash.
4. O usuário é liberado imediatamente para navegar pelo app.
    
    **Tratamento de Edge Cases:** Se a URL for inválida ou o vídeo for privado/removido, o Gemini retornará erro. O webhook deve capturar (`catch`) esse erro e atualizar o status do Job no Firestore para `failed` com o motivo legível.
    
    **Definition of Done (DoD):** A URL inserida gera um Job no Firestore; O QStash engatilha o Webhook; O Webhook processa a mídia no Gemini e atualiza o Firestore com o JSON estruturado final sem gerar HTTP 504 (*Timeout*).
    

---

### RF03: Feedback Reativo de Processamento

**Descrição:** O sistema que avisa o usuário que a extração em *background* (RF02) terminou, usando WebSockets para evitar *refresh* da página.

**Infraestrutura/Libs:** `Firebase SDK (onSnapshot)` no Front-end (React), UI components de Toast/Snackbar.

**Fluxo de usuário:**

1. Após colar a URL (RF02), um *Card* na interface exibe "Extraindo receita... (status: pendente)".
2. O usuário pode fechar a tela e ir para o Cardápio.
3. Quando a Vercel atualiza o Firestore, o PWA "ouve" a mudança em tempo real.
4. Um alerta visual (*Toast* ou notificação *Push* local) avisa "Receita de Lasanha importada com sucesso!". O Cardápio agora lista a receita.
    
    **Tratamento de Edge Cases:** Se o usuário fechar o PWA inteiro durante o processamento, ele não verá a notificação imediata. No próximo acesso, a UI deve varrer a coleção `jobs` e avisar sobre os itens concluídos na ausência dele.
    
    **Definition of Done (DoD):** Interface reage em < 500ms à mudança de estado do documento no Firestore de `pending` para `completed`, transferindo os dados extraídos para a coleção `recipes`.
    

---

### RF04: Importador de Playlists (Batch Processing)

**Descrição:** Capacidade de colar a URL de uma Playlist do YouTube. O sistema faz o *parsing* dos links e lança múltiplos eventos para o motor de extração (RF02) simultaneamente.

**Infraestrutura/Libs:** API gratuita do YouTube Data v3 (apenas para ler IDs da playlist) ou scraper client-side simples.

**Fluxo de usuário:**

1. Usuário cola URL de uma Playlist na tela de importação.
2. O sistema lista os N vídeos encontrados e pergunta: "Deseja importar estas 10 receitas?".
3. O usuário clica em "Importar Tudo". O front-end dispara 10 requisições para a rota produtora da Vercel.
    
    **Tratamento de Edge Cases:** Evitar estourar o limite de *rate limit* de envio para a Vercel/QStash (Client-side throttling com atraso de 200ms entre cada requisição da mesma playlist).
    
    **Definition of Done (DoD):** Extração bem-sucedida de N vídeos gerando N *jobs* assíncronos que processam em paralelo sem travar a thread principal.
    

---

### RF05: Sincronização Real-Time e Offline (Lista de Compras)

**Descrição:** Lista de compras colaborativa, tolerante a falhas de rede de supermercados.

**Infraestrutura/Libs:** `Firestore (Offline Persistence)` e gerenciamento de conflitos nativo do Firebase.

**Fluxo de usuário:**

1. Usuário no supermercado sem sinal de celular (3G caiu) marca o "Tomate" como comprado. O item fica riscado na tela (salvo no IndexedDB).
2. O usuário recupera o sinal perto do caixa.
3. O Service Worker empurra o delta para o Firestore automaticamente.
4. A esposa do usuário, em casa com o PWA aberto, vê o "Tomate" ser riscado na tela dela em tempo real.
    
    **Tratamento de Edge Cases:** Race conditions. Se os dois usuários marcarem o mesmo item quase simultaneamente sem rede e ambos reconectarem, o Firestore resolve com a regra do último carimbo de tempo (`serverTimestamp`).
    
    **Definition of Done (DoD):** Checklists reativos. Modo avião ativado não deve impedir leitura/edição. Reconexão deve sincronizar sem intervenção manual.
    

---

### RF06: Cardápio Semanal (Planner)

**Descrição:** Visão de calendário onde o usuário arrasta as receitas para organizar a semana e exportar os insumos.

**Infraestrutura/Libs:** Libs leves de Drag-and-Drop para React (ex: `@dnd-kit/core` por ter suporte premium a touch em telas mobile), `date-fns` para manipulação de datas.

**Fluxo de usuário:**

1. Usuário acessa aba "Semana".
2. Visualiza um carrossel inferior com suas receitas.
3. Arrasta "Risoto" para "Segunda - Jantar" e "Omelete" para "Terça - Café".
4. Clica em um botão Flutuante: "Gerar Lista de Compras da Semana".
    
    **Tratamento de Edge Cases:** Usuário agendar a mesma receita 3 vezes. O sistema deve multiplicar por 3 os ingredientes na exportação silenciosamente.
    
    **Definition of Done (DoD):** Interface *Drag and Drop* fluida no *mobile touch*. Exportação injeta os ingredientes de todas as receitas ativas naquele período na coleção `shopping_list`.
    

---

### RF07: Consolidação e Conversão no Front-end (O Motor Matemático)

**Descrição:** O cérebro local que impede que a lista mostre "200g de frango" e "1kg de frango" separadamente. Ele agrupa e normaliza pesos no lado do cliente.

**Infraestrutura/Libs:** Biblioteca `convert-units` ou algoritmo proprietário local simples de $O(n)$.

**Fluxo de usuário:** (Invisível para o usuário)

1. Ao clicar em "Gerar Lista" (RF06), o PWA mapeia 50 ingredientes soltos.
2. O script unifica unidades da mesma família (Ex: soma Mililitros com Litros -> converte tudo para Litros).
3. A tela de lista de compras é exibida já limpa e condensada.
    
    **Tratamento de Edge Cases:** Incompatibilidade volumétrica. A IA pode extrair "1 unidade de cebola" e "1 xícara de cebola". Não dá para somar matematicamente. O UI deve apenas agrupar como: `Cebola (1 unidade + 1 xícara)`.
    
    **Definition of Done (DoD):** Array de ingredientes passa por um `reduce` em menos de 50ms antes de renderizar a lista, com conversão correta de pesos universais (Massa e Volume).
    

---

### RF08: Ordenação por Corredor (Aisle Sorting)

**Descrição:** Otimização de tempo físico no mercado. Os itens extraídos já chegam do LLM tagueados com a seção correta.

**Infraestrutura/Libs:** Apenas `Array.prototype.groupBy()` no front-end baseado no atributo `aisle` salvo no Firestore pela IA (RF02).

**Fluxo de usuário:**

1. Usuário abre a Lista de Compras.
2. A lista exibe *Headers* grandes: **🍇 Hortifruti**, **🧀 Laticínios**, **🥩 Açougue**.
3. O usuário caminha no mercado completando cada seção de uma vez.
    
    **Tratamento de Edge Cases:** A IA colocar um ingrediente bizarro em um corredor desconhecido. O front-end deve ter um bloco de *fallback* chamado "Outros" para capturar `aisle` não reconhecidos.
    
    **Definition of Done (DoD):** Itens renderizados em blocos lógicos no front-end baseados em metadados estritos no JSON, sem exigir intervenção manual do usuário para categorizar.
    

---

### RF09: Gestão Transparente de Despensa

**Descrição:** Impede compras redundantes cruzando estoques locais de longo prazo (Sal, Óleo, Pimenta).

**Infraestrutura/Libs:** Consulta cruzada entre a coleção de estado local (`pantry`) e a lista temporária gerada.

**Fluxo de usuário:**

1. Na primeira semana de uso, o usuário vai na aba "Minha Despensa" e cadastra itens recorrentes: "Azeite", "Sal", "Açúcar" marcando como *Em Estoque*.
2. Ao gerar uma nova Lista de Compras, o sistema varre a Despensa.
3. Na Lista de Compras, o item "Azeite" aparece oculto numa seção inferior sanfonada (accordion) chamada "Já tenho na Despensa (1)".
    
    **Tratamento de Edge Cases:** O usuário esquece que o Azeite acabou e o app omite o item. Solução: Permitir expandir o sanfonado da despensa na lista de compras e clicar num ícone de "Adicionar à compra mesmo assim".
    
    **Definition of Done (DoD):** Algoritmo de diferença (`diff`) entre o array da lista gerada e os itens da coleção `pantry` (`status: true`), resultando em exclusão visual do item no carrinho primário.
    

---

### RF10: Batch de Mise en Place (Preps da Semana)

**Descrição:** O diferencial absoluto de inteligência do produto. Agrega todas as ações pre-preparo da semana em um plano de execução de Domingo.

**Infraestrutura/Libs:** Filtros e Mapas em Javascript (`Array.filter` e `Array.reduce`) iterando sobre os dados já persistidos pelo RF06 e extraídos no RF02.

**Fluxo de usuário:**

1. Com a semana planejada, usuário abre a aba "Preps de Domingo".
2. O app exibe: "Você tem cebola nas receitas de Segunda, Terça e Sexta".
3. Tarefa Mestra gerada: "🔪 Corte 4 Cebolas em Brunoise agora. Separe 1 pote para amanhã, e congele 2 potes."
4. Usuário vai dando *check* nas tarefas e otimiza horas da semana.
    
    **Tratamento de Edge Cases:** A receita pode ter ingredientes processados em temperaturas diferentes (ex: "Tomate assado" vs "Tomate cru"). O agrupamento deve ocorrer respeitando Ingrediente + Técnica (do banco estático cruzado via Prompt).
    
    **Definition of Done (DoD):** Interface consolidadora exibindo as *tasks* de pré-preparo agrupadas logicamente baseadas nos objetos JSON `mise_en_place` extraídos pelo LLM.
    

---

### RF11: Modo "Cozinha Guiada"

**Descrição:** A execução final. Uma UI imersiva (focus mode) para quando as mãos do usuário estiverem sujas.

**Infraestrutura/Libs:** `Screen Wake Lock API` (Web API nativa).

**Fluxo de usuário:**

1. Usuário seleciona "Iniciar Receita". A UI esconde barras de navegação (distração).
2. O sistema pede permissão silenciosa (do navegador) para travar a tela.
3. A tela exibe o passo 1 em fonte bem grande: "Em fogo médio, refogue a cebola (que você já cortou no domingo)".
4. Usuário arrasta para o lado (Swipe) ou clica no botão gigante "Próximo Passo".
    
    **Tratamento de Edge Cases:** A Wake Lock API pode ser bloqueada pelo iOS em modo de baixo consumo de bateria (*Low Power Mode*). O sistema deve engolir o erro de *Promise rejection* silenciosamente e exibir um alerta gentil no rodapé: "Modo economia de bateria ativo: sua tela pode apagar".
    
    **Definition of Done (DoD):** Interface de carrossel passo-a-passo (Stepper); bloqueio de descanso de tela operando com sucesso; navegação adaptada para toque facilitado (hitboxes grandes).
    

---