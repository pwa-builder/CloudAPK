FROM mingc/android-build-box:1.4.0 as base
ENV NODE_VERSION="12.x"

WORKDIR /app
COPY . . 
ENV PORT 80
RUN npm install
CMD npm start
