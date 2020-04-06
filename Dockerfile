FROM mingc/android-build-box:1.4.0 as base
WORKDIR /app
COPY . . 
ENV PORT 80
RUN npm install
CMD npm start
