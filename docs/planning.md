# 🚀 Arquitetura Lean: PrepMaster

## 🎯 Proposta de Valor Única (UVP) & Stack

* **UVP:** Um gerenciador pessoal de cadeia de suprimentos para a cozinha que utiliza inteligência artificial multimodal (Gemini) para automatizar a extração de receitas, otimizar listas de compras e agendar pré-preparos, rodando em uma infraestrutura serverless orientada a eventos de custo zero.
* **Stack Pragmática:** React.js (Vite + PWA), Zustand, Firebase (Auth e Firestore), Vercel (API & Webhooks), Upstash QStash, Google GenAI SDK (Gemini 2.5 Flash).

## 📦 Sprint 1: Setup & Autenticação PWA (Single Sign-On)

**Objetivo:** Eliminar riscos arquiteturais e entregar a primeira fatia de valor garantindo o isolamento de dados do usuário e o ambiente produtivo.

* **Requisitos Atendidos:** RF01.
* **Progresso Global:** 10%.
* **Tarefas Técnicas:** Configuração de lint, CI/CD na Vercel (Hobby), inicialização do Vite com plugin PWA, e setup do Firebase Auth/Firestore. Estabelecer regras de segurança do Firestore para multi-tenant (leitura/escrita apenas para o próprio `user_id`).
* **Entregável da Feature:** O usuário consegue instalar o PWA em seu dispositivo, realizar o login via Google SSO de forma fluida, e sua sessão é gerenciada globalmente. O sistema deve manter o login ativo via Service Worker mesmo offline.

## 📦 Sprint 2: Extração Multimodal Assíncrona (Motor Cognitivo)

**Objetivo:** Validar o coração do sistema, garantindo que o processamento pesado do Gemini não cause timeouts na Vercel.

* **Requisitos Atendidos:** RF02, RNF de Tolerância a Timeouts.
* **Progresso Global:** 25%.
* **Entregável da Feature:** O usuário pode colar uma URL na tela "Nova Receita" e clicar em "Importar Magicamente". O front-end envia a URL, e o usuário é liberado imediatamente enquanto o sistema extrai o JSON da receita em background.
* **Evolução Técnica:** Implementação do produtor (Vercel API) que cria um job `pending` no Firestore e publica no QStash. Implementação do consumidor (Webhook) que usa o Gemini 2.5 Flash, trata erros de mídia e atualiza o Firestore para `completed`.

## 📦 Sprint 3: Feedback Reativo de Processamento

**Objetivo:** Fechar o loop de comunicação com o usuário sobre o processamento assíncrono.

* **Requisitos Atendidos:** RF03.
* **Progresso Global:** 35%.
* **Entregável da Feature:** O usuário vê um estado de "Extraindo receita..." e recebe um alerta visual (Toast) em tempo real (< 500ms) quando a extração for concluída com sucesso no back-end. Receitas finalizadas aparecem listadas automaticamente.
* **Evolução Técnica:** Implementar escuta assíncrona com `onSnapshot` do Firebase SDK no front-end para reagir a mudanças no banco de dados sem necessidade de *polling*.

## 📦 Sprint 4: Sincronização Real-Time e Offline de Compras

**Objetivo:** Garantir a funcionalidade core do mercado sob condições adversas de rede.

* **Requisitos Atendidos:** RF05, RNF de Resiliência Offline.
* **Progresso Global:** 45%.
* **Entregável da Feature:** O usuário pode marcar itens de uma lista como comprados em áreas sem rede (offline). Ao reconectar, as edições sincronizam automaticamente e usuários colaborativos vêm as atualizações em tempo real.
* **Evolução Técnica:** Ativar persistência offline do Firestore (IndexedDB) e tratar race conditions delegando a resolução para o `serverTimestamp` do Firebase.

## 📦 Sprint 5: Consolidação e Conversão no Front-end

**Objetivo:** Implementar a lógica de agregação matemática para evitar sujeira de dados na lista de compras.

* **Requisitos Atendidos:** RF07, RNF de Complexidade de Renderização.
* **Progresso Global:** 55%.
* **Entregável da Feature:** A lista de compras unifica automaticamente os ingredientes idênticos, somando volumes ou pesos convertidos (ex: unificando ml e litros). Em casos de incompatibilidade de unidades (ex: unidade vs xícara), o sistema exibe os itens agrupados de forma legível.
* **Evolução Técnica:** Integração da lib `convert-units` ou algoritmo  executando via `reduce` no lado do cliente em menos de 50ms para garantir FPS estáveis.

## 📦 Sprint 6: Ordenação por Corredor (Aisle Sorting)

**Objetivo:** Acelerar o tempo de permanência no supermercado agrupando os itens visualmente.

* **Requisitos Atendidos:** RF08.
* **Progresso Global:** 65%.
* **Entregável da Feature:** Ao abrir a lista de compras, o usuário visualiza os itens categorizados em macro-categorias grandes, como "Hortifruti" e "Laticínios", sem precisar organizá-los manualmente.
* **Evolução Técnica:** Utilizar `Array.prototype.groupBy()` baseado no atributo `aisle` que o LLM já definiu na Sprint 2. Criação do bloco de *fallback* "Outros" para itens desconhecidos.

## 📦 Sprint 7: Cardápio Semanal (Planner)

**Objetivo:** Permitir a organização temporal das refeições.

* **Requisitos Atendidos:** RF06.
* **Progresso Global:** 75%.
* **Entregável da Feature:** O usuário consegue arrastar receitas de um carrossel para dias da semana em um calendário e gerar uma lista de compras agregada a partir desses dias com apenas um botão.
* **Evolução Técnica:** Integração com `@dnd-kit/core` para suportar *touch* e `date-fns` para lidar com datas. Lógica que injeta todos os insumos programados na coleção `shopping_list` e lida com agendamentos duplicados.

## 📦 Sprint 8: Gestão Transparente de Despensa

**Objetivo:** Evitar redundância financeira nas compras através do controle de estoque permanente.

* **Requisitos Atendidos:** RF09.
* **Progresso Global:** 85%.
* **Entregável da Feature:** O usuário pode marcar itens recorrentes como "Em Estoque" em sua despensa. Listas geradas subsequentemente omitem automaticamente esses itens, enviando-os para uma seção inferior expansível.
* **Evolução Técnica:** Lógica de *diff* no front-end, cruzando a lista temporária de compras com os dados da coleção `pantry` (`status: true`) no momento de geração da lista.

## 📦 Sprint 9: Batch de Mise en Place

**Objetivo:** Validar a otimização algorítmica de tempo físico nas preparações prévias.

* **Requisitos Atendidos:** RF10.
* **Progresso Global:** 95%.
* **Entregável da Feature:** Na aba "Preps de Domingo", o usuário visualiza uma lista consolidada de tarefas de pré-preparo (ex: cortar cebolas para três dias diferentes) e pode dar check nas tarefas, otimizando as horas da sua semana.
* **Evolução Técnica:** *Map/Reduce* em dados previamente persistidos pelo RF06 e objetos `mise_en_place` extraídos no RF02. O agrupamento precisa ser lógico, considerando ingredientes e técnicas extraídas via prompt no backend.

## 📦 Sprint 10: Modo Cozinha Guiada

**Objetivo:** Melhorar a UX durante a execução física com as mãos ocupadas ou sujas.

* **Requisitos Atendidos:** RF11.
* **Progresso Global:** 100% (do MVP Core).
* **Entregável da Feature:** O usuário inicia a receita em uma interface de *stepper* tela cheia, sem distrações. A tela não apaga enquanto a funcionalidade estiver ativa.
* **Evolução Técnica:** Integração da `Screen Wake Lock API`. Inclusão de blocos `try/catch` nativos e *fallback UI* (alertas gentis) para casos onde o SO (ex: iOS) bloqueia o wakelock por economia de energia.

---

## 📋 Auditoria Final de Requisitos

Revisão de todos os requisitos originais solicitados para garantir 100% de cobertura ou justificar exclusões metodológicas:

* [x] **RF01:** Autenticação PWA - Entregue na Sprint 1.
* [x] **RF02:** Extração Multimodal Assíncrona - Entregue na Sprint 2.
* [x] **RF03:** Feedback Reativo de Processamento - Entregue na Sprint 3.
* [ ] **RF04:** Importador de Playlists (Lote) - **Postergado**. Justificativa: De acordo com a metodologia *Lean Startup* focada no *Single-Piece Flow*, criar uma lógica de paralelização e throttling para *batch import* antes de validar o real valor e retenção da feature base de importação única é desperdício de engenharia. O *core value* pode ser provado apenas testando o RF02.
* [x] **RF05:** Sincronização Real-Time - Entregue na Sprint 4.
* [x] **RF06:** Cardápio Semanal (Planner) - Entregue na Sprint 7.
* [x] **RF07:** Consolidação e Conversão - Entregue na Sprint 5.
* [x] **RF08:** Ordenação por Corredor - Entregue na Sprint 6.
* [x] **RF09:** Gestão Transparente de Despensa - Entregue na Sprint 8.
* [x] **RF10:** Batch de Mise en Place - Entregue na Sprint 9.
* [x] **RF11:** Modo "Cozinha Guiada" - Entregue na Sprint 10.
* [x] **Requisitos Não Funcionais (RNFs):** Todos mitigados através das escolhas arquiteturais diluídas nas Sprints (Vercel Background, IndexedDB, Firebase serverTimestamp, complexidade O(n) local).

**⚠️ Alerta do Arquiteto:** A principal barreira para manter o custo absoluto em R$ 0,00 será o volume de processamento do LLM (Gemini). Mesmo sendo grátis, é crucial configurar corretamente os *prompts* com `responseMimeType: "application/json"` logo na Sprint 2 para garantir estruturação estrita e evitar loops infinitos de refatoração nos componentes visuais (RF06, RF08, RF10) que vão depender do payload perfeitamente tipado. Monitore de perto a latência do web hook e a fidelidade da extração.
