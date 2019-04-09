FROM runmymind/docker-android-sdk:ubuntu-standalone as base
WORKDIR /app
COPY . . 
RUN wget "https://services.gradle.org/distributions/gradle-5.3.1-bin.zip"
RUN mkdir /opt/gradle
RUN unzip -d /opt/gradle gradle-5.3.1-bin.zip
CMD /bin/bash
