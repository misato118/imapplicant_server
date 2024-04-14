from bs4 import BeautifulSoup
import requests
import pandas as pd
from gensim.models import Word2Vec
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
import numpy as np
import tensorflow as tf

from sklearn.feature_extraction.text import CountVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn import linear_model

# This file runs for the first time when more than 1000 attempts to change status from users occured?
# After that, it runs every 100 more times? when any existing users change their app status to Interview/Accepted/Rejected from Applied/Saved
# on MongoDB: [{'text': ['', '', '', '',...], 'result': 1}, {'text': ['', '', '', '',...], 'result': 0}, ...]

# text includes all words from one users resume && words from an application (e.g., title, requirements, etc.)
# result shows if it resulted in a positive result (1) or not (0)
data = pd.DataFrame({'text': ['All words from app & users resume', 'All words from another app', 'And so on', 'And so on'], 'result': [0,0,0,0]})

features = data['text']
results = data['result']

cv = CountVectorizer()  
features = cv.fit_transform(features)

logistic_regression = linear_model.LogisticRegression(solver='lbfgs')
model = logistic_regression.fit(features, results)


# From here runs after model is built well (exceeded a certain accuracy)
input = ['Words from a new application']

prediction = logistic_regression.predict(cv.transform(input)) #adding values for prediction
prediction = prediction[0]
print(prediction)

"""
data_x = [
    'Software Engineer',  'Software Developer', 'Developer', 'Full Stack Developer', 'Software Design Engineer',
    'ReactJS', 'JavaScript', 'Java', 'Python', 'C++', 'C#', 'HTML',
    'dental care', 'extended health care', 'flexible schedule', 'Paid time off']

label_x = np.array([2,2,2,2,2, 1,1,1,1,1,1,1, 0,0,0,0])


layer = tf.keras.layers.Hashing(num_bins=3, output_mode='one_hot')

print(layer(data_x))

one_hot_x = [tf.keras.preprocessing.text.one_hot(d, 50) for d in data_x]

padded_x = tf.keras.preprocessing.sequence.pad_sequences(one_hot_x, maxlen=4, padding = 'post')

model = tf.keras.Sequential()
model.add(tf.keras.layers.Embedding(50, 8, input_shape=(4,)))
model.add(tf.keras.layers.Flatten())
model.add(tf.keras.layers.Dense(1, activation='sigmoid'))


model.compile(optimizer='adam', loss='binary_crossentropy', 
metrics=['accuracy'])

#model.summary()

history = model.fit(padded_x, label_x, epochs=100, 
batch_size=2, verbose=0)

# plotting training graph

#plt.plot(history.history['accuracy'])
#plt.show()

def predict(word):
    one_hot_word = [tf.keras.preprocessing.text.one_hot(word, 50)]
    pad_word = tf.keras.preprocessing.sequence.pad_sequences(one_hot_word, maxlen=4,  padding='post')
    result = model.predict(pad_word)
    print(result[0][0])

predict('Software Engineer')
predict('ReactJS')
predict('extended health care')

predict('Front End Developer')
predict('CSS')
predict('Vacation Pay')
"""