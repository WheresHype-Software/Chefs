#!/usr/bin/env bash
# chefs deploy watcher - polls the main branch of WheresHype-Software/Chefs and
# rebuilds the docker app, bumping VERSION on each deploy. Read-only: no token
# grant needed to deploy - every push/merge to main lands as a new version.
set -euo pipefail

exec 9>"/tmp/chefs-deploy.lock" || exit 0
if ! flock -n 9; then
  echo "[chefs] another deploy is in progress - skipping $(date -Is)"
  exit 0
fi

cd "$(dirname "$0")"
set -a; source ../proxy/.env; set +a
set -a; [ -f .env ] && source ./.env; set +a

SUDO=""
if ! docker info >/dev/null 2>&1; then SUDO="sudo"; fi

_notify_discord() {
  local title="$1" sha="$2"
  if [ -z "${DEPLOY_DISCORD_WEBHOOK:-}" ]; then
    echo "[chefs] DEPLOY_DISCORD_WEBHOOK not set - skipping Discord alert"
    return 0
  fi
  local msg="{\"content\":\"**${title}** - \`${sha:0:8}\` deployed\"}"
  curl -s -o /dev/null -w "discord HTTP %{http_code}\n" \
    -H "Content-Type: application/json" -d "${msg}" "${DEPLOY_DISCORD_WEBHOOK}" || \
    echo "[chefs] Discord notification failed"
}

REPO="https://github.com/WheresHype-Software/Chefs.git"
REMOTE="origin"
STATE=".deployed-sha"

MAIN_SHA=$(git ls-remote "${REPO}" refs/heads/main 2>/dev/null | awk '{print $1}')
if [ -z "${MAIN_SHA}" ]; then
  echo "[chefs] cannot read main from ${REPO} - nothing to do $(date -Is)"
  exit 0
fi

DEPLOYED=$(cat "${STATE}" 2>/dev/null || echo "")
if [ "${MAIN_SHA}" = "${DEPLOYED}" ]; then
  echo "[chefs] already at ${MAIN_SHA} - noop $(date -Is)"
  exit 0
fi

if ! git fetch "${REMOTE}" main; then
  _notify_discord "chefs deploy FAILED (git fetch error)" "${MAIN_SHA}"
  exit 1
fi

# SAFETY: never deploy a main that lacks the Docker infra. Resetting to it would
# wipe Dockerfile/compose from the working tree and the failure cleanup below
# would remove the live container. Wait until the infra commit is on main.
if ! git cat-file -e FETCH_HEAD:docker-compose.yml 2>/dev/null; then
  echo "[chefs] fetched main has no docker-compose.yml yet - waiting for infra on main $(date -Is)"
  exit 0
fi

# Bump the version number in .env (survives git reset - .env is untracked).
# Replaces VERSION= line in place; guarantees a trailing newline (avoid .env glue).
VER=$(( ${VERSION:-0} + 1 ))
if grep -q '^VERSION=' .env; then
  sed -i "s/^VERSION=.*/VERSION=${VER}/" .env
else
  printf 'VERSION=%s\n' "${VER}" >> .env
fi
. ./.env
echo "[chefs] new main ${MAIN_SHA} (was ${DEPLOYED:-none}) -> VERSION ${VER}"

git reset --hard FETCH_HEAD

# Rebuild + restart. The gitignored .env (untracked) survives the reset.
if ! $SUDO docker compose up -d --build; then
  $SUDO docker ps -aq --filter "name=chefs" | xargs -r $SUDO docker rm -f 2>/dev/null || true
  if ! $SUDO docker compose up -d --build; then
    _notify_discord "chefs deploy FAILED (docker build/up)" "${MAIN_SHA}"
    exit 1
  fi
fi

echo "${MAIN_SHA}" > "${STATE}"
echo "[chefs] deployed v${VER} ${MAIN_SHA} $(date -Is)"
_notify_discord "New deploy - chefs v${VER}" "${MAIN_SHA}"
