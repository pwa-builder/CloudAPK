FROM pwabuilder.azurecr.io/pwa-android-build-box:latest as base

WORKDIR /app
COPY . . 
ENV PORT 80
ENV JAVA_OPTS="-Xmx20000m"
RUN npm install
CMD npm start
