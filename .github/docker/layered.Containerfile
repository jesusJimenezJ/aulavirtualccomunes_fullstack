# syntax=docker/dockerfile:1

# Keep the upstream branch-tag defaults for consumers that do not provide the
# release lock's digest references.
ARG FRAPPE_BRANCH=version-16
ARG FRAPPE_IMAGE_PREFIX=frappe
ARG FRAPPE_BUILD_IMAGE=${FRAPPE_IMAGE_PREFIX}/build:${FRAPPE_BRANCH}
ARG FRAPPE_BASE_IMAGE=${FRAPPE_IMAGE_PREFIX}/base:${FRAPPE_BRANCH}

FROM ${FRAPPE_BUILD_IMAGE} AS builder

ARG FRAPPE_BRANCH=version-16
ARG FRAPPE_PATH=https://github.com/frappe/frappe
ARG FRAPPE_COMMIT=""
ARG PAYMENTS_BRANCH=""
ARG PAYMENTS_COMMIT=""
ARG LMS_REF=""
ARG LMS_COMMIT=""
ARG CACHE_BUST=""

USER root
COPY resources/core/pin-app-commits.sh /usr/local/bin/pin-app-commits.sh
RUN chmod 755 /usr/local/bin/pin-app-commits.sh

USER frappe

# Resolve and validate all locked source refs before bench installs apps. The
# mounted apps_json secret is parsed into a temporary file; Git URL rewrites
# direct Bench's HTTPS clones to the locally prepared, commit-pinned repositories.
RUN --mount=type=secret,id=apps_json,target=/opt/frappe/apps.json,uid=1000,gid=0 \
  : "${CACHE_BUST}" && \
  /usr/local/bin/pin-app-commits.sh && \
  cd /home/frappe/frappe-bench && \
  echo "{}" > sites/common_site_config.json && \
  find apps -mindepth 1 -path "*/.git" | xargs rm -fr && \
  chmod -R g=u /home/frappe/frappe-bench

FROM ${FRAPPE_BASE_IMAGE} AS backend

USER frappe

COPY --from=builder --chown=frappe:0 /home/frappe/frappe-bench /home/frappe/frappe-bench

WORKDIR /home/frappe/frappe-bench

# Keep the COPY destination group-writable and move assets to image-layer storage
RUN chmod g=u /home/frappe/frappe-bench && \
  cp -r /home/frappe/frappe-bench/sites/assets /home/frappe/frappe-bench/assets && \
  rm -rf /home/frappe/frappe-bench/sites/assets

VOLUME [ \
  "/home/frappe/frappe-bench/sites", \
  "/home/frappe/frappe-bench/logs" \
]

USER root
# This entrypoint script link build assets of the image to the mounted sites volume at container initialization
COPY resources/core/main-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod 755 /usr/local/bin/entrypoint.sh

COPY resources/core/start.sh /usr/local/bin/start.sh
RUN chmod 755 /usr/local/bin/start.sh

USER frappe
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

CMD ["start.sh"]
