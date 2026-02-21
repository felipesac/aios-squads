# CLAUDE.md - AIOS Squads

Este arquivo fornece orientação ao Claude Code ao trabalhar com aios-squads.

---

## O que é AIOS Squads?

**AIOS Squads** são equipes pré-configuradas de agentes IA especializados que trabalham juntos em domínios específicos. Cada squad é um pacote de agentes, workflows e contexto pronto para uso.

- **creator-squad**: Criação de conteúdo, escrita criativa
- **etl-squad**: Extração, transformação e carga de dados
- **finhealth-squad**: Gestão financeira hospitalar e saúde

Squads podem ser usados standalone ou integrados ao aios-core.

---

## Stack

| Componente | Tecnologia |
|-----------|-----------|
| **Package Manager** | npm v9+ |
| **Node.js** | >=18.0.0 |
| **Monorepo** | npm workspaces |
| **Linting** | ESLint v9 |
| **Framework** | Modular (aios-core peer dependency) |

---

## Estrutura do Projeto

```
aios-squads/
├── packages/
│   ├── creator-squad/      # Squad para criação de conteúdo
│   ├── etl-squad/          # Squad para ETL/automação
│   ├── etl/                # ETL core utilities
│   └── finhealth-squad/    # Squad para saúde financeira
├── package.json            # Monorepo root
└── README.md
```

Cada squad em `packages/*/`:
```
{squad-name}/
├── src/
│   ├── agents/             # Definições de agentes
│   ├── workflows/          # Workflows do squad
│   ├── prompts/            # System prompts
│   └── index.ts            # Exports
├── package.json
├── tsconfig.json
└── README.md
```

---

## Instalação & Setup

```bash
# Install dependencies (all workspaces)
npm install

# Verify installation
npm run lint
```

---

## Comandos Comuns

```bash
# Build all packages
npm run build --workspaces

# Development (watch mode)
npm run dev --workspaces

# Run tests
npm run test --workspaces --if-present

# Lint all
npm run lint

# Type checking (if available)
npm run typecheck --workspaces --if-present

# Clean build artifacts
npm run clean --workspaces
```

### Running Individual Squad

```bash
# Build specific squad
npm --workspace=@aios-squads/creator-squad run build

# Test specific squad
npm --workspace=@aios-squads/etl-squad test

# Watch specific squad
npm --workspace=@aios-squads/finhealth-squad run dev
```

---

## Padrões de Desenvolvimento

### Agents
Cada agente tem escopo definido:

```typescript
// src/agents/my-agent.ts
export const myAgent = {
  id: 'my-agent',
  name: 'My Agent',
  role: 'Descrição do papel',
  systemPrompt: `You are...`,
  tools: ['tool1', 'tool2'],
  capabilities: ['capability1'],
}
```

### Workflows
Workflows orquestram múltiplos agentes:

```typescript
// src/workflows/my-workflow.ts
export async function runMyWorkflow(input: WorkflowInput) {
  // Coordenar agentes
  // Processar resultado
  // Retornar output
}
```

### Prompts
System prompts em `src/prompts/`:

```
{squad-name}/
├── system-prompts/
│   ├── analyst.md
│   ├── executor.md
│   └── validator.md
```

---

## Compartilhando Código Entre Squads

Extraia código comum para pacotes:

```bash
# Criar pacote compartilhado
mkdir packages/shared-{feature}
npm init -w packages/shared-{feature}

# Usa em outro squad
npm install --workspace=@aios-squads/creator-squad @aios-squads/shared-feature
```

---

## Integração com aios-core

Squads são peer dependencies de aios-core:

```json
{
  "peerDependencies": {
    "@aios-fullstack/core": ">=2.0.0"
  }
}
```

Para usar squad no aios-core:

```bash
# Instalar squad
npm install --save-dev @aios-squads/creator-squad

# Usar no agent
import { creatorSquad } from '@aios-squads/creator-squad'
```

---

## Adicionar Novo Squad

1. **Create directory:**
```bash
mkdir packages/my-new-squad
cd packages/my-new-squad
npm init -y
```

2. **Setup structure:**
```bash
mkdir -p src/{agents,workflows,prompts}
touch src/index.ts
```

3. **Create package.json:**
```json
{
  "name": "@aios-squads/my-new-squad",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest"
  }
}
```

4. **Add to root workspaces:**
Root `package.json` already has `"packages/*"` glob, so auto-included.

5. **Test it:**
```bash
npm run build --workspaces
```

---

## Testes

Cada squad deve ter testes unitários:

```bash
# Run all tests
npm run test --workspaces --if-present

# Test specific squad
npm --workspace=@aios-squads/creator-squad test

# With coverage
npm --workspace=@aios-squads/creator-squad test -- --coverage
```

---

## Versionamento & Release

AIOS Squads usa `@changesets/cli` para versionamento coordenado.

```bash
# Add changeset
npm run changeset

# Generate new versions
npm run version

# Publish (CI only)
npm publish
```

---

## Debugging

### Enable Debug Logs
```bash
export DEBUG=@aios-squads:*
npm run dev --workspace=@aios-squads/creator-squad
```

### Common Issues

**Workspace not found:**
```bash
npm install -w ./packages/*/
```

**Type errors:**
```bash
npm run build  # Full rebuild
```

**Node modules corrupted:**
```bash
rm -rf node_modules
npm install
```

---

## Publicação

Squads são publicados no npm como `@aios-squads/*`:

```bash
# View current versions
npm view @aios-squads/creator-squad versions

# Install specific version
npm install @aios-squads/creator-squad@1.0.0
```

---

## Referências

- **aios-core**: https://github.com/SynkraAI/aios-core
- **aios-squads repo**: https://github.com/SynkraAI/aios-squads
- **Discussions**: https://github.com/SynkraAI/aios-core/discussions
- **Discord**: https://discord.gg/gk8jAdXWmj

---

*AIOS Squads v2.1.0 - Team AI Agents*
