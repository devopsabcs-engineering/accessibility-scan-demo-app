# a11y-demo-app-004

Deliberately inaccessible Flask (Python) web application for testing the AODA/WCAG accessibility scanner pipeline.

## Purpose

This app is intentionally built with many WCAG 2.1 accessibility violations so the Azure DevOps pipeline can detect and report them via SARIF and Advanced Security.

## Tech Stack

- Python 3.12, Flask 3.0
- Gunicorn (production server)
- Docker (containerized)

## Running Locally

```bash
pip install -r requirements.txt
python app.py
```

Or with Docker:

```bash
docker build -t a11y-demo-app-004 .
docker run -p 8080:8080 a11y-demo-app-004
```

Then open `http://localhost:8080`.

## Pipeline

The `.azuredevops/pipelines/a11y-scan.yml` pipeline runs a weekly accessibility scan and publishes SARIF results to Azure DevOps Advanced Security.