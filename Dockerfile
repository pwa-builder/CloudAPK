FROM pwabuilder.azurecr.io/pwa-android-build-box:master as base

WORKDIR /app
COPY . .

ENV PORT 80
EXPOSE 80

ENV JAVA_OPTS="-Xmx20000m"

ENV NODE_ENV=development
RUN npm install
ENV NODE_ENV=production

CMD npm start
