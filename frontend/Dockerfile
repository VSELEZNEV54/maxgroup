FROM node:24-bookworm-slim AS build
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /site
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS site
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /site
COPY --from=build --chown=node:node /site/.next/standalone ./
COPY --from=build --chown=node:node /site/.next/static ./.next/static
USER node
EXPOSE 3000
CMD ["node", "server.js"]
