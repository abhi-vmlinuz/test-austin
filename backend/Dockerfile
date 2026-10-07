FROM node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
COPY database ./database
RUN mkdir -p uploads
EXPOSE 3000
CMD ["node", "src/server.js"]
