# Robert - VS Code Extension

Una extensió de VS Code que demostra múltiples contextos de visualització i inclou un sistema complet de gestió d'errors.

## Característiques

### Visualitzacions Múltiples
- **Activity Bar**: Vista lateral integrada
- **Editor Tab**: Editor personalitzat
- **Separate Window**: Panell independent

### Sistema de Gestió d'Errors
L'extensió inclou un sistema robust de gestió d'errors que captura i registra tots els errors al canal Output "Robert":

#### ErrorHandler
- **Captura global d'errors**: Errors no capturats, excepcions i rejections de promeses
- **Logging estructurat**: Errors, warnings i missatges informatius amb timestamps
- **Context detallat**: Cada error inclou informació sobre on va ocórrer
- **Stack traces**: Informació completa per debugging

#### Funcions de Gestió d'Errors
- `handleError()`: Gestiona i registra errors
- `logWarning()`: Registra warnings
- `logInfo()`: Registra missatges informatius
- `executeWithErrorHandling()`: Executa funcions amb gestió automàtica d'errors
- `executeWithErrorHandlingSync()`: Versió síncrona

## Comandes Disponibles

- `robert.helloWorld`: Missatge de salutació
- `robert.openView`: Obre la vista lateral
- `robert.showOutput`: Mostra el canal Output
- `robert.showPanelIfHidden`: Mostra el panell si està ocult

## Com Provar el Sistema d'Errors

1. **Obre el canal Output**: `Ctrl+Shift+P` → "Robert: Show Robert Output"
2. **Executa qualsevol comanda** de l'extensió
3. **Observa els logs** al canal Output amb format detallat

### Exemple d'Output d'Error
```
[Robert] ❌ ERROR in robert.helloWorld command:
[Robert] Time: 2024-01-15T10:30:45.123Z
[Robert] Message: Test error: This is a simulated error for testing purposes
[Robert] Stack Trace:
[Robert] Error: Test error: This is a simulated error for testing purposes
[Robert]     at Object.executeWithErrorHandlingSync (ErrorHandler.ts:...)
[Robert] ---
```

### Exemple d'Output d'Info
```
[Robert] ℹ️ INFO in Extension Activation:
[Robert] Time: 2024-01-15T10:30:45.123Z
[Robert] Message: Extension activated successfully
[Robert] ---
```

## Estructura del Projecte

```
src/
├── extension.ts              # Punt d'entrada principal
├── RobertWebviewProvider.ts  # Proveïdor de webviews
└── ErrorHandler.ts           # Sistema de gestió d'errors
```

## Desenvolupament

```bash
# Compilar
npm run compile

# Compilar en mode watch
npm run watch

# Linting i formatatge
npm run lint
```

## Tecnologies

- TypeScript
- VS Code Extension API
- Webview API
- Custom Text Editor API

## Característiques del Sistema d'Errors

### Captura Automàtica
- **Errors no capturats**: Tots els errors que no es capturen amb try-catch
- **Promise rejections**: Errors en promeses no gestionades
- **Excepcions**: Errors de runtime i excepcions

### Logging Estructurat
- **Timestamps**: Cada entrada inclou data i hora exacta
- **Context**: Informació sobre on va ocórrer l'error
- **Stack traces**: Informació completa per debugging
- **Tipus d'entrada**: Errors (❌), Warnings (⚠️), Info (ℹ️)

### Integració amb VS Code
- **Canal Output dedicat**: Tots els logs es mostren al canal "Robert"
- **Notificacions**: Errors crítics es mostren com a notificacions
- **Debugging**: Informació completa per desenvolupadors
