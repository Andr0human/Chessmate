# syntax=docker/dockerfile:1
#
# Multi-stage build for the Chessmate backend.
#
# The chess engine (elsa) is compiled from source in stage 1, so a fresh Linux
# binary is produced on every deploy — no platform-specific binaries are ever
# committed to git. The compiled server then invokes it in-process via execFile.
#
# Build context is the `server/` directory (set Render's Root Directory to
# `server`). The engine source lives at `server/engine` (a git submodule), which
# appears as `engine/` inside this context.

# ---- Stage 1: compile the elsa engine (Linux ELF) ----
FROM gcc:13 AS engine
WORKDIR /engine
COPY engine/ ./
# Portable arch (NOT -march=native) so the binary runs on Render's CPUs instead
# of crashing with SIGILL on an instruction the host doesn't support. We target
# x86-64-v3 (AVX2/BMI2/FMA — Haswell, 2013+), a baseline every mainstream cloud
# CPU (incl. Render's) has supported for years, so it stays portable while giving
# the optimizer modern ISA + scheduling over the SSE-era x86-64-v2. Static
# libstdc++/libgcc means no glibc-version surprises at runtime. These mirror the
# Makefile's proven Linux flags, minus -march=native and debug/warning flags.
RUN make elsa CXXFLAGS="-std=c++2a -O3 -flto=auto -m64 -static -static-libgcc -static-libstdc++ -pthread -fopenmp -march=x86-64-v3"

# ---- Stage 2: build the TypeScript server ----
FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- Stage 3: runtime ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build  /app/dist            ./dist
# Place the binary exactly where Engine.ts resolves it on Linux:
# __dirname(/app/dist/module/chessEngine)/../../../public/elsa => /app/public/elsa
COPY --from=engine /engine/output/elsa  ./public/elsa
RUN chmod +x ./public/elsa
# Informational; Render injects $PORT and the app reads process.env.PORT.
EXPOSE 8080
CMD ["node", "dist/index.js"]
