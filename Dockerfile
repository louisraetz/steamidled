# Build stage: compile TypeScript and keep production dependencies only
FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src
RUN pnpm build && pnpm prune --prod

# Runtime stage: no compiler, no dev dependencies, unprivileged user
FROM node:22-alpine
# tzdata makes TZ=Europe/Berlin etc. work for the local-midnight daily report
RUN apk add --no-cache tzdata
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
# Config lives in the node user's home; pre-create it so a named volume
# mounted there inherits node:node ownership instead of root.
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
  && mkdir -p /home/node/.steam-idler \
  && chown -R node:node /home/node/.steam-idler /app
USER node
ENV NODE_ENV=production
VOLUME ["/home/node/.steam-idler"]
ENTRYPOINT ["docker-entrypoint.sh"]
# "idle" = --headless; "login" = interactive first run; anything else is passed through
CMD ["idle"]
