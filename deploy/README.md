# Deploy — WB Customer

VPS Contabo, **o mesmo servidor que hospeda o WB-crm**. Estrutura adaptada de
`WB-crm/deploy/ansible`, inclusive as decisões que lá custaram incidente.

## Topologia

| Peça | Onde | Porta |
|---|---|---|
| Frontend (Next) | PM2, `/opt/wb-customer/frontend` | 3010 |
| Backend (NestJS) | Docker, `docker-compose.prod.yml` | 3011 |
| Postgres | Docker, `/opt/wb-customer-db` | 5434 (só loopback) |
| nginx + certbot | host | 80/443 |

**As portas 3000, 3001 e 5433 são do WB-crm.** O preflight aborta se alguma delas
aparecer na configuração — o sintoma de uma colisão seria "o CRM caiu", difícil de
ligar a este deploy.

O backend responde sob `https://customer.wbdigitalsolutions.com/api/v1`, no mesmo
domínio do frontend. Não é escolha livre: o redirect URI já registrado no Google
Cloud Console assume esse caminho.

## Comandos

```bash
cd deploy/ansible

# Primeira subida (instala tudo)
ansible-playbook -i inventory/production.yml playbooks/deploy.yml --ask-vault-pass

# Dia a dia: só código
ansible-playbook -i inventory/production.yml playbooks/quick-deploy.yml --ask-vault-pass

# Código + migração de schema (backup → migrate → swap)
ansible-playbook -i inventory/production.yml playbooks/deploy-backend.yml --ask-vault-pass
```

## Segredos

`group_vars/vault.yml` entra no git **criptografado**:

```bash
cp group_vars/vault.yml.example group_vars/vault.yml
# preencher
ansible-vault encrypt group_vars/vault.yml
```

Gere segredos **novos**. Não reaproveite os do WB-crm: comprometer um projeto não
pode dar acesso ao outro.

## Antes da primeira subida

1. **DNS** — feito em 08/09/2026: registro A na Cloudflare apontando para o VPS,
   ainda **DNS-only**. Depois que o certificado for emitido, proxiar (laranja),
   porque o UFW só aceita 80/443 vindos da Cloudflare — sem proxy o site fica
   inalcançável de fora.
2. **Vault** preenchido e criptografado.
3. **Deploy key** de leitura no servidor, com o remote em SSH. O preflight testa
   isso com `git fetch --dry-run` e aborta com diagnóstico se o GitHub recusar.

Depois da subida, resta um passo manual: conectar o Google em `/admin/google`. O
token fica no banco e não migra do ambiente de desenvolvimento.

## Por que DNS-01 e não HTTP-01

Os outros 17 certificados deste servidor usam o autenticador `nginx` (HTTP-01),
mas nenhum domínio novo consegue emitir assim hoje:

- o UFW libera 80/443 **apenas para as faixas da Cloudflare**, então a Let's
  Encrypt não alcança a origem direto;
- pelo proxy também não fecha: a zona está com *Always Use HTTPS*, o caminho
  `/.well-known/acme-challenge/` leva 301 para HTTPS (verificado), e com SSL
  **strict** a Cloudflare exige um certificado válido na origem — que um domínio
  novo ainda não tem.

Renovação funciona porque o certificado já existe e a perna HTTPS fecha; os 17
foram emitidos antes do lockdown de julho. O `crm` renovou em 06/09/2026 sem
problema.

O DNS-01 contorna a rede inteira provando posse por registro TXT. O plugin
`python3-certbot-dns-cloudflare` já estava instalado no servidor e nunca tinha
sido usado.

## Por que `command` e não `raw`

O `raw` existe para hosts sem Python; este tem. O preço dele era um PTY em toda
tarefa: qualquer comando que peça input trava até o job morrer. No WB-crm isso
queimou os 30 minutos de timeout do CD num `git fetch` esperando senha, e o
GitHub Actions reportou apenas "cancelled". Daí também o bloco `environment:`
que desarma os prompts do git de uma vez, e o preflight que falha em ~15 segundos
dizendo exatamente o que está errado.
