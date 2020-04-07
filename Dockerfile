FROM pwabuilder.azurecr.io/pwa-android-build-box:latest as base

WORKDIR /app
COPY . . 
ENV PORT 80
RUN npm install
CMD npm start
