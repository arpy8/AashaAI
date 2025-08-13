---
title: Aasha AI Backend API
colorFrom: yellow
colorTo: yellow
sdk: docker
---

# Aasha AI Backend API

**Deployment Link:** [Live Server](https://arpy8-aasha-ai-backend-server.hf.space)  
**Source Code:** [Hugging Face Repo](https://huggingface.co/spaces/arpy8/aasha-ai-backend-server/tree/main)

---

## Tech Stack

- **Language:** Python 3.12.6  
- **Framework:** FastAPI  
- **Containerization:** Docker  
- **Deployment:** Hugging Face Spaces  
- **Package Management:** `pip`

---

## Installation & Local Development

You can run this project locally for testing and development.

### 1. Clone the Repository

```bash
git clone https://huggingface.co/spaces/arpy8/aasha-ai-backend-server
cd aasha-ai-backend-server
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run Locally

```bash
python main.py
```

The server will be available at: **[http://127.0.0.1:7860](http://127.0.0.1:7860)**

---

## Run with Docker

```bash
docker build -t aasha-ai-backend .
docker run -p 7860:7860 aasha-ai-backend
```

---

## API Documentation

Once the backend is running, interactive API docs are available at:

* Swagger UI: `/docs`
* ReDoc: `/redoc`