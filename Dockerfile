FROM docker.pkg.github.com/jgw96/docker-android-build-box/pwa-android-build-box:latest

WORKDIR /app
COPY . . 
ENV PORT 80
RUN npm install
CMD npm start
