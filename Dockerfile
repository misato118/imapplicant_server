FROM python:3.11

WORKDIR /app
RUN python -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install -r requirements.txt

FROM node:18-alpine

WORKDIR /app

COPY ./server ./
COPY ./__pycache__ ./__pycache__
COPY ./server/package*.json ./

RUN npm install

EXPOSE 10000

CMD npm start