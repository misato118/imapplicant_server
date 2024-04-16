FROM nikolaik/python-nodejs:latest

RUN apt-get update || : && apt-get install python3 -y

WORKDIR /app

#USER pn
#WORKDIR /home/pn/app

COPY ./server ./
COPY ./__pycache__ ./__pycache__
COPY ./server/package*.json ./

COPY requirements.txt ./

ENV PIP_ROOT_USER_ACTION=ignore

RUN pip install --no-cache-dir --upgrade pip \
  && pip install --no-cache-dir -r requirements.txt

RUN python -c "import nltk; nltk.download('all')"

RUN npm install

EXPOSE 10000

CMD npm start