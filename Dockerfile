FROM node:20-slim

WORKDIR /app

COPY artifacts/api-server/dist ./dist

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000

CMD ["node", "dist/index.mjs"]
