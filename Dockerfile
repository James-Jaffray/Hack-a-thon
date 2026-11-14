FROM node:lts-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]