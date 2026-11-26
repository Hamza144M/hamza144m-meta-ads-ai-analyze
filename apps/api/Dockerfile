# Build from the repository root:
#   docker build -f apps/api/Dockerfile -t meta-ads-api .
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/core/package.json packages/core/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @maa/api --workspace @maa/core --include-workspace-root
COPY packages/core packages/core
COPY apps/api apps/api
RUN npm run build -w @maa/api && npm prune --omit=dev --workspace @maa/api --workspace @maa/core

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/packages/core/package.json packages/core/
COPY --from=build /app/packages/core/dist packages/core/dist
COPY --from=build /app/apps/api/package.json apps/api/
COPY --from=build /app/apps/api/dist apps/api/dist
USER node
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
