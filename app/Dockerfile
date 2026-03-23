# syntax=docker/dockerfile:1.4
# Next.js standalone: small runtime image; build stage installs deps and runs `next build`.
# linux/amd64 matches typical GKE nodes; without this, Apple Silicon builds arm64 images → exec format error on cluster.
FROM --platform=linux/amd64 node:18-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
# Do not set NODE_ENV=production before npm ci — npm omits devDependencies and Next build can break.
RUN npm ci
COPY . .
RUN mkdir -p public
ENV NODE_ENV=production
# One RUN keeps .next output in the same layer (helps BuildKit + COPY --from=builder).
RUN npm run build \
  && mkdir -p .next/static \
  && test -f .next/standalone/server.js

FROM --platform=linux/amd64 node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --link --from=builder /app/public ./public
COPY --link --from=builder /app/.next/standalone ./
COPY --link --from=builder /app/.next/static ./.next/static
COPY wizexercise.txt /app/wizexercise.txt

EXPOSE 3000
# Avoid base image docker-entrypoint.sh (PID 1 is fine as plain node for this app).
ENTRYPOINT []
CMD ["node", "server.js"]
