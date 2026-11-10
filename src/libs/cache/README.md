# CacheManager - TTL-Based Cache System

Un sistema de cache eficiente con soporte para TTL (Time To Live) e invalidación automática de entradas.

## Características

- ✅ **TTL Automático**: Expira entradas después de un tiempo configurable
- ✅ **Limpieza Periódica**: Elimina entradas expiradas automáticamente cada minuto
- ✅ **Estadísticas**: Rastrea hits, misses, evictions y hit rate
- ✅ **Sin Límite de Memoria**: Extensible hasta llenar la memoria disponible
- ✅ **Seguro por Tipos**: Totalmente tipado con TypeScript
- ✅ **No Bloqueante**: Operaciones síncronas, sin overhead de I/O

## Instalación

```typescript
import { CacheManager } from './cache/CacheManager';

// Crear un cache con TTL de 5 minutos
const cache = new CacheManager<JiraUserStory[]>(5 * 60 * 1000);
```

## Uso Básico

### Almacenar valores

```typescript
// Con TTL por defecto (5 minutos)
cache.set('user-stories-all', userStories);

// Con TTL personalizado (30 segundos)
cache.set('user-stories-filtered', filteredStories, 30 * 1000);
```

### Recuperar valores

```typescript
const stories = cache.get('user-stories-all');

if (stories) {
	console.log('Datos del cache:', stories);
} else {
	console.log('Cache expirado o no existe');
}
```

### Verificar existencia

```typescript
if (cache.has('user-stories-all')) {
	console.log('Datos disponibles en cache');
}
```

### Eliminar entradas

```typescript
// Eliminar una entrada específica
cache.delete('user-stories-all');

// Limpiar todo el cache
cache.clear();
```

## Estadísticas

El cache proporciona estadísticas de rendimiento:

```typescript
const stats = cache.getStats();

console.log(`Hits: ${stats.hits}`); // 150
console.log(`Misses: ${stats.misses}`); // 25
console.log(`Hit Rate: ${stats.hitRate}%`); // 85.71%
console.log(`Evictions: ${stats.evictions}`); // 5
console.log(`Size: ${stats.size}`); // 42 entradas
```

## Implementación en Jira Services

### Usuario Stories con Cache TTL

```typescript
export async function getUserStories(query: JiraQuery = {}, limit: number | null = null) {
	// Generar clave única basada en parámetros
	const cacheKey = `userStories:${JSON.stringify(query)}`;

	// 1. Verificar cache TTL primero
	const cachedUserStories = userStoriesCacheManager.get(cacheKey);
	if (cachedUserStories) {
		console.log('[Robert] ✅ User stories retrieved from TTL cache');
		return {
			userStories: cachedUserStories,
			source: 'ttl-cache',
			count: cachedUserStories.length
		};
	}

	// 2. Intentar cache en memoria como fallback
	const cacheResult = checkCacheForFilteredResults(query, jiraData.userStories);
	if (cacheResult) {
		return {
			userStories: cacheResult.results,
			source: 'cache',
			count: cacheResult.count
		};
	}

	// 3. Llamar a la API si todo lo anterior falla
	const jiraApi = getJiraApi();
	const queryOptions = buildUserStoryQueryOptions(query, limit);
	handleDefaultProject(query, queryOptions);

	const result = await jiraApi.query(queryOptions);
	const resultData = result as JiraApiResult;

	if (!resultData.Results.length) {
		userStoriesCacheManager.set(cacheKey, []);
		return { userStories: [], source: 'api', count: 0 };
	}

	const userStories = formatUserStories(resultData);
	addToCache(userStories, jiraData.userStories, 'objectId');

	// 4. Guardar en cache TTL para futuras solicitudes
	userStoriesCacheManager.set(cacheKey, userStories);

	return {
		userStories: userStories,
		source: 'api',
		count: userStories.length
	};
}
```

## Flujo de Cache Multinivel

```
┌─────────────────────────────────────┐
│   Request con parámetros            │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Nivel 1: TTL Cache                │
│   (5 minutos)                       │
│   - Hit: retornar datos             │
│   - Miss: continuar                 │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Nivel 2: In-Memory Cache          │
│   (durante toda la sesión)          │
│   - Hit: retornar datos             │
│   - Miss: continuar                 │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Jira API                         │
│   (siempre llamar si nada lo hit)   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│   Almacenar en ambos caches         │
│   1. Jira Data (in-memory)         │
│   2. TTL Cache Manager              │
└─────────────────────────────────────┘
```

## Configuración del TTL

### Tiempos Recomendados

```typescript
// User Stories - 5 minutos (datos más frecuentemente solicitados)
const userStoriesCacheManager = new CacheManager<JiraUserStory[]>(5 * 60 * 1000);

// Projects - 10 minutos (cambian con menos frecuencia)
const projectsCacheManager = new CacheManager<JiraProject[]>(10 * 60 * 1000);

// Iterations - 15 minutos (cambian muy rara vez)
const iterationsCacheManager = new CacheManager<JiraIteration[]>(15 * 60 * 1000);

// Tasks - 3 minutos (pueden cambiar frecuentemente)
const tasksCacheManager = new CacheManager<any[]>(3 * 60 * 1000);

// Defects - 5 minutos
const defectsCacheManager = new CacheManager<JiraDefect[]>(5 * 60 * 1000);

// Users - 30 minutos (muy estable)
const usersCacheManager = new CacheManager<JiraUser[]>(30 * 60 * 1000);
```

## Monitoreo y Debugging

### Ver todas las entradas en cache

```typescript
const allEntries = cache.getAll();
console.log('Current cache entries:', allEntries);
```

### Mostrar estadísticas

```typescript
const stats = cache.getStats();
console.log(`
  Cache Statistics:
  - Size: ${stats.size} entries
  - Hits: ${stats.hits}
  - Misses: ${stats.misses}
  - Hit Rate: ${stats.hitRate}%
  - Evictions: ${stats.evictions}
`);
```

### Limpiar cache completamente

```typescript
cache.clear();
console.log('Cache cleared');
```

## Ciclo de Vida

```typescript
// 1. Crear instancia
const cache = new CacheManager<T>(5 * 60 * 1000);

// 2. Usar normalmente
cache.set('key', value);
cache.get('key');

// 3. Limpieza automática cada minuto
// (se ejecuta en background)

// 4. Limpiar recursos al finalizar
cache.destroy();
```

## Beneficios

### ⚡ Rendimiento

- Reduce llamadas a la API de Jira
- Disminuye la latencia de respuesta
- Mejora la experiencia del usuario

### 💰 Ahorro de Recursos

- Limita el número de solicitudes a Jira
- Reduce el consumo de ancho de banda
- Aprovecha recursos locales

### 🔄 Datos Frescos

- TTL automático garantiza datos actualizados
- Limpieza periódica mantiene la memoria libre
- Evita datos obsoletos

### 📊 Observabilidad

- Estadísticas detalladas de caché
- Monitoreo de hit/miss rates
- Debugging facilitado

## Ejemplo Completo

```typescript
import { CacheManager } from './cache/CacheManager';

// Crear cache para user stories (5 min TTL)
const userStoriesCacheManager = new CacheManager<JiraUserStory[]>(5 * 60 * 1000);

async function loadUserStoriesWithCache(query: JiraQuery) {
	const cacheKey = `userStories:${JSON.stringify(query)}`;

	// Verificar cache
	const cached = userStoriesCacheManager.get(cacheKey);
	if (cached) {
		console.log('✅ From cache');
		return cached;
	}

	// Llamar API
	console.log('📡 Fetching from API');
	const stories = await getUserStoriesFromApi(query);

	// Guardar en cache
	userStoriesCacheManager.set(cacheKey, stories);

	return stories;
}

// Uso
const stories = await loadUserStoriesWithCache({ Iteration: 'Sprint-1' });

// Mostrar estadísticas
const stats = userStoriesCacheManager.getStats();
console.log(`Cache hit rate: ${stats.hitRate}%`);
```

## Limpiar Recursos

Es importante limpiar el cache cuando la extensión se desactiva:

```typescript
// En extension.ts, en la función deactivate:
export function deactivate() {
	userStoriesCacheManager.destroy();
	projectsCacheManager.destroy();
	iterationsCacheManager.destroy();
	tasksCacheManager.destroy();
	defectsCacheManager.destroy();
	usersCacheManager.destroy();
}
```

## Pruebas

Para ejecutar las pruebas del CacheManager:

```bash
npm test -- src/libs/cache/CacheManager.test.ts
```

## Notas Técnicas

- Las claves de cache se generan con `JSON.stringify(query)` para identificar único
- Cada entrada almacena: datos, timestamp, y TTL
- El cleanup se ejecuta cada 60 segundos en background
- El cache es sincrónico (sin overhead de I/O)
- Totalmente tipado con TypeScript generics
