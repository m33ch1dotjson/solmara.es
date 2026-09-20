#!/usr/bin/env bash
# Sets the password for the app_server role and writes the matching connection
# string into .env.local.
#
# Kept out of the migration because migrations live in git and passwords do not.
# Run it once after 0001_rls, and again whenever the password needs rotating.
set -euo pipefail

cd "$(dirname "$0")/.."
set -a; . ./.env.local; set +a

: "${DATABASE_URL:?DATABASE_URL must be set (the postgres superuser connection)}"

PASS="$(head -c 32 /dev/urandom | base64 | tr -d '/+=' | head -c 32)"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "ALTER ROLE app_server WITH LOGIN NOBYPASSRLS PASSWORD '${PASS}';" >/dev/null

# Same host and port as the admin connection, different user.
#
# The pooler routes on the username, so the project ref has to be appended to the
# role name: app_server.<ref>, exactly as the admin user is postgres.<ref>. Without
# it the pooler refuses the connection with "no tenant identifier provided", which
# reads like an auth problem and is not.
HOST_PART="${DATABASE_URL#*@}"
ADMIN_USER="${DATABASE_URL#postgresql://}"
ADMIN_USER="${ADMIN_USER%%:*}"
PROJECT_REF="${ADMIN_USER#*.}"
APP_URL="postgresql://app_server.${PROJECT_REF}:${PASS}@${HOST_PART}"

if grep -q '^APP_DATABASE_URL=' .env.local; then
  sed -i "s#^APP_DATABASE_URL=.*#APP_DATABASE_URL=${APP_URL}#" .env.local
else
  printf '\n# The role the application uses. Cannot bypass RLS.\nAPP_DATABASE_URL=%s\n' "$APP_URL" >> .env.local
fi

echo "app_server password set and APP_DATABASE_URL written to .env.local"
