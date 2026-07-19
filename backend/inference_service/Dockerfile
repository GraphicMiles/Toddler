FROM python:3.11-slim
WORKDIR /app
COPY inference_service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY inference_service/main.py ./main.py
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
