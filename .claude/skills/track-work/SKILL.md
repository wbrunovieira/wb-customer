---
name: track-work
description: Rastreia todo o trabalho deste repo como issues no WB Project Manager (projeto "WB Customer Admin"). Use antes de planejar ou iniciar qualquer trabalho não-trivial, ao descobrir um bug/melhoria/débito técnico, e ao concluir uma tarefa — traz o projectId, os status IDs, a localização da API key e o CLI pm.sh (list/new/start/done/ms/bulk).
---

# Track work — WB Project Manager

O board é a fonte da verdade do que está sendo feito no **wb-customer**. Toda feature,
correção, melhoria ou débito técnico vira uma issue, agrupada no milestone da fase.

**O board já tem issue: LISTE antes de criar.** Duplicar é o erro mais comum.

## Coordenadas

| O quê | Valor |
|---|---|
| Base | `https://projects.wbdigitalsolutions.com` |
| API key | `~/.wb-project-manager-api-key` (arquivo, 0600 — nunca ecoe o conteúdo) |
| Workspace | `cmge96f200001wa7ouziczg0w` |
| Projeto "WB Customer Admin" | `cmor7l5c1000bpa017kplrgct` |
| Doc das rotas | `/api/docs` (Swagger UI) · `/api/openapi` (JSON cru) |

### Status IDs

| Nome | ID | TYPE |
|---|---|---|
| Backlog | `cmge9i3pt0005walququqw1rx` | `BACKLOG` |
| Todo | `cmge9i3pv0007walqv7is970v` | `TODO` |
| In Progress | `cmge9i3pv0009walqbwhmule6` | `IN_PROGRESS` |
| Done | `cmge9i3pw000bwalqn1glwrn4` | `DONE` |
| Canceled | `cmge9i3pw000dwalqi5qgpguo` | `CANCELED` |

Enums: `type` = `FEATURE|MAINTENANCE|BUG|IMPROVEMENT` · `priority` = `URGENT|HIGH|MEDIUM|LOW|NO_PRIORITY`

## CLI — `pm.sh`

Fica em `.claude/skills/track-work/pm.sh` (relativo à raiz do repo). Requer `curl` e `jq`.
Aceita a issue como `#216`, `216` ou o cuid — ele resolve o número para o cuid sozinho.

```bash
PM=.claude/skills/track-work/pm.sh

$PM check                       # valida key + API + IDs (rode isto primeiro se algo falhar)
$PM list                        # issues do projeto
$PM list --status in_progress   # filtra por estado
$PM list --milestone <id>
$PM list --all                  # workspace inteiro, não só este projeto
$PM show 216

$PM new "Publicar posts no Instagram" --desc "..." --type FEATURE --priority HIGH --milestone <id>
$PM start 216                   # → In Progress
$PM done 216                    # → Done (dispara as métricas de SLA no servidor)
$PM status 216 canceled
$PM edit 216 --priority HIGH --milestone <id>   # --milestone null desvincula
$PM rm 216                      # deleta de vez, sem undo

$PM ms list
$PM ms create "Fase 12 — Instagram" --target 2026-10-15
$PM ms show <id>

$PM bulk issues.json            # array JSON; injeta workspace/project/status e fatia de 100 em 100
```

Formato do arquivo do `bulk` — só `title` é obrigatório; `projectId`, `statusId` (Todo) e
`type` (FEATURE) entram como default e qualquer campo do item sobrescreve:

```json
[
  {"title": "Criar entidade InstagramPost", "type": "FEATURE", "priority": "HIGH", "milestoneId": "..."},
  {"title": "Cron de métricas de engajamento", "description": "..."}
]
```

## Rotina esperada

1. **Planejar** → `pm.sh ms create "<fase>" --target <data>`, depois uma issue por ação com `--milestone <id>`
2. **Começar** → `pm.sh start <id>`
3. **Concluir** → `pm.sh done <id>`
4. **Descartar** → `pm.sh status <id> canceled`

Ao trazer um documento de plano para o board: um milestone por fase, uma issue por ação,
status refletindo o estado **real** — o que já está pronto vai direto para `Done`. Daí em
diante o board é a fonte da verdade e o documento vira histórico.

## Comandos crus (o que o pm.sh não cobre)

```bash
KEY=$(cat ~/.wb-project-manager-api-key)
BASE=https://projects.wbdigitalsolutions.com

# Lote — até 100 por request
curl -s -X POST "$BASE/api/issues/bulk" -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"workspaceId":"cmge96f200001wa7ouziczg0w","issues":[
        {"title":"...","description":"...","projectId":"cmor7l5c1000bpa017kplrgct","statusId":"cmge9i3pv0007walqv7is970v","type":"FEATURE","priority":"HIGH"}
      ]}'
```

Outras rotas úteis: `/api/features`, `/api/labels`, `/api/time-entries` (timers),
`/api/issues/reorder`, `/api/projects`. Contrato completo em `/api/openapi`.

## Gotchas

- **`status` vs `statusId`**: no GET o filtro é `status=<TYPE>` (ex.: `status=IN_PROGRESS`);
  no POST/PATCH é `statusId=<cuid>`. São coisas diferentes.
- **`workspaceId` no corpo**: obrigatório ao criar issue no `POST /api/issues` — vai no
  CORPO, não só no bulk. Sem ele = `400 Invalid input`. Obrigatórios: `title`,
  `workspaceId`, `statusId`.
- **O bulk descarta `milestoneId`** (bug do servidor, verificado em 07/09/2026): o schema
  `BulkIssueItem` declara o campo, mas ele não é persistido — `projectId` e `statusId` entram,
  o milestone não. Depois do `bulk`, vincule com `PATCH /api/issues/{id}` (o `pm.sh bulk` NÃO
  faz isso sozinho). Um `pm.sh list` logo após o bulk mostra tudo sem milestone.
- **A listagem não expande `milestone`**: `GET /api/issues` devolve só `milestoneId`; o objeto
  `.milestone` não vem. Para exibir o nome, cruze com `GET /api/milestones?projectId=...`
  (é o que o `pm.sh list` faz).
- **`type` não é editável**: `IssueCreate` aceita `type`, mas `IssueUpdate` não. Definiu
  errado na criação? Só recriando.
- **Milestone** exige `name` + `projectId`; `targetDate`/`startDate` são opcionais, em ISO 8601.
  `milestoneId`/`assigneeId` aceitam `null` para limpar. Bulk máx 100.
- **401** → key errada. Não parseie o corpo do 401, confie no status.
- **Use `curl`, não `urllib`/`requests`**: um WAF barra o user-agent padrão do Python com
  **403 mesmo com a key correta**. 403 aí é bloqueio de UA, não permissão. Se precisar de
  Python, monte o JSON com Python e faça a chamada com curl.
- **Comando que "não fez nada"**: quase sempre é prompt de permissão do Bash negado na
  sessão (o curl nem rodou), não erro da API. Confirme com `-w "\nHTTP %{http_code}\n"`.
- **`identifier` é sequencial por workspace**, não por projeto — os números pulam (o board
  tem 1400+ issues de 20+ projetos). Nunca presuma que #N pertence a este projeto.
