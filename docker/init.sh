#!/usr/bin/env bash
set -Eeuo pipefail

# ============================================================
# CONFIGURACIÓN Y VALIDACIÓN DEL ENTORNO
# ============================================================

: "${MARIADB_ROOT_PASSWORD:?Falta MARIADB_ROOT_PASSWORD en .env}"
: "${SITE_ADMIN_PASSWORD:?Falta SITE_ADMIN_PASSWORD en .env}"
: "${SITE_NAME:?Falta SITE_NAME en .env}"
: "${FRAPPE_BRANCH:?Falta FRAPPE_BRANCH en .env}"

BENCH_DIR="/home/frappe/frappe-bench"
SITE_DIR="$BENCH_DIR/sites/$SITE_NAME"

echo "============================================================"
echo " Iniciando entorno de desarrollo Frappe LMS"
echo " Sitio: $SITE_NAME"
echo "============================================================"

# ============================================================
# CONFIGURACIÓN DE GIT Y CLIENTE MARIADB
# ============================================================

git config --global --add safe.directory /workspace

# El entorno MariaDB de desarrollo no requiere SSL.
printf '[client]\nskip-ssl\n' > "$HOME/.my.cnf"
chmod 600 "$HOME/.my.cnf"

# ============================================================
# INICIALIZACIÓN DE FRAPPE BENCH
# ============================================================

if [ ! -d "$BENCH_DIR/apps/frappe" ]; then
    echo "==> Preparando Frappe Bench..."

    bench init \
        --skip-redis-config-generation \
        --frappe-branch "$FRAPPE_BRANCH" \
        "$BENCH_DIR"
fi

cd "$BENCH_DIR"

# ============================================================
# CONFIGURACIÓN DE SERVICIOS
# ============================================================

echo "==> Configurando MariaDB y Redis..."

bench set-mariadb-host mariadb
bench set-redis-cache-host redis://redis:6379
bench set-redis-queue-host redis://redis:6379
bench set-redis-socketio-host redis://redis:6379

# Configuración de procesos para Docker.
sed -i '/^redis/d' Procfile
sed -i '/^watch/d' Procfile
sed -i 's|^web:.*|web: bench serve --host 0.0.0.0 --port 8000|' Procfile

# ============================================================
# APLICACIÓN PAYMENTS
# ============================================================

if [ ! -d "$BENCH_DIR/apps/payments" ]; then
    echo "==> Descargando aplicación Payments..."
    bench get-app payments
fi

# ============================================================
# APLICACIÓN LMS
# ============================================================

if [ ! -e "$BENCH_DIR/apps/lms" ]; then
    echo "==> Registrando aplicación LMS desde /workspace..."
    bench get-app --soft-link lms /workspace
fi

# ============================================================
# VALIDACIÓN Y PRESERVACIÓN DEL SITIO
# ============================================================

if [ -f "$SITE_DIR/site_config.json" ]; then
    echo "==> Se encontró un sitio existente: $SITE_NAME"
    echo "==> Validando las aplicaciones instaladas..."

    # IMPORTANTE:
    # Nunca borrar automáticamente el sitio si falla list-apps.
    # Un error de conexión no demuestra que el sitio esté dañado.
    if ! bench --site "$SITE_NAME" list-apps; then
        echo "ERROR: No se pudo verificar el sitio existente."
        echo "Se preservarán los archivos y las bases de datos."
        echo "Revise la configuración y la conectividad de MariaDB."
        exit 1
    fi
else
    echo "==> No existe site_config.json para $SITE_NAME."
    echo "==> Creando el sitio por primera vez..."

    bench new-site "$SITE_NAME" \
        --mariadb-root-password "$MARIADB_ROOT_PASSWORD" \
        --admin-password "$SITE_ADMIN_PASSWORD" \
        --mariadb-user-host-login-scope='%'
fi

# ============================================================
# INSTALACIÓN CONTROLADA DE APLICACIONES
# ============================================================

echo "==> Comprobando Payments..."

if ! bench --site "$SITE_NAME" list-apps | grep -Fxq payments; then
    echo "==> Instalando Payments..."
    bench --site "$SITE_NAME" install-app payments
fi

echo "==> Comprobando LMS..."

if ! bench --site "$SITE_NAME" list-apps | grep -Fxq lms; then
    echo "==> Instalando LMS..."
    bench --site "$SITE_NAME" install-app lms
fi

# ============================================================
# CONFIGURACIÓN DEL SITIO
# ============================================================

echo "==> Corrigiendo permisos de la configuración del sitio..."
sudo chown frappe:frappe "$SITE_DIR/site_config.json"
sudo chmod 640 "$SITE_DIR/site_config.json"

echo "==> Activando modo de desarrollo..."

bench --site "$SITE_NAME" set-config developer_mode 1
bench --site "$SITE_NAME" clear-cache
bench use "$SITE_NAME"

# ============================================================
# CONSTRUCCIÓN DE RECURSOS DEL LMS
# ============================================================

if [ ! -f "$BENCH_DIR/sites/.ccomunes-assets-built" ]; then
    echo "==> Configurando enlaces de recursos..."

    sudo ln -sfn "$BENCH_DIR/sites" /sites

    mkdir -p /workspace/frontend/node_modules/@framework

    ln -sfn \
        "$BENCH_DIR/apps/frappe/ui" \
        /workspace/frontend/node_modules/@framework/ui

    echo "==> Construyendo recursos del LMS..."

    bench build --app lms

    touch "$BENCH_DIR/sites/.ccomunes-assets-built"
fi

# ============================================================
# INICIO DE FRAPPE
# ============================================================

echo "============================================================"
echo " Iniciando Frappe..."
echo " Sitio activo: $SITE_NAME"
echo "============================================================"

exec bench start
