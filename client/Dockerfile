# syntax=docker/dockerfile:1
#
# Multi-stage build for the Chessmate frontend (Next.js 15 App Router).
#
# Build context is the `client/` directory, mirroring how server/Dockerfile
# takes `server/`. Nothing outside client/ is needed.
#
# THE ONE THING TO UNDERSTAND ABOUT THIS IMAGE: it is built with both
# NEXT_PUBLIC_* variables UNSET, on purpose. Next inlines NEXT_PUBLIC_* into the
# browser bundle at BUILD time, so a value baked here is permanent for the life
# of the image. Left unset:
#
#   - axios gets baseURL: undefined      -> issues relative URLs  (/api/...)
#   - socket.io-client gets uri undefined -> falls back to the page origin
#     (socket.io-client 4.8.1, build/cjs/url.js: `if (null == uri) uri =
#     loc.protocol + "//" + loc.host` — loose equality, so undefined hits it too,
#     and the `lookup(uri?: string, ...)` overload accepts undefined at type level)
#
# so the image never learns its own hostname. That is what makes the Vercel
# cutover a DNS-and-ingress change instead of a rebuild, and it is why the
# reverse proxy in front of this MUST route /api/* and /socket.io/* to the
# backend on the SAME origin.

# ---- Stage 1: dependencies ----
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ---- Stage 2: build ----
FROM node:20-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Assert the standalone tree actually landed. `output: "standalone"` is a
# next.config.ts setting, and the build script runs `next build --turbopack`;
# if a Next or Turbopack version ever stops emitting the standalone server, the
# build still exits 0 and the runtime stage would COPY an empty directory and
# fail at `docker run` with a confusing "Cannot find module". Fail here instead.
# (Same lesson as the cloudflared login that wrote its cert into a --rm
# container: check the artifact landed, never the exit status.)
RUN set -eu; \
    if [ ! -f .next/standalone/server.js ]; then \
      echo "BUILD ASSERTION FAILED: .next/standalone/server.js is missing."; \
      echo "  output: 'standalone' did not take effect. Check next.config.ts,"; \
      echo "  and whether this Next/Turbopack version still supports it."; \
      exit 1; \
    fi

# Assert the origin-agnostic build actually IS origin-agnostic. If a .env ever
# slips past .dockerignore, or someone adds an ARG/ENV NEXT_PUBLIC_*, the dev
# default (http://localhost:8080) gets inlined into the browser bundle and every
# request from a real browser dies — with a green build and a healthy container.
# This is the only point in the pipeline where that is cheap to catch.
RUN set -eu; \
    if grep -rqI 'localhost:8080' .next/standalone .next/static; then \
      echo "BUILD ASSERTION FAILED: 'localhost:8080' is baked into the bundle."; \
      echo "  A NEXT_PUBLIC_* value reached the build. Check client/.dockerignore"; \
      echo "  still excludes .env* and that no ENV/ARG sets NEXT_PUBLIC_*."; \
      grep -rlI 'localhost:8080' .next/standalone .next/static || true; \
      exit 1; \
    fi

# ---- Stage 3: runtime ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Next's generated standalone server reads HOSTNAME and has defaulted it to
# "localhost" in some releases. Bound to localhost the container answers only
# itself and cloudflared gets connection refused, which looks exactly like a
# tunnel fault. Pin it.
ENV HOSTNAME=0.0.0.0

# standalone ships its own minimal node_modules; .next/static and public are NOT
# included in the traced output and must be copied by hand (documented Next
# behaviour, not a workaround).
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static     ./.next/static
COPY --from=build /app/public           ./public

# uid 1000, present in the node images. Runs read_only: true in compose, with a
# tmpfs over .next/cache — the only path the standalone server writes to.
USER node

EXPOSE 3000
CMD ["node", "server.js"]
