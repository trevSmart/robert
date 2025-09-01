# Robert Extension Settings

Aquesta extensió implementa persistència completa dels settings utilitzant l'API de configuració de VS Code.

## Configuració

Els settings es guarden de manera persistent a la configuració global de VS Code i es recuperen automàticament quan s'obre l'extensió.

### Settings disponibles

| Setting | Tipus | Valor per defecte | Descripció |
|---------|-------|-------------------|------------|
| `robert.apiEndpoint` | string | `https://rally.example.com` | Endpoint de l'API per a l'extensió Robert |
| `robert.refreshInterval` | number | `30` | Interval de refresc en segons (5-3600) |
| `robert.theme` | string | `auto` | Preferència de tema (`auto`, `light`, `dark`, `high-contrast`) |
| `robert.autoRefresh` | boolean | `true` | Habilita el refresc automàtic |
| `robert.notifications` | boolean | `true` | Mostra notificacions |
| `robert.debugMode` | boolean | `false` | Habilita el mode debug |
| `robert.advancedFeatures` | boolean | `false` | Habilita funcions avançades |
| `robert.maxResults` | number | `100` | Nombre màxim de resultats a mostrar (10-1000) |
| `robert.timeout` | number | `5000` | Timeout de les peticions en mil·lisegons (1000-60000) |

## Com utilitzar els settings

### 1. Des de la interfície de l'extensió

1. Obre la vista de Robert (activity bar)
2. Fes clic a la icona d'ajustos (⚙️) a la capçalera
3. Modifica els settings segons les teves preferències
4. Fes clic a "Save Settings" per guardar-los

### 2. Des de la configuració de VS Code

1. Obre la configuració de VS Code (`Ctrl/Cmd + ,`)
2. Busca "robert" per veure tots els settings de l'extensió
3. Modifica els valors segons les teves preferències

### 3. Des del comandament

Executa el comandament `Robert: Open Extension Settings` per obrir directament la configuració de l'extensió.

## Validació

Els settings es validen automàticament abans de ser guardats:

- **refreshInterval**: Ha d'estar entre 5 i 3600 segons
- **maxResults**: Ha d'estar entre 10 i 1000
- **timeout**: Ha d'estar entre 1000 i 60000 mil·lisegons
- **theme**: Ha de ser un dels valors permesos (`auto`, `light`, `dark`, `high-contrast`)

## Persistència

Els settings es guarden a la configuració global de VS Code i es mantenen entre sessions. Això significa que:

- Els settings es mantenen quan tanques i obres VS Code
- Els settings es comparteixen entre tots els espais de treball
- Els settings es poden sincronitzar si tens habilitada la sincronització de VS Code

## Reset dels settings

Per tornar als valors per defecte:

1. Obre la vista de settings de l'extensió
2. Fes clic a "Reset to Defaults"
3. Els settings es tornaran als valors per defecte

## Logs

Totes les operacions de settings es registren al canal de sortida "Robert" per facilitar el debugging.

## Implementació tècnica

La persistència dels settings s'implementa utilitzant:

- **SettingsManager**: Classe singleton que gestiona la persistència
- **VS Code Configuration API**: Per guardar i recuperar settings
- **Validació**: Validació automàtica dels valors abans de guardar-los
- **Error Handling**: Gestió d'errors amb fallback als valors per defecte
