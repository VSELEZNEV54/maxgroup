FROM node:24-bookworm-slim AS design
WORKDIR /source
COPY build.mjs ./
COPY src/ src/
COPY data/ data/
COPY content/ content/
COPY assets/ assets/
COPY квизы/ квизы/
RUN --mount=type=bind,source=.,target=/context \
    ln -s /context/offer-photos.nosync offer-photos.nosync && ln -s /context/design-system design-system \
    && node build.mjs --django --strict && node квизы/build.mjs \
    && mkdir -p dist.nosync/kvizy && cp -R квизы/assets dist.nosync/kvizy/ \
    && cd квизы && find . -name index.html -exec cp --parents '{}' ../dist.nosync/kvizy/ \;

FROM python:3.13-slim-bookworm AS dependencies
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 UV_PROJECT_ENVIRONMENT=/opt/venv PATH="/opt/venv/bin:${PATH}"
WORKDIR /app
RUN pip install --no-cache-dir uv==0.11.21
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project && uv cache clean

FROM dependencies AS app
COPY manage.py ./
COPY backend backend
COPY --from=design /source/dist.nosync /app/release
ENV MAXGROUP_RELEASE=/app/release STATIC_ROOT=/srv/static MEDIA_ROOT=/srv/media NGINX_DOCUMENTS=1
CMD ["gunicorn", "backend.wsgi:application", "--bind=0.0.0.0:8000", "--workers=2", "--threads=2", "--timeout=60"]

FROM nginx:stable-alpine AS proxy
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=design /source/dist.nosync/assets /srv/release/assets
COPY --from=design /source/dist.nosync/model-media /srv/release/model-media
COPY --from=design /source/dist.nosync/kvizy/assets /srv/release/kvizy/assets
