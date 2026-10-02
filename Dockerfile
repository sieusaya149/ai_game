# Một container Node (ADR 0010): phục vụ public/, API HTTP, WebSocket và SQLite trong volume /data.
# Cần Node >= 22.13 cho node:sqlite không cờ.
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=80 HOST=0.0.0.0 DB_FILE=/data/farm.db
# node:sqlite còn in ExperimentalWarning; tắt cho cả server lẫn lệnh quản trị
ENV NODE_OPTIONS=--disable-warning=ExperimentalWarning
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server server
COPY public public
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s CMD wget -qO- http://127.0.0.1/api/health || exit 1
CMD ["node", "server/main.mjs"]
