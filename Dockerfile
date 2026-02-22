FROM oven/bun:1-slim
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --production

COPY src/ src/
COPY dashboard/dist/ src/dashboard/dist/

ENV PORT=8080
ENV STORAGE_BACKEND=local
ENV DATA_DIR=/app/data


EXPOSE 8080
CMD ["bun", "run", "src/index.ts"]
