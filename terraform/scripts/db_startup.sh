#!/bin/bash
# MongoDB 6.0 on Ubuntu 22.04+ (jammy); dumps to GCS every 2 hours via gsutil + cron.
set -euo pipefail
exec > >(tee /var/log/startup-script.log) 2>&1

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y wget curl gnupg apt-transport-https ca-certificates python3

install_gcloud_cli() {
  echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" >/etc/apt/sources.list.d/google-cloud-sdk.list
  curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
  apt-get update
  apt-get install -y google-cloud-cli
}

install_gcloud_cli

. /etc/os-release
case "${VERSION_CODENAME}" in
  focal | jammy | noble) MONGO_UBU="${VERSION_CODENAME}" ;;
  *) MONGO_UBU="jammy" ;;
esac

MONGO_SERIES="6.0"
curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_SERIES}.asc" | gpg -o /usr/share/keyrings/mongodb-server-${MONGO_SERIES}.gpg --dearmor
echo "deb [ arch=amd64 signed-by=/usr/share/keyrings/mongodb-server-${MONGO_SERIES}.gpg ] https://repo.mongodb.org/apt/ubuntu ${MONGO_UBU}/mongodb-org/${MONGO_SERIES} multiverse" >/etc/apt/sources.list.d/mongodb-org-${MONGO_SERIES}.list
apt-get update
apt-get install -y mongodb-org mongodb-mongosh mongodb-database-tools

# Package default is bindIp 127.0.0.1 only — GKE could not reach the VM private IP without this.
if grep -qE 'bindIp:\s*127\.0\.0\.1' /etc/mongod.conf; then
  sed -i 's/bindIp: 127.0.0.1/bindIp: 0.0.0.0/' /etc/mongod.conf
fi

systemctl enable mongod
systemctl start mongod
sleep 15

python3 <<'PY'
import base64
import json
import subprocess
import urllib.request

def meta(key: str) -> str:
    url = f"http://metadata.google.internal/computeMetadata/v1/instance/attributes/{key}"
    req = urllib.request.Request(url, headers={"Metadata-Flavor": "Google"})
    return urllib.request.urlopen(req).read().decode()

pwd = base64.b64decode(meta("mongo-admin-password-b64")).decode()
# User lives in DB `mangosteen` so URIs like mongodb://...@host/mangosteen work without authSource=admin.
js = f"""
try {{
  db.createUser({{
    user: "mangosteenadmin",
    pwd: {json.dumps(pwd)},
    roles: [{{role: "readWrite", db: "mangosteen"}}],
  }});
}} catch (e) {{
  ;
}}
"""
subprocess.check_call(["mongosh", "mangosteen", "--quiet", "--eval", js])
PY

if ! grep -q '^security:' /etc/mongod.conf; then
  printf '\nsecurity:\n  authorization: enabled\n' >>/etc/mongod.conf
fi

systemctl restart mongod
sleep 5

cat >/usr/local/bin/mongo-backup.sh <<'EOSCRIPT'
#!/bin/bash
set -euo pipefail
MONGO_PASS_B64=$(curl -fs -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/mongo-admin-password-b64")
MONGO_PASS=$(echo "$MONGO_PASS_B64" | base64 -d)
BUCKET=$(curl -fs -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/attributes/backup-bucket")
TS=$(date +%Y%m%d-%H%M%S)
ARCHIVE="/tmp/mongodump-${TS}.gz"
mongodump --host 127.0.0.1 --port 27017 --username mangosteenadmin --password "$MONGO_PASS" --authenticationDatabase mangosteen --db mangosteen --archive="$ARCHIVE" --gzip
gsutil cp "$ARCHIVE" "gs://${BUCKET}/"
rm -f "$ARCHIVE"
EOSCRIPT
chmod +x /usr/local/bin/mongo-backup.sh

echo "0 */2 * * * root /usr/local/bin/mongo-backup.sh >>/var/log/mongo-backup.log 2>&1" >/etc/cron.d/mongo-backup
chmod 644 /etc/cron.d/mongo-backup
