# Docker Deployment Guide (Hong Kong / Singapore Server)

This guide explains how to deploy the HHTools application on a self-hosted server (e.g., Aliyun HK, Tencent HK, AWS Singapore) using Docker and Nginx.

## Architecture & Database Choice

**Recommended: Keep MemFire Cloud (China) + HK Server**

You **do NOT** need to migrate from MemFire to Supabase. This hybrid architecture is actually optimal for performance:

1.  **Database (MemFire)**: Located in China (Beijing/Hangzhou).
    *   **User Experience**: Since HHTools uses a "Client-side" architecture, the user's browser (likely in China) connects directly to MemFire. This is **extremely fast**.
2.  **Server (HK/SG)**: Hosts the Frontend and Email Service.
    *   **Speed**: China <-> HK latency is low (30-50ms).
    *   **Compliance**: No ICP license required for the server.

## Prerequisites

1.  **Server**: A Linux server (Ubuntu 20.04+ recommended).
2.  **Docker**: Install Docker and Docker Compose.
    ```bash
    # Install Docker
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    ```

## Deployment Steps

1.  **Clone the Repository** (or upload files via SFTP)
    ```bash
    git clone <your-repo-url> hhtools
    cd hhtools
    ```

2.  **Configure Environment Variables**
    Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
    Edit `.env`:
    ```bash
    nano .env
    ```
    *   `RESEND_API_KEY`: **Required**. Get this from [Resend.com](https://resend.com).
    *   `VITE_SUPABASE_URL`: **Leave empty** to use MemFire Cloud default, or paste your MemFire URL.
    *   `VITE_SUPABASE_ANON_KEY`: **Leave empty** to use MemFire Cloud default, or paste your MemFire Key.

3.  **Build and Run**
    ```bash
    docker compose up -d --build
    ```

4.  **Verify**
    - Open `http://<your-server-ip>`.
    - Login and check if data loads (connects to MemFire).
    - Send an invite email (connects to your HK server -> Resend).

## Troubleshooting

- **Database Connection**: If data doesn't load, check if you accidentally set `VITE_SUPABASE_URL` to an invalid value in `.env`.
- **Email Sending**: Check logs with `docker compose logs backend`.
