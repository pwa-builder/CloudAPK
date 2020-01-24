FROM mingc/android-build-box as base
WORKDIR /app
COPY . . 
ENV PORT 80
RUN npm install
CMD npm start