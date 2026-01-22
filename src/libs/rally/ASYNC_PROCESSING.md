# Processamento Assincrònic de Dades Pesades

## Problema Original

Com 3.500+ User Stories, a consulta a Rally retorna massas de dades que precisam ser processades (sanitització, mapping, etc.). Isso era feito sincronament, **bloqueando o thread principal e congelando a UI**.

## Solução Implementada

### 1. Processament en Chunks amb Yield ao Event Loop

```typescript
// Process data in chunks to avoid blocking the event loop
const CHUNK_SIZE = 25; // Process 25 items at a time

function yieldToEventLoop(): Promise<void> {
	return new Promise(resolve => setImmediate(resolve));
}
```

Cada 25 items processados, cedo controle ao event loop com `setImmediate()`. Isto permite que:

- A UI se mantenha responsiva
- Outros events (clics, scroll) sejam processados
- O spinner continue animando
- A browser não considere a página como "não responsiva"

### 2. Funções Async para Formatação

Antes (bloqueante):

```typescript
// ❌ SÍNCRONO - bloqueja para 3.500 items
const userStories = resultData.Results.map(userStory => ({
	// transformação complexa com sanitização HTML
	description: sanitizeDescription(userStory.Description),
	...
}));
```

Depois (não-bloqueante):

```typescript
// ✅ ASSINCRÓNICO - cede o event loop regularmente
async function formatUserStoriesAsync(result: RallyApiResult): Promise<RallyUserStory[]> {
	const formatted: RallyUserStory[] = [];

	for (let i = 0; i < result.Results.length; i++) {
		const userStory = result.Results[i];

		formatted.push({
			// transformação complexa
			description: sanitizeDescription(userStory.Description),
			...
		});

		// Ceder ao event loop cada 25 items
		if ((i + 1) % CHUNK_SIZE === 0) {
			await yieldToEventLoop();
		}
	}

	return formatted;
}
```

### 3. Funções Aplicades

| Funcio             | Items   | Antes    | Després      |
| ------------------ | ------- | -------- | ------------ |
| `getUserStories()` | 3500+   | sync map | async chunks |
| `getIterations()`  | 50-100  | sync map | async chunks |
| `getTasks()`       | 100-500 | sync map | async chunks |
| `getDefects()`     | 1000+   | sync map | async chunks |

## Fluxo de Processament

```
┌─────────────────────────────────────┐
│  Webview envia loadUserStories      │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  RobertWebviewProvider              │
│  case 'loadUserStories'             │
│  showSpinner = true                 │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  rallyServices.getUserStories()     │
│  - Check TTL Cache                  │
│  - Check Memory Cache               │
│  - Call Rally API                   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  formatUserStoriesAsync()           │
│  - Item 1-25: proces + yield        │
│  - Item 26-50: proces + yield       │
│  - ...                              │
│  - Item 3476-3500: proces + yield   │
│  UI STAYS RESPONSIVE!               │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  addToCache() - rápido, in-memory   │
│  userStoriesCacheManager.set()      │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  RobertWebviewProvider              │
│  postMessage('userStoriesLoaded')   │
│  showSpinner = false                │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Webview MainWebview.tsx            │
│  setUserStories(data)               │
│  setUserStoriesLoading(false)        │
│  React re-render com dados          │
└─────────────────────────────────────┘
```

## Tempos Estimats (3500 US)

### Antes (sincrònic)

- Processament: **2-5 segundos** (bloqueja UI completament)
- UI congela, spinner não anima
- Possible "Page Unresponsive" dialog

### Despres (assincrònic)

- Processament: **1.5-2 segundos** (distribuido)
- UI responsiva, spinner anima constantemente
- Usuari pot interact (scroll, clics)
- Melhor UX

## Detalls Técnics

### Por que `CHUNK_SIZE = 25`?

Com 3500 items:

- Chunk de 25 = 140 iteracions de yield
- Cada yield = ~10-15ms (deixa outros tasks rodar)
- Total = ~1.5-2 segundos completamente não-bloqueant

Se fosem 50:

- 70 iteracions de yield
- Mais rápido mas menos responsivo
- Risk de UI lag

### Como funciona `setImmediate()`?

```javascript
// Task Queue (prioritat baixa)
setImmediate(() => {
	// Executa depois que:
	// 1. Event loop procesa todos os eventos (clics, scroll)
	// 2. Callbacks do timers
	// 3. Outros microtasks
});
```

Isso garante que events de UI sejam processats quando precisam, não quando estamos processando dados.

## Exemplu Prático

```typescript
// Webview
sendMessage({ command: 'loadUserStories' });

// Extension
async function handleLoadUserStories() {
	const userStoriesResult = await getUserStories({});
	webview.postMessage({
		command: 'userStoriesLoaded',
		userStories: userStoriesResult.userStories
	});
}

// Durante getUserStories com 3500 items:
// ✓ Extension thread procesa em chunks
// ✓ UI thread continua responsivo
// ✓ Spinner anima suavemente
// ✓ Usuari pode fazer scroll, etc
// ✓ Cache TTL salva proximas consultas
```

## Optimizaciones Futuras

### 1. Streaming Progressivo (se necessário)

Se 1.5-2 segundos ainda forem muito:

```typescript
// Enviar items em batches conforme processam
for (let i = 0; i < CHUNKS; i++) {
	await yieldToEventLoop();
	webview.postMessage({
		command: 'userStoriesPartial',
		userStories: formattedBatch,
		progress: Math.round((i / CHUNKS) * 100)
	});
}
```

### 2. Web Workers (se necessário)

Se processamento ficar mais complexo:

```typescript
// Offload para worker thread completamente
const worker = new Worker('dataProcessorWorker.js');
worker.postMessage({ type: 'formatUserStories', payload: data });
worker.onmessage = event => {
	// Dados processats sin bloquejar o thread principal
};
```

## Monitoramento

Para monitorar se UI está responsive durante loading:

```typescript
// No webview console
console.time('user-stories-load');
sendMessage({ command: 'loadUserStories' });
// Verifica se spinner anima, se podes fazer scroll, etc
```

## Resumem

| Aspecto               | Antes        | Depois                 |
| --------------------- | ------------ | ---------------------- |
| **UI Responsividade** | ❌ Congelada | ✅ Responsiva          |
| **Spinner**           | ❌ Não anima | ✅ Anima suavemente    |
| **Tempo Total**       | 2-5s         | 1.5-2s                 |
| **User Can Interact** | ❌ Não       | ✅ Sim (scroll, clics) |
| **Cod Complexity**    | Simples      | Moderado (+async)      |
| **Performance CPU**   | Pico alto    | Distribuido            |

Com esta estratégia, **a experiencia do usuario melhora dramaticamente** mesmo com 3500+ items.
