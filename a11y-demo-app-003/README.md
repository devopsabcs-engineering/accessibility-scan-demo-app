# a11y-demo-app-003

Deliberately inaccessible Java Spring Boot web application for testing the AODA/WCAG accessibility scanner pipeline.

## Purpose

This app is intentionally built with many WCAG 2.1 accessibility violations so the Azure DevOps pipeline can detect and report them via SARIF and Advanced Security.

## Tech Stack

- Java 17, Spring Boot 3.2
- Thymeleaf templates
- Gradle build
- Docker (containerized)

## Running Locally

```bash
./gradlew bootRun
```

Or with Docker:

```bash
docker build -t a11y-demo-app-003 .
docker run -p 8080:8080 a11y-demo-app-003
```

Then open `http://localhost:8080`.

## Pipeline

The `.azuredevops/pipelines/a11y-scan.yml` pipeline runs a weekly accessibility scan and publishes SARIF results to Azure DevOps Advanced Security.