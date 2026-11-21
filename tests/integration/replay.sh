#!/bin/bash
# usage: replay.sh <dbname> [upto-file-prefix]
DB=$1
su postgres -c "psql -q -c 'DROP DATABASE IF EXISTS $DB' -c 'CREATE DATABASE $DB'" >/dev/null 2>&1
su postgres -c "psql -q -d $DB -f /tmp/dbtest/bootstrap.sql" > /tmp/dbtest/bootstrap.log 2>&1
rm -f /tmp/dbtest/errors.log; : > /tmp/dbtest/errors.log
n=0
for f in $(ls ${REPO}/supabase/migrations/*.sql | sort); do
  n=$((n+1))
  out=$(su postgres -c "psql -q -d $DB -v ON_ERROR_STOP=0 -f $f" 2>&1 | grep -E "ERROR|FATAL" )
  if [ -n "$out" ]; then echo "### $(basename $f)" >> /tmp/dbtest/errors.log; echo "$out" | head -8 >> /tmp/dbtest/errors.log; fi
done
echo "replayed $n migrations"
