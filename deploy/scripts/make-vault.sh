#!/usr/bin/env bash
# Monta e criptografa o vault de produção do wb-customer.
#
# Rode você mesmo, num TERMINAL DE VERDADE: nenhum segredo aqui deve passar por
# terceiros, e a senha do vault é a chave-mestra de todo o resto.
#
#   ./deploy/scripts/make-vault.sh
#
# Não funciona pelo prefixo `!` do Claude Code nem em pipe: os prompts precisam
# de terminal. Se preferir rodar sem prompt, aponte os arquivos:
#
#   CF_TOKEN_FILE=~/.cf_token_certbot VAULT_PASS_FILE=~/.wb-customer-vault-pass \
#     ./deploy/scripts/make-vault.sh
#
# O que ele faz:
#   - gera segredos NOVOS de infraestrutura (banco, JWT, admin, cron, API interna)
#   - reaproveita as credenciais de serviços externos do backend/.env, porque são
#     o MESMO app OAuth do Google e o MESMO System User da Meta; o redirect URI de
#     produção já está registrado no Google Cloud Console
#   - criptografa com ansible-vault
#
# Nada é impresso: no fim só existe o vault.yml criptografado.
set -euo pipefail

cd "$(dirname "$0")/../.."
ENV_FILE="backend/.env"
VAULT="deploy/ansible/group_vars/vault.yml"

command -v ansible-vault >/dev/null || { echo "❌ ansible-vault não encontrado"; exit 1; }
command -v openssl >/dev/null || { echo "❌ openssl não encontrado"; exit 1; }
[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE não encontrado"; exit 1; }
[ -f "$VAULT" ] && { echo "❌ $VAULT já existe. Apague antes se quiser regerar."; exit 1; }

gen() { openssl rand -base64 64 | tr -dc 'A-Za-z0-9' | head -c "${1:-40}"; }
from_env() { grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- | tr -d '"' || true; }

# ── Token da Cloudflare ───────────────────────────────────────────────────────
CF_TOKEN=""
if [ -n "${CF_TOKEN_FILE:-}" ]; then
  [ -f "$CF_TOKEN_FILE" ] || { echo "❌ CF_TOKEN_FILE aponta para arquivo inexistente: $CF_TOKEN_FILE"; exit 1; }
  CF_TOKEN=$(tr -d '\n' < "$CF_TOKEN_FILE")
elif [ -t 0 ]; then
  echo "Token da Cloudflare para o certbot (DNS-01)."
  echo "Recomendado: um token NOVO, restrito a DNS:Edit apenas na zona"
  echo "wbdigitalsolutions.com — o de ~/.cf_token também edita firewall e"
  echo "configurações da zona inteira, e vai ficar guardado no servidor."
  read -r -s -p "Token: " CF_TOKEN; echo
else
  cat >&2 <<'MSG'
❌ Sem terminal interativo, e nenhum CF_TOKEN_FILE informado.

Rode num terminal de verdade (Terminal, iTerm, aba do editor) — não pelo
prefixo `!` do Claude Code, que não abre TTY:

    ./deploy/scripts/make-vault.sh

Ou aponte os arquivos, para rodar sem prompt algum:

    printf '%s' 'SEU_TOKEN' > ~/.cf_token_certbot && chmod 600 ~/.cf_token_certbot
    openssl rand -base64 40 > ~/.wb-customer-vault-pass && chmod 600 ~/.wb-customer-vault-pass
    CF_TOKEN_FILE=~/.cf_token_certbot VAULT_PASS_FILE=~/.wb-customer-vault-pass \
      ./deploy/scripts/make-vault.sh
MSG
  exit 1
fi
[ -n "$CF_TOKEN" ] || { echo "❌ token vazio"; exit 1; }

# ── Vault ─────────────────────────────────────────────────────────────────────
umask 077
cat > "$VAULT" <<EOF
# Vault de PRODUÇÃO do wb-customer. Criptografado com ansible-vault.
#
# Segredos de infraestrutura são NOVOS, não reaproveitados do WB-crm:
# comprometer um projeto não pode dar acesso ao outro.

vault_db_password: "$(gen 32)"
vault_jwt_secret: "$(gen 64)"
vault_seed_admin_password: "$(gen 24)"

vault_google_client_id: "$(from_env GOOGLE_CLIENT_ID)"
vault_google_client_secret: "$(from_env GOOGLE_CLIENT_SECRET)"

vault_transcriptor_api_key: "$(from_env TRANSCRIPTOR_API_KEY)"
vault_meta_system_user_token: "$(from_env META_SYSTEM_USER_TOKEN)"

# WhatsApp ainda não configurado para este projeto — preencher quando for ligar.
vault_evolution_api_url: "https://evolution.wbdigitalsolutions.com"
vault_evolution_api_key: "NAO_CONFIGURADO"
vault_evolution_instance: "NAO_CONFIGURADO"

# Usado só pelo certbot, no desafio DNS-01.
vault_cloudflare_api_token: "$CF_TOKEN"

vault_cron_secret: "$(gen 40)"
vault_internal_api_key: "$(gen 40)"
EOF
unset CF_TOKEN

if [ -n "${VAULT_PASS_FILE:-}" ]; then
  [ -f "$VAULT_PASS_FILE" ] || { echo "❌ VAULT_PASS_FILE inexistente: $VAULT_PASS_FILE"; rm -f "$VAULT"; exit 1; }
  ansible-vault encrypt --vault-password-file "$VAULT_PASS_FILE" "$VAULT"
else
  echo
  echo "Agora escolha a senha do VAULT. É a chave-mestra — guarde num gerenciador"
  echo "de senhas. Sem ela nenhum deploy roda, e ela não tem recuperação."
  ansible-vault encrypt "$VAULT"
fi

echo
echo "✅ $VAULT criptografado."
head -c 30 "$VAULT"; echo "…"
echo
echo "Próximos passos:"
echo "  1. guarde a senha do vault no gerenciador de senhas"
echo "  2. git add $VAULT && git commit   (entra no repo JÁ criptografado)"
echo "  3. avise para rodar o deploy"
