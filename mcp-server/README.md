# IBM Rally Context

Servidor MCP que exposa dades de Broadcom Rally a través del Model Context Protocol. Proporciona un conjunt de tools per consultar o modificar artefactes de Rally (projectes, iteracions, user stories, test cases, etc.) des d'agents compatibles amb MCP.

## Requisits

- Node.js >= 22.7.5 (recomanat utilitzar la versió indicada a `package.json`)
- Un compte de Broadcom Rally amb permisos sobre el workspace/projecte a consultar
- Una clau API de Rally (personal access token)

## Instal·lació

### Des de npm (recomanat)

```bash
npm install -g ibm-rally-context
```

### Des del codi font

1. Clona el repositori:
   ```bash
   git clone https://github.com/trevSmart/ibm-rally-context.git
   cd ibm-rally-context
   ```

2. Instal·la les dependències:
   ```bash
   npm install
   ```

## Configuració

1. Crea un fitxer `.env` a l'arrel amb les variables necessàries:
   ```bash
   cp .env.example .env
   ```

   Edita el fitxer `.env` amb les teves credencials:
   ```dotenv
   RALLY_INSTANCE=https://eu1.rallydev.com
   RALLY_APIKEY=pat-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   RALLY_PROJECT_NAME=Nom del projecte per defecte
   LOG_LEVEL=info              # Opcional: info | debug | warn | error
   STRIP_HTML_TESTCASE_DESCRIPTION=true # Opcional: activa la neteja d'HTML a les descripcions
   # RALLY_SSL_VERIFY=false    # Opcional: desactiva la verificació SSL (NOMÉS desenvolupament)
   ```
   > No comparteixis ni versionis mai valors reals de les credencials.

2. Inicia el servidor MCP:
   ```bash
   # Si l'has instal·lat globalment des de npm:
   ibm-rally-context

   # Si l'has instal·lat des del codi font:
   npm start
   ```
3. Connecta el teu client MCP (per exemple Cursor, Claude Desktop o scripts propis) utilitzant el transport STDIO.

### Configuració per Claude Desktop

Afegeix la següent configuració al fitxer de configuració de Claude Desktop:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ibm-rally-context": {
      "command": "ibm-rally-context",
      "env": {
        "RALLY_INSTANCE": "https://eu1.rallydev.com",
        "RALLY_APIKEY": "pat-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "RALLY_PROJECT_NAME": "Nom del projecte per defecte",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### Configuració per Cursor

Afegeix la següent configuració al fitxer de configuració de Cursor:

**macOS**: `~/Library/Application Support/Cursor/User/globalStorage/rooveterinaryinc.roo-cline/settings/cline_mcp_settings.json`
**Windows**: `%APPDATA%\Cursor\User\globalStorage\rooveterinaryinc.roo-cline\settings\cline_mcp_settings.json`

```json
{
  "mcpServers": {
    "ibm-rally-context": {
      "command": "ibm-rally-context",
      "env": {
        "RALLY_INSTANCE": "https://eu1.rallydev.com",
        "RALLY_APIKEY": "pat-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "RALLY_PROJECT_NAME": "Nom del projecte per defecte",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

> **Nota Important**: Quan instal·les el paquet globalment amb `npm install -g ibm-rally-context`, la comanda `ibm-rally-context` estarà disponible al PATH del sistema. No utilitzis rutes absolutes com `/Users/username/Documents/...` a la configuració del client MCP.


## Estructura principal

- `index.js`: punt d'entrada del servidor MCP, registra totes les tools, prompts i recursos.
- `src/utils.js`: integració amb el SDK de Rally i utilitats compartides (logging, helpers i instància de l'API).
- `src/rallyServices.js`: capa de servei que encapsula les crides a l'API de Rally amb memòria cau bàsica.
- `src/tools/`: col·lecció de tools MCP que mapejen funcionalitats concretes de Rally (consultes, creació i actualitzacions).
- `tmp/`: scripts experimentals o auxiliars (p. ex. `createTestCaseScript.js` per provar creació de test cases).

## Tools disponibles

Les principals tools registrades al servidor són:

- `getProjects`, `getIterations`, `getUsers`, `getUserStories`, `getTasks`, `getDefects`: consultes bàsiques d'artefactes.
- `createUserStory`, `createDefect`, `createTestCase`, `createUserStoryTasks`, `updateTask`: operacions de creació/actualització.
- `getTestCases`, `getTestCaseSteps`, `getTestFolders`: recursos relacionats amb QA.
- `getTypeDefinition`, `getCurrentDate`: utilitats complementàries.

La definició exacta de paràmetres i la sortida estructurada es troba a cada fitxer dins `src/tools/`.

## Funcionalitats destacades

- Registre automàtic de recursos MCP (`rallyData`, `defaultProject`) per consultar l'estat intern de la sessió.
- Mecanisme de logging dinàmic segons el nivell demanat pel client.
- Obtenció prèvia del projecte per defecte i de l'usuari actual per optimitzar peticions posteriors.
- Neteja opcional d'HTML en les descripcions dels test cases a través de la variable `STRIP_HTML_TESTCASE_DESCRIPTION`.

## Scripts auxiliars

Al directori `tmp/` hi ha un script demostratiu (`createTestCaseScript.js`) que reprodueix lògiques de la tool `createTestCase`. Es pot utilitzar per proves locals executant:

```bash
cd tmp
node createTestCaseScript.js
```

## Testing

Abans d'executar els tests, assegura't que el fitxer `.env` estigui configurat correctament:

```bash
# Executar tots els tests
npm test

# Executar tests en mode watch
npm run test:watch

# Executar tests amb cobertura
npm run test:coverage

# Executar tests per CI (exclou tests d'integració)
npm run test:ci
```

Els tests carreguen automàticament les variables d'entorn des del fitxer `.env` abans d'executar-se.

### Configuració per GitHub Actions

Per executar els tests a GitHub Actions, configura les següents variables i secrets al repositori:

**Secrets** (Settings → Secrets and variables → Actions → Secrets):
- `RALLY_APIKEY`: La teva clau API de Rally

**Variables** (Settings → Secrets and variables → Actions → Variables):
- `RALLY_INSTANCE`: URL de la instància de Rally (ex: `https://eu1.rallydev.com`)
- `RALLY_PROJECT_NAME`: Nom del projecte per defecte
- `STRIP_HTML_TESTCASE_DESCRIPTION`: `true` o `false` per activar la neteja d'HTML

Els workflows de CI i publicació ja estan configurats per utilitzar aquestes variables automàticament.

## Desenvolupament

- Utilitza `npm start` durant el desenvolupament; el servidor quedarà escoltant per STDIO.
- Es recomana seguir l'estil de codi existent (ES Modules, async/await, validació amb Zod).
- L'script `npm run lint` està pendent de migrar a la nova configuració d'ESLint v9; cal afegir `eslint.config.js` abans de poder executar-lo.

## Issues coneguts

- Les respostes de certes tools poden contenir molta informació; utilitza filtres (`query`) per limitar el volum retornat.
- El filtratge de test cases només accepta camps específics (`Iteration`, `Project`, `Owner`, `State`, `TestFolder`).

## Troubleshooting

### Error: Cannot find module 'index.js'

Aquest error apareix quan el client MCP intenta executar el servidor amb una ruta absoluta incorrecta. Assegura't de:

1. Instal·lar el paquet globalment: `npm install -g ibm-rally-context`
2. Utilitzar la comanda `ibm-rally-context` a la configuració del client MCP, NO una ruta absoluta
3. Verificar que la comanda està disponible: `which ibm-rally-context` (macOS/Linux) o `where ibm-rally-context` (Windows)

**Exemple de configuració incorrecta**:
```json
{
  "mcpServers": {
    "ibm-rally-context": {
      "command": "node /Users/username/Documents/project/ibm-rally-mcp/index.js"  // ❌ MAL
    }
  }
}
```

**Exemple de configuració correcta**:
```json
{
  "mcpServers": {
    "ibm-rally-context": {
      "command": "ibm-rally-context"  // ✅ BÉ
    }
  }
}
```

### El servidor no inicia o dona errors de connexió

1. Verifica que les variables d'entorn estan configurades correctament al fitxer de configuració del client MCP
2. Comprova que la teva `RALLY_APIKEY` és vàlida
3. Assegura't que `RALLY_PROJECT_NAME` coincideix exactament amb el nom del projecte a Rally
4. Revisa els logs del client MCP per veure errors específics

### Error: SELF_SIGNED_CERT_IN_CHAIN - self-signed certificate in certificate chain

Aquest error apareix quan el servidor Rally presenta un certificat SSL autofirmat o no reconegut per la cadena de confiança del client Node.js.

**¿Per què ocorre?**
- Entorn sandbox amb certificat autofirmat o intern
- Proxy corporatiu que intercepta i firma connexions HTTPS
- Configuració de xarxa que requereix certificats corporatius
- Certificats del sistema operatiu desactualitzats o incomplets

**Solucions:**

#### 1. Per entorns de desenvolupament (recomanat)

Afegeix la variable d'entorn `RALLY_SSL_VERIFY=false` a la configuració del client MCP:

```json
{
  "mcpServers": {
    "ibm-rally-context": {
      "command": "ibm-rally-context",
      "env": {
        "RALLY_INSTANCE": "https://eu1.rallydev.com",
        "RALLY_APIKEY": "pat-xxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "RALLY_PROJECT_NAME": "Nom del projecte per defecte",
        "RALLY_SSL_VERIFY": "false"
      }
    }
  }
}
```

⚠️ **ADVERTÈNCIA**: Només utilitza `RALLY_SSL_VERIFY=false` en entorns de desenvolupament o testing. Mai en producció!

#### 2. Per entorns de producció (recomanat)

Instal·la els certificats corporatius al sistema operatiu:

**macOS:**
```bash
# Importa el certificat al Keychain
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain certificat.crt
```

**Linux:**
```bash
# Copia el certificat al directori de certificats
sudo cp certificat.crt /usr/local/share/ca-certificates/
sudo update-ca-certificates
```

**Windows:**
```powershell
# Importa el certificat al magatzem de certificats de confiança
Import-Certificate -FilePath "certificat.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

#### 3. Alternatives

- Usa la interfície web de Rally directament (Setup → Developer Console)
- Contacta amb l'equip de IT per obtenir els certificats corporatius necessaris
- Verifica que tens la versió més recent de Node.js amb certificats actualitzats


## Notas sobre filtres

- **ObjectID**: Quan filtres per `ObjectID` a `getDefects` o altres tools, el valor es converteix automàticament de string a número per garantir la compatibilitat amb l'API de Rally. Això assegura que el filtratge exacte funcioni correctament.

## Llicència

Projecte d'ús intern. Afegeix-hi la llicència corresponent segons les necessitats de la teva organització.
