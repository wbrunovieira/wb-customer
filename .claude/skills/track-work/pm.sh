#!/usr/bin/env bash
# pm.sh — CLI do WB Project Manager para o projeto "WB Customer Admin".
# Requer: curl, jq. Doc das rotas: https://projects.wbdigitalsolutions.com/api/docs
set -euo pipefail

BASE="${WB_PM_BASE:-https://projects.wbdigitalsolutions.com}"
KEY_FILE="${WB_PM_KEY_FILE:-$HOME/.wb-project-manager-api-key}"
WORKSPACE="${WB_PM_WORKSPACE:-cmge96f200001wa7ouziczg0w}"
PROJECT="${WB_PM_PROJECT:-cmor7l5c1000bpa017kplrgct}"

ST_BACKLOG=cmge9i3pt0005walququqw1rx
ST_TODO=cmge9i3pv0007walqv7is970v
ST_IN_PROGRESS=cmge9i3pv0009walqbwhmule6
ST_DONE=cmge9i3pw000bwalqn1glwrn4
ST_CANCELED=cmge9i3pw000dwalqi5qgpguo

die() { printf 'pm: %s\n' "$*" >&2; exit 1; }

command -v jq  >/dev/null || die "jq não encontrado (brew install jq)"
command -v curl >/dev/null || die "curl não encontrado"
[[ -f $KEY_FILE ]] || die "API key não encontrada em $KEY_FILE"
KEY=$(tr -d '\n' < "$KEY_FILE")
[[ -n $KEY ]] || die "API key vazia em $KEY_FILE"

# api <METHOD> <path> [json-body]
api() {
  local method=$1 path=$2 body=${3:-} tmp code
  tmp=$(mktemp)
  if [[ -n $body ]]; then
    code=$(curl -sS --max-time 45 -o "$tmp" -w '%{http_code}' -X "$method" "$BASE$path" \
      -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' -d "$body")
  else
    code=$(curl -sS --max-time 45 -o "$tmp" -w '%{http_code}' -X "$method" "$BASE$path" \
      -H "Authorization: Bearer $KEY")
  fi
  if (( code >= 400 )); then
    printf 'pm: HTTP %s em %s %s\n' "$code" "$method" "$path" >&2
    case $code in
      401) printf '  API key inválida ou expirada (%s).\n' "$KEY_FILE" >&2 ;;
      403) printf '  403 aqui costuma ser bloqueio de WAF por user-agent, não permissão. Use curl.\n' >&2 ;;
      *)   head -c 600 "$tmp" >&2; printf '\n' >&2 ;;
    esac
    rm -f "$tmp"; return 1
  fi
  cat "$tmp"; rm -f "$tmp"
}

# a lista da API volta como array cru; normaliza qualquer envelope
ARR='if type=="array" then . else (.data // .issues // .milestones // .projects // []) end'

status_id() {
  case "$(printf '%s' "${1:-}" | tr '[:upper:]-' '[:lower:]_')" in
    backlog)                 printf '%s' "$ST_BACKLOG" ;;
    todo|to_do)              printf '%s' "$ST_TODO" ;;
    in_progress|doing|start) printf '%s' "$ST_IN_PROGRESS" ;;
    done|concluido|concluído) printf '%s' "$ST_DONE" ;;
    canceled|cancelled|cancelado) printf '%s' "$ST_CANCELED" ;;
    *) die "status inválido: '${1:-}' (backlog|todo|in_progress|done|canceled)" ;;
  esac
}

# aceita "#216", "216" ou o cuid direto
resolve_issue() {
  local ref=${1:-}; ref=${ref#\#}
  [[ -n $ref ]] || die "informe a issue (#216 ou o cuid)"
  if [[ $ref =~ ^[0-9]+$ ]]; then
    local id
    id=$(api GET "/api/issues?workspaceId=$WORKSPACE" \
      | jq -r --arg n "$ref" "($ARR)[] | select((.identifier|tostring)==\$n) | .id" | head -1)
    [[ -n $id ]] || die "issue #$ref não encontrada no workspace"
    printf '%s' "$id"
  else
    printf '%s' "$ref"
  fi
}

iso_date() {
  local d=${1:-}
  [[ -n $d ]] || return 0
  [[ $d == *T* ]] && { printf '%s' "$d"; return 0; }
  [[ $d =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || die "data inválida: '$d' (use AAAA-MM-DD ou ISO 8601)"
  printf '%sT00:00:00.000Z' "$d"
}

print_issues() {
  jq -r "($ARR)[] | [
      \"#\" + (.identifier|tostring),
      (.status.name // .status.type // \"?\"),
      (.type // \"-\"),
      (.priority // \"-\"),
      (.milestone.name // \"-\"),
      .title
    ] | @tsv" \
  | awk -F'\t' 'BEGIN{printf "%-6s %-12s %-12s %-12s %-22s %s\n","ID","STATUS","TIPO","PRIORIDADE","MILESTONE","TÍTULO"}
                {m=$5; if(length(m)>21) m=substr(m,1,20)"…"; printf "%-6s %-12s %-12s %-12s %-22s %s\n",$1,$2,$3,$4,m,$6}'
}

usage() {
  cat <<'USAGE'
pm.sh — WB Project Manager (projeto: WB Customer Admin)

Issues
  pm.sh list [--status todo|in_progress|...] [--milestone <id>] [--all]
  pm.sh show <#id|cuid>
  pm.sh new "<título>" [--desc <texto>] [--type FEATURE|BUG|IMPROVEMENT|MAINTENANCE]
                       [--priority URGENT|HIGH|MEDIUM|LOW|NO_PRIORITY]
                       [--status backlog|todo|...] [--milestone <id>]
  pm.sh start  <#id>              # → In Progress
  pm.sh done   <#id>              # → Done (dispara métricas de SLA no servidor)
  pm.sh status <#id> <estado>     # backlog|todo|in_progress|done|canceled
  pm.sh edit   <#id> [--title T] [--desc D] [--priority P] [--status S] [--milestone <id>|null]
  pm.sh rm     <#id>              # deleta de vez (sem undo)

Milestones
  pm.sh ms list
  pm.sh ms show <id>
  pm.sh ms create "<nome>" [--target AAAA-MM-DD] [--start AAAA-MM-DD] [--desc <texto>]

Lote
  pm.sh bulk <arquivo.json>       # array JSON de issues; injeta workspace/project/status
                                  # e fatia de 100 em 100 automaticamente

Diagnóstico
  pm.sh check                     # valida key, API e IDs configurados

Env: WB_PM_BASE, WB_PM_KEY_FILE, WB_PM_WORKSPACE, WB_PM_PROJECT
USAGE
}

cmd_list() {
  local qs="workspaceId=$WORKSPACE&projectId=$PROJECT" ms=""
  while (( $# )); do
    case $1 in
      --status) qs+="&status=$(printf '%s' "$2" | tr '[:lower:]-' '[:upper:]_')"; shift 2 ;;
      --milestone) ms=$2; shift 2 ;;
      --all) qs="workspaceId=$WORKSPACE"; shift ;;
      *) die "flag desconhecida em list: $1" ;;
    esac
  done
  local out; out=$(api GET "/api/issues?$qs")
  [[ -n $ms ]] && out=$(printf '%s' "$out" | jq --arg m "$ms" "[($ARR)[] | select(.milestoneId==\$m)]")
  # a listagem devolve só milestoneId (sem expandir a relação) — resolve o nome aqui
  local msmap; msmap=$(api GET "/api/milestones?projectId=$PROJECT" \
    | jq -c "($ARR) | map({key:.id, value:.name}) | from_entries")
  out=$(printf '%s' "$out" | jq --argjson m "$msmap" "[($ARR)[] | . + {milestone: {name: (if .milestoneId then \$m[.milestoneId] else null end)}}]")
  local n; n=$(printf '%s' "$out" | jq "($ARR) | length")
  printf '%s' "$out" | print_issues
  printf '\n%s issue(s).\n' "$n"
}

cmd_show() {
  local id; id=$(resolve_issue "${1:-}")
  api GET "/api/issues/$id" | jq '{identifier, title, type, priority, status: (.status.name // .status.type),
    milestone: (.milestone.name // null), description, createdAt, updatedAt, resolvedAt, resolutionTimeMinutes, id}'
}

cmd_new() {
  local title=${1:-}; shift || true
  [[ -n $title ]] || die 'uso: pm.sh new "<título>" [flags]'
  local desc="" type="FEATURE" prio="" st milestone=""
  st=$(status_id todo)
  while (( $# )); do
    case $1 in
      --desc) desc=$2; shift 2 ;;
      --type) type=$(printf '%s' "$2" | tr '[:lower:]' '[:upper:]'); shift 2 ;;
      --priority) prio=$(printf '%s' "$2" | tr '[:lower:]-' '[:upper:]_'); shift 2 ;;
      --status) st=$(status_id "$2"); shift 2 ;;
      --milestone) milestone=$2; shift 2 ;;
      *) die "flag desconhecida em new: $1" ;;
    esac
  done
  local body
  body=$(jq -nc --arg t "$title" --arg ws "$WORKSPACE" --arg st "$st" --arg pj "$PROJECT" \
    --arg d "$desc" --arg ty "$type" --arg p "$prio" --arg m "$milestone" '
    {title:$t, workspaceId:$ws, statusId:$st, projectId:$pj, type:$ty}
    + (if $d=="" then {} else {description:$d} end)
    + (if $p=="" then {} else {priority:$p} end)
    + (if $m=="" then {} else {milestoneId:$m} end)')
  api POST /api/issues "$body" | jq -r '"criada #\(.identifier)  \(.title)  [\(.id)]"'
}

cmd_patch_status() {
  local id; id=$(resolve_issue "${1:-}")
  local body; body=$(jq -nc --arg s "$2" '{statusId:$s}')
  api PATCH "/api/issues/$id" "$body" \
    | jq -r '"#\(.identifier) → \(.status.name // .status.type)\(if .resolutionTimeMinutes then "  (resolvida em \(.resolutionTimeMinutes) min)" else "" end)"'
}

cmd_edit() {
  local id; id=$(resolve_issue "${1:-}"); shift
  local body='{}'
  while (( $# )); do
    case $1 in
      --title)     body=$(jq -c --arg v "$2" '. + {title:$v}' <<<"$body"); shift 2 ;;
      --desc)      body=$(jq -c --arg v "$2" '. + {description:$v}' <<<"$body"); shift 2 ;;
      --priority)  body=$(jq -c --arg v "$(printf '%s' "$2" | tr '[:lower:]-' '[:upper:]_')" '. + {priority:$v}' <<<"$body"); shift 2 ;;
      --milestone) if [[ $2 == null ]]; then body=$(jq -c '. + {milestoneId:null}' <<<"$body")
                   else body=$(jq -c --arg v "$2" '. + {milestoneId:$v}' <<<"$body"); fi; shift 2 ;;
      --status)    body=$(jq -c --arg v "$(status_id "$2")" '. + {statusId:$v}' <<<"$body"); shift 2 ;;
      *) die "flag desconhecida em edit: $1" ;;
    esac
  done
  [[ $body == '{}' ]] && die "nada para editar"
  api PATCH "/api/issues/$id" "$body" | jq -r '"#\(.identifier) atualizada: \(.title)"'
}

cmd_rm() {
  local id; id=$(resolve_issue "${1:-}")
  api DELETE "/api/issues/$id" >/dev/null && printf 'issue %s deletada.\n' "$id"
}

cmd_ms() {
  local sub=${1:-list}; shift || true
  case $sub in
    list)
      api GET "/api/milestones?projectId=$PROJECT" \
        | jq -r "($ARR)[] | [.name, (.targetDate // \"sem prazo\"), .id] | @tsv" \
        | awk -F'\t' 'BEGIN{printf "%-38s %-26s %s\n","MILESTONE","PRAZO","ID"} {printf "%-38s %-26s %s\n",$1,$2,$3}'
      ;;
    show)
      local id=${1:?uso: pm.sh ms show <id>}
      api GET "/api/milestones/$id" | jq '{name, targetDate, description, issues: [.issues[]? | {identifier, title, status: (.status.name // .status.type)}]}'
      ;;
    create)
      local name=${1:-}; shift || true
      [[ -n $name ]] || die 'uso: pm.sh ms create "<nome>" [--target AAAA-MM-DD]'
      local target="" start="" desc=""
      while (( $# )); do
        case $1 in
          --target) target=$(iso_date "$2"); shift 2 ;;
          --start)  start=$(iso_date "$2"); shift 2 ;;
          --desc)   desc=$2; shift 2 ;;
          *) die "flag desconhecida em ms create: $1" ;;
        esac
      done
      local body
      body=$(jq -nc --arg n "$name" --arg pj "$PROJECT" --arg t "$target" --arg s "$start" --arg d "$desc" '
        {name:$n, projectId:$pj}
        + (if $t=="" then {} else {targetDate:$t} end)
        + (if $s=="" then {} else {startDate:$s} end)
        + (if $d=="" then {} else {description:$d} end)')
      api POST /api/milestones "$body" | jq -r '"milestone criada: \(.name)  [\(.id)]"'
      ;;
    *) die "subcomando ms inválido: $sub (list|show|create)" ;;
  esac
}

cmd_bulk() {
  local file=${1:?uso: pm.sh bulk <arquivo.json>}
  [[ -f $file ]] || die "arquivo não encontrado: $file"
  jq -e 'type=="array"' "$file" >/dev/null || die "$file precisa ser um array JSON de issues"
  local total chunks st created=0
  total=$(jq 'length' "$file"); st=$(status_id todo)
  (( total )) || die "array vazio"
  chunks=$(( (total + 99) / 100 ))
  printf '%s issue(s) em %s lote(s)...\n' "$total" "$chunks"
  local i off body n
  for (( i=0; i<chunks; i++ )); do
    off=$(( i * 100 ))
    body=$(jq -c --arg ws "$WORKSPACE" --arg pj "$PROJECT" --arg st "$st" --argjson off "$off" '
      {workspaceId:$ws, issues: (.[$off:$off+100] | map({projectId:$pj, statusId:$st, type:"FEATURE"} + .))}' "$file")
    n=$(api POST /api/issues/bulk "$body" | jq "($ARR) | length")
    created=$(( created + n ))
    printf '  lote %s/%s: %s criada(s)\n' "$(( i + 1 ))" "$chunks" "$n"
  done
  printf 'total criado: %s\n' "$created"
}

cmd_check() {
  printf 'base:      %s\n' "$BASE"
  printf 'key:       %s (%s chars)\n' "$KEY_FILE" "${#KEY}"
  printf 'workspace: %s\n' "$WORKSPACE"
  printf 'project:   %s\n' "$PROJECT"
  api GET /api/health >/dev/null && printf 'health:    ok\n'
  local pname
  pname=$(api GET "/api/projects/$PROJECT" | jq -r '.name // "?"')
  printf 'projeto:   %s\n' "$pname"
  local n; n=$(api GET "/api/issues?workspaceId=$WORKSPACE&projectId=$PROJECT" | jq "($ARR)|length")
  printf 'issues:    %s no projeto\n' "$n"
}

case "${1:-}" in
  list)   shift; cmd_list "$@" ;;
  show)   shift; cmd_show "$@" ;;
  new)    shift; cmd_new "$@" ;;
  start)  shift; cmd_patch_status "${1:-}" "$ST_IN_PROGRESS" ;;
  done)   shift; cmd_patch_status "${1:-}" "$ST_DONE" ;;
  status) shift; cmd_patch_status "${1:-}" "$(status_id "${2:-}")" ;;
  edit)   shift; cmd_edit "$@" ;;
  rm)     shift; cmd_rm "$@" ;;
  ms)     shift; cmd_ms "$@" ;;
  bulk)   shift; cmd_bulk "$@" ;;
  check)  shift; cmd_check ;;
  ''|-h|--help|help) usage ;;
  *) die "comando desconhecido: $1 (rode 'pm.sh --help')" ;;
esac
