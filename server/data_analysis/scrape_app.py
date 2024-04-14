from bs4 import BeautifulSoup
import pandas as pd
from gensim.models import Word2Vec
from sklearn.decomposition import PCA
from matplotlib import pyplot
import numpy as np
import tensorflow as tf
import requests
#import re
#import xmltojson
import sys, json
from rake_nltk import Rake 
from wordcloud import WordCloud 
  
# Initializing the Rake instance 
rake = Rake() 

# This file is to scrape a job description by a url

# define training data

#str = input1.split()
#sentences = [str]
#print(sentences)

def is_json(myjson):
    try:
        json.loads(myjson)
    except ValueError as e:
        return False
    return True

"""
with open('job_postings.csv', 'rb') as f:
    #text = f.read()
    text = f['title'].tolist()
    sentences = [text]
"""

# Get a url
#url = 'https://nasdaq.wd1.myworkdayjobs.com/en-US/US_External_Career_Site/job/Canada---St-Johns---Newfoundland--Labrador/Verafin----Senior-Software-Developer--Analytics-_R0017968'
dt = json.loads(sys.argv[1])
url = dt['url']

r = requests.get(url)

# Make a soup
soup = BeautifulSoup(r.text, 'html.parser')

## For websites with all data under script or meta content
# Fetch title, company, location
html = soup.find('script').contents[0]
testInput = ''

if is_json(html):
    # Get javascript object inside the script
    data = json.loads(html)
    print(data['identifier']['name'])
    print(data['hiringOrganization']['name']) # company
    print(data['jobLocation']['address']['addressLocality']) # location
    print(data['description']) # description
    testInput = data['description']
    output = [data['identifier']['name'], data['hiringOrganization']['name'], data['jobLocation']['address']['addressLocality']]
else:
    output = None

rake.extract_keywords_from_text(testInput) 
keywords = rake.get_ranked_phrases() 
  
# Displaying the keywords
#print(keywords) 
  
# Generate WordCloud 
wordcloud = ''

if (len(keywords) > 0):
    wordcloud = WordCloud().generate(' '.join(keywords))
    # Display the WordCloud 
    pyplot.figure(figsize=(10,10)) 
    pyplot.imshow(wordcloud, interpolation='bilinear') 
    pyplot.axis('off') 
    pyplot.show()
else:
    output = None

## For websites with 
#print(soup.find_all(id='job-details-wrapper')) # is it all cases that reqs are listed under ul&li?


new_data = { 'output': output }
#print(json.dumps(new_data))
json.dumps(new_data)