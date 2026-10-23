# Ccomunes — Aula Virtual Comunitaria

Ccomunes es un aula virtual comunitaria construida sobre Frappe Learning. Este repositorio contiene la aplicación y una configuración de desarrollo con Docker para que el equipo pueda ejecutarla en su propia computadora.

## Requisitos

- Git.
- Docker Desktop con integración WSL 2 (Windows), o Docker Engine y Docker Compose v2 (Linux).
- Al menos 8 GB de memoria disponibles para Docker.
- Conexión a internet durante la primera instalación.

## Inicio rápido

Los siguientes comandos se ejecutan en una terminal Linux o en Ubuntu (WSL). En Windows, instala Docker Desktop, activa la integración con tu distribución Ubuntu y abre Ubuntu desde el menú Inicio.

### 1. Clonar el proyecto

```bash
git clone --branch sprint1/completo --single-branch https://github.com/jesusJimenezJ/aula-virtual-ccomunes.git
cd aula-virtual-ccomunes
```

### 2. Preparar las variables locales

```bash
cp .env.example .env
```

Las contraseñas del archivo `.env` son solo para desarrollo local. No subas ese archivo a Git ni reutilices esas claves en un servidor público.

### 3. Iniciar Ccomunes

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d
docker compose --env-file .env -f docker/docker-compose.yml logs -f frappe
```

La primera vez Docker descarga las imágenes e instala Frappe y la aplicación. Puede tardar varios minutos. Cuando los registros indiquen que Bench está listo, abre:

[http://ccomunes.localhost:8080/lms](http://ccomunes.localhost:8080/lms)

Inicia sesión con el usuario `Administrator` y la contraseña definida como `SITE_ADMIN_PASSWORD` en tu archivo `.env`.

Si el puerto 8080 está ocupado, cambia `WEB_PORT` en `.env` y abre `http://ccomunes.localhost:<puerto>/lms` usando el valor elegido.

## Colaborar en el proyecto

Cada integrante debe clonar el repositorio y trabajar en una rama propia para evitar sobrescribir cambios de los demás:

```bash
git switch -c feature/descripcion-del-cambio
```

Después de hacer cambios:

```bash
git add archivos-modificados
git commit -m "Describe el cambio"
git push -u origin feature/descripcion-del-cambio
```

Luego se propone el cambio con un Pull Request hacia `sprint1/completo`. El código de la aplicación está montado desde la carpeta clonada, así que cada integrante conserva sus cambios en su propio directorio.

Para reconstruir los recursos de interfaz después de modificar el frontend:

```bash
docker compose --env-file .env -f docker/docker-compose.yml exec frappe bash -lc 'cd /home/frappe/frappe-bench && bench build --app lms && bench --site ccomunes.localhost clear-cache'
```

## Detener o reiniciar

Detener los contenedores conserva los datos:

```bash
docker compose --env-file .env -f docker/docker-compose.yml down
```

Para volver a iniciar, ejecuta otra vez el comando `up -d` de la sección anterior.

**Borrar la base de datos y empezar desde cero** (elimina cursos y datos locales):

```bash
docker compose --env-file .env -f docker/docker-compose.yml down -v
```

## Archivos de desarrollo

- `docker/docker-compose.yml`: servicios de aplicación, MariaDB y Redis.
- `docker/init.sh`: instalación inicial automática de Frappe, Payments y Ccomunes.
- `.env.example`: valores locales de ejemplo; cada persona crea su propio `.env`.

Esta configuración es para desarrollo local del equipo, no para producción.
