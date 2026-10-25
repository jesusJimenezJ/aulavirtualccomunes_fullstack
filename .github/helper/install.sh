#!/bin/bash
set -e
cd ~ || exit

echo "Setting Up Bench..."

pip install frappe-bench
bench -v init frappe-bench --skip-assets --python "$(which python)"
cd ./frappe-bench || exit

bench -v setup requirements

echo "Setting Up LMS App..."
bench get-app "https://github.com/frappe/payments"
bench get-app lms "${GITHUB_WORKSPACE}"

echo "Applying Frappe onboarding guard patch..."
git -C ~/frappe-bench/apps/frappe apply --check "${GITHUB_WORKSPACE}/patches/frappe-onboarding-guard.patch"
git -C ~/frappe-bench/apps/frappe apply "${GITHUB_WORKSPACE}/patches/frappe-onboarding-guard.patch"

echo "Setting Up Sites & Database..."

mkdir ~/frappe-bench/sites/lms.test
cat > ~/frappe-bench/sites/lms.test/site_config.json <<'EOF'
{
  "db_name": "test_lms",
  "db_password": "test_lms",
  "db_type": "mariadb",
  "db_host": "127.0.0.1",
  "db_port": 3306
}
EOF


mariadb --host 127.0.0.1 --port 3306 -u root -p123 -e "SET GLOBAL character_set_server = 'utf8mb4'";
mariadb --host 127.0.0.1 --port 3306 -u root -p123 -e "SET GLOBAL collation_server = 'utf8mb4_unicode_ci'";

mariadb --host 127.0.0.1 --port 3306 -u root -p123 -e "CREATE DATABASE test_lms";
mariadb --host 127.0.0.1 --port 3306 -u root -p123 -e "CREATE USER 'test_lms'@'localhost' IDENTIFIED BY 'test_lms'";
mariadb --host 127.0.0.1 --port 3306 -u root -p123 -e "GRANT ALL PRIVILEGES ON \`test_lms\`.* TO 'test_lms'@'localhost'";

mariadb --host 127.0.0.1 --port 3306 -u root -p123 -e "FLUSH PRIVILEGES";

echo "Setting Up Procfile..."

sed -i 's/^watch:/# watch:/g' Procfile
sed -i 's/^schedule:/# schedule:/g' Procfile

echo "Starting Bench..."

bench start &> bench_start.log &

CI=Yes bench build &
build_pid=$!

bench --site lms.test reinstall \
  --mariadb-root-password 123 \
  --admin-password admin \
  --yes
bench --site lms.test install-app lms

wait $build_pid
