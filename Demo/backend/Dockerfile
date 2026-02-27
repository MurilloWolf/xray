FROM node:20-alpine

WORKDIR /app

COPY Demo/backend/package.json /app/Demo/backend/package.json

WORKDIR /app/Demo/backend
RUN npm install

WORKDIR /app
COPY packages /app/packages
COPY Demo/backend /app/Demo/backend

RUN npm --prefix /app/packages/analytics-server install --omit=dev

WORKDIR /app/Demo/backend
EXPOSE 4000

CMD ["npm", "run", "start"]
