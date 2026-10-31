FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
COPY web ./web
RUN pnpm build && pnpm prune --prod

FROM node:22-alpine
RUN apk add --no-cache tzdata
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /home/node/.steam-idler \
  && chown -R node:node /home/node/.steam-idler /app
USER node
ENV NODE_ENV=production
ENV STEAMIDLED_WEB_HOST=0.0.0.0
EXPOSE 4821
VOLUME ["/home/node/.steam-idler"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD ["docker-entrypoint.sh","healthcheck"]
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["web"]
