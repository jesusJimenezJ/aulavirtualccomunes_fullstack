# Docker installation

This guide describes the Docker setup used by the Ccomunes project. Run the commands from the repository root. The active Compose file is `docker/docker-compose.yml`; the root-level `docker-compose.yml` is not used by these instructions.

## Requirements

- Git.
- Docker Desktop with WSL 2 integration (Windows), or Docker Engine and Docker Compose v2 (Linux).
- At least 8 GB of memory available to Docker.
- An internet connection for the first installation.

On Windows, install Docker Desktop, enable integration with your Ubuntu distribution, and run the commands below from an Ubuntu terminal.

## Prepare the project

Clone the project and enter its directory:

```bash
git clone --branch sprint1/completo --single-branch https://github.com/jesusJimenezJ/aula-virtual-ccomunes.git
cd aula-virtual-ccomunes
```

Create your local environment file:

```bash
cp .env.example .env
```

Keep `.env` local and do not commit it. The Docker startup script installs Frappe and the Ccomunes application automatically on first startup; this setup does not use the upstream LMS setup wizard.

## Start Ccomunes

Start the services:

```bash
docker compose --env-file .env -f docker/docker-compose.yml up -d
```

Follow the Frappe service logs while the first startup completes:

```bash
docker compose --env-file .env -f docker/docker-compose.yml logs -f frappe
```

The first startup downloads images and installs the application, so it can take several minutes. Check the service status with:

```bash
docker compose --env-file .env -f docker/docker-compose.yml ps
```

When Bench is ready, open [http://ccomunes.localhost:8080/lms](http://ccomunes.localhost:8080/lms). Sign in as `Administrator` using the password configured locally in `.env`.

If port 8080 is already in use, set `WEB_PORT` in `.env` and use `http://ccomunes.localhost:<port>/lms` with that port.

## Load demo data

After the services are running, you can recreate the LMS demo course from another terminal:

```bash
docker compose --env-file .env -f docker/docker-compose.yml exec frappe bash -lc 'cd /home/frappe/frappe-bench && bench --site ccomunes.localhost execute lms.demo.demo_data.create_demo_data'
```

The demo data includes a sample course, instructor, learners, lessons, quizzes, and progress records. To remove the demo course, use **Clear Demo Data** from the user menu in the LMS interface.

## Stop the services

Stopping the containers preserves the data:

```bash
docker compose --env-file .env -f docker/docker-compose.yml down
```

To start them again, run the `up -d` command above.

To remove the database and all local data, run:

```bash
docker compose --env-file .env -f docker/docker-compose.yml down -v
```

This setup is intended for local development, not production.
