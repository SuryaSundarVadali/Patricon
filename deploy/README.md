# Patricon Deployment Guide

This document describes how to build and run Patricon service containers locally and how to prepare deployment artifacts for a generic cloud environment.

## Prerequisites

- Docker Engine 24+
- Docker Compose v2+
- Environment file at repository root (`.env`), based on `.env.example`

## Build Images

Build all images from repository root:

```bash
docker compose build
```

Build individual targets from the multi-stage Dockerfile:

```bash
docker build --target agent-runtime -t patricon-agent:local .
docker build --target dashboard-runtime -t patricon-dashboard:local .
```

## Run Locally

Start services:

```bash
docker compose up -d
```

Inspect logs:

```bash
docker compose logs -f agent-service
docker compose logs -f dashboard
```

Stop services:

```bash
docker compose down
```

## Cloud Preparation

1. Build and tag both images with your registry namespace.
2. Push images to the target container registry.
3. Provision runtime secrets for RPC URLs, private keys, and contract addresses.
4. Deploy the agent service as a long-running worker service.
5. Deploy the dashboard as a static or containerized web service behind HTTPS.
6. Configure environment-specific observability and log retention.

## Operational Notes

- Keep private keys in a managed secret store.
- Rotate credentials and contract address manifests through environment promotion.
- Validate chain ID and contract addresses per environment before deployment.
