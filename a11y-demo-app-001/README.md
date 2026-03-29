# a11y-demo-app-001

Deliberately inaccessible Rust (Actix-web) web application for testing the AODA/WCAG accessibility scanner pipeline.

## Purpose

This app is intentionally built with many WCAG 2.1 accessibility violations so the Azure DevOps pipeline can detect and report them via SARIF and Advanced Security.

## Tech Stack

- Rust, Actix-web 4
- Docker (containerized)

## Running Locally

```bash
cargo run
```

Or with Docker:

```bash
docker build -t a11y-demo-app-001 .
docker run -p 8080:8080 a11y-demo-app-001
```

Then open `http://localhost:8080`.

## Pipeline

The `.azuredevops/pipelines/a11y-scan.yml` pipeline runs a weekly accessibility scan and publishes SARIF results to Azure DevOps Advanced Security.