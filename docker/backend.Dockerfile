# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

COPY ged-backend/pom.xml .
RUN mvn -q dependency:go-offline

COPY ged-backend/src ./src
RUN mvn -q clean package -DskipTests

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre-jammy AS runtime

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        tesseract-ocr \
        tesseract-ocr-fra \
        fonts-dejavu-core \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/target/ged-backend-0.0.1-SNAPSHOT.jar app.jar

ENV TESSDATA_PATH=/usr/share/tesseract-ocr/5/tessdata
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
