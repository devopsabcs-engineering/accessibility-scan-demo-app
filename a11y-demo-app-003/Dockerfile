FROM eclipse-temurin:17-jdk AS build
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle/ gradle/
COPY src/ src/
RUN apt-get update && apt-get install -y unzip && \
    curl -sL https://services.gradle.org/distributions/gradle-8.7-bin.zip -o gradle.zip && \
    unzip -q gradle.zip && \
    ./gradle-8.7/bin/gradle bootJar --no-daemon

FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
