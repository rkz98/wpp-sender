EXPOSE 3000
WORKDIR /app
COPY src ./src
FROM node:24-alpine
COPY package*.json ./
RUN npm ci --omit=dev
CMD ["node", "src/server.ts"]
HEALTHCHECK CMD wget -qO- http://localhost:3000/health || exit 1
