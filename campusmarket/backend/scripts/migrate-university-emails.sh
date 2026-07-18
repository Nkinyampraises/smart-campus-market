#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
shared_dir="${DEPLOY_SHARED_DIR:-/srv/campustrade/shared}"
backup_dir="${DEPLOY_BACKUP_DIR:-/srv/campustrade/backups}"
migration_sql="$root_dir/backend/migrations/20260718_migrate_university_emails.sql"
test_container="${MIGRATION_TEST_CONTAINER:-}"
test_failure="${MIGRATION_TEST_FAIL_AT:-}"
test_mode=false

if [[ -n "$test_container" ]]; then
  [[ "${ALLOW_UNPRIVILEGED_TEST:-false}" == true ]] || {
    echo 'The database test adapter requires ALLOW_UNPRIVILEGED_TEST=true.' >&2
    exit 1
  }
  shared_dir="$(realpath -m "$shared_dir")"
  backup_dir="$(realpath -m "$backup_dir")"
  case "$shared_dir:$backup_dir" in
    /tmp/*:/tmp/*) ;;
    *) echo 'Test migration paths must both be under /tmp.' >&2; exit 1 ;;
  esac
  [[ "$test_failure" == '' || "$test_failure" == before_database || "$test_failure" == after_database ]] || {
    echo 'Invalid migration test failure point.' >&2
    exit 1
  }
  test_mode=true
else
  [[ "${EUID}" -eq 0 ]] || {
    echo 'University email migration must run as root.' >&2
    exit 1
  }
  [[ -z "$test_failure" ]] || {
    echo 'Failure injection is unavailable in production mode.' >&2
    exit 1
  }
fi

credential_file="$shared_dir/operator-credentials.env"
production_env="$shared_dir/backend.env"
run_id="$(date -u +'%Y%m%dT%H%M%SZ')-$$"
database_backup="$backup_dir/campustrade-before-university-email-$run_id.dump"
credential_backup="$backup_dir/operator-credentials-before-university-email-$run_id.env"
migration_report="$shared_dir/university-email-migration-$run_id.tsv"
credential_stage=''
mapping_stage=''
report_stage=''
credentials_swapped=false
database_migrated=false

database_command() {
  if [[ "$test_mode" == true ]]; then
    docker exec -i "$test_container" "$@"
  else
    k3s kubectl -n campustrade exec -i postgres-0 -- "$@"
  fi
}

install_protected() {
  local source_file="$1"
  local destination="$2"
  if [[ "$test_mode" == true ]]; then
    install -m 0600 "$source_file" "$destination"
  else
    install -o root -g root -m 0600 "$source_file" "$destination"
  fi
}

secure_file() {
  local file="$1"
  chmod 0600 "$file"
  if [[ "$test_mode" != true ]]; then
    chown root:root "$file"
  fi
}

cleanup() {
  local exit_code=$?
  local restore_stage
  if [[ "$credentials_swapped" == true && "$database_migrated" != true ]]; then
    restore_stage="$(mktemp "$shared_dir/.operator-credentials.restore.XXXXXX")"
    install_protected "$credential_backup" "$restore_stage"
    mv -f "$restore_stage" "$credential_file"
  fi
  [[ -z "$credential_stage" ]] || rm -f "$credential_stage"
  if [[ "$database_migrated" == true ]]; then
    if [[ -n "$mapping_stage" || -n "$report_stage" ]]; then
      echo 'Post-commit audit evidence remains in the protected shared directory for recovery.' >&2
    fi
  else
    [[ -z "$mapping_stage" ]] || rm -f "$mapping_stage"
    [[ -z "$report_stage" ]] || rm -f "$report_stage"
  fi
  exit "$exit_code"
}
trap cleanup EXIT

for required_file in "$credential_file" "$production_env" "$migration_sql"; do
  [[ -r "$required_file" ]] || { echo "Missing protected migration input: $required_file" >&2; exit 1; }
done

# shellcheck disable=SC1090
source "$production_env"
: "${DB_USER:?DB_USER is required}"
: "${DB_NAME:?DB_NAME is required}"

if [[ "$test_mode" == true ]]; then
  mkdir -p "$backup_dir"
  chmod 0700 "$backup_dir"
elif [[ ! -d "$backup_dir" ]]; then
  getent group campustrade-deploy >/dev/null || groupadd --system campustrade-deploy
  install -d -o azureuser -g campustrade-deploy -m 2770 "$backup_dir"
fi
umask 077
exec 9>"$shared_dir/university-email-migration.lock"
flock -n 9 || { echo 'Another university email migration is already running.' >&2; exit 1; }

for key in \
  CAMPUSTRADE_ADMIN_EMAIL CAMPUSTRADE_DEMO_EMAIL \
  SEED_USER_1_EMAIL SEED_USER_2_EMAIL SEED_USER_3_EMAIL SEED_USER_4_EMAIL
do
  [[ "$(grep -c "^${key}=" "$credential_file")" == 1 ]] || {
    echo "Protected credential file has an invalid $key entry count." >&2
    exit 1
  }
done

echo 'Creating and validating protected pre-migration backups...'
database_command pg_dump -Fc -U "$DB_USER" -d "$DB_NAME" >"$database_backup"
secure_file "$database_backup"
[[ -s "$database_backup" ]]
database_command pg_restore --list <"$database_backup" >/dev/null
install_protected "$credential_file" "$credential_backup"

credential_stage="$(mktemp "$shared_dir/.operator-credentials.university.XXXXXX")"
awk \
  -v admin='admin@ictuniversity.edu.cm' \
  -v demo='demo.student@ictuniversity.edu.cm' \
  -v seed1='amina.nfor@ictuniversity.edu.cm' \
  -v seed2='joel.tamba@ictuniversity.edu.cm' \
  -v seed3='grace.mbi@ictuniversity.edu.cm' \
  -v seed4='eric.nji@ictuniversity.edu.cm' '
  BEGIN {
    replacement["CAMPUSTRADE_ADMIN_EMAIL"] = admin
    replacement["CAMPUSTRADE_DEMO_EMAIL"] = demo
    replacement["SEED_USER_1_EMAIL"] = seed1
    replacement["SEED_USER_2_EMAIL"] = seed2
    replacement["SEED_USER_3_EMAIL"] = seed3
    replacement["SEED_USER_4_EMAIL"] = seed4
  }
  {
    separator = index($0, "=")
    key = separator > 0 ? substr($0, 1, separator - 1) : ""
    if (key in replacement) {
      print key "=" replacement[key]
      seen[key] = 1
    } else {
      print $0
    }
  }
  END {
    for (key in replacement) if (!(key in seen)) exit 42
  }
  ' "$credential_file" >"$credential_stage"
secure_file "$credential_stage"

mapping_stage="$(mktemp "$shared_dir/.university-email-mapping.XXXXXX")"

# Install the prepared credential file atomically. The trap restores its backup
# only if the database transaction does not commit.
mv -f "$credential_stage" "$credential_file"
credential_stage=''
credentials_swapped=true

if [[ "$test_failure" == before_database ]]; then
  echo 'Injected pre-database migration failure.' >&2
  exit 97
fi

echo 'Migrating application identities in one database transaction...'
database_command psql -qAt -F $'\t' -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" \
  <"$migration_sql" >"$mapping_stage"
database_migrated=true

report_stage="$(mktemp "$shared_dir/.university-email-report.XXXXXX")"
{
  printf 'migrated_at\t%s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')"
  printf 'old_email\tnew_email\n'
  cat "$mapping_stage"
} >"$report_stage"
install_protected "$report_stage" "$migration_report"
rm -f "$mapping_stage" "$report_stage"
mapping_stage=''
report_stage=''

if [[ "$test_failure" == after_database ]]; then
  echo 'Injected post-database migration failure.' >&2
  exit 98
fi

invalid_count="$(database_command psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT count(*) FROM users
   WHERE email !~ '^[a-z0-9._%+-]+@ictuniversity[.]edu[.]cm$';")"
[[ "$invalid_count" == 0 ]] || {
  echo 'Non-university application identities remain after migration.' >&2
  exit 1
}

known_count="$(database_command psql -At -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" -c \
  "SELECT count(*) FROM users WHERE email IN (
    'admin@ictuniversity.edu.cm', 'demo.student@ictuniversity.edu.cm',
    'amina.nfor@ictuniversity.edu.cm', 'joel.tamba@ictuniversity.edu.cm',
    'grace.mbi@ictuniversity.edu.cm', 'eric.nji@ictuniversity.edu.cm');")"
[[ "$known_count" == 6 ]] || {
  echo 'One or more protected CampusTrade identities were not migrated.' >&2
  exit 1
}

secure_file "$credential_file"
echo "University identities migrated successfully. Protected backups and report: $backup_dir, $migration_report"
