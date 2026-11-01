FROM node:24-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY index.html ./index.html
COPY assets ./assets
COPY server ./server
RUN mkdir -p /var/lib/terangapass/private && chown -R node:node /var/lib/terangapass
USER node
EXPOSE 8080
CMD ["node", "server/index.mjs"]
