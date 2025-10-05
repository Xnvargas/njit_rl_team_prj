# Python 3.10 base (Debian Bullseye) with devcontainer
FROM mcr.microsoft.com/devcontainers/python:1-3.12-bullseye

RUN apt-get update && apt-get install -y \
    curl git build-essential pkg-config \
 && rm -rf /var/lib/apt/lists/*

RUN pip install uv