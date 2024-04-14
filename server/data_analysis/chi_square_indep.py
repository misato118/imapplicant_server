import sys, json
import numpy as np
import math
import matplotlib.pyplot as plt 
import scipy.stats as stats 

"""
    1. Create a contigency table
    2. Create an expected frequency table
    3. Calculate the Chi-square statistic
    4. Calculate the degree of freedom
    5. Figure out a critical value using a chi-square distribution table
    6. Compare the calculated value (from step 3) with the critical value
        to figure out if two categories have a significant association
"""

# Chi-square for independencies (This file starts calculating when a app is added with status: Interview, Accepted, or Rejected
# or when status update occurred and changed to Interview, Accepted, or Rejected)

# Get data from MongoDB
data = json.loads(sys.argv[1])
initial_combination = data['array']
application_info = data['object']

print(application_info)

"""
# Test case
initial_combination = [['req1'], ['req2'], ['req3'], ['req4'], ['req5']]
application_info = [
    {'_id': '111', 'status': 'Interview', 'requirements': ['req1', 'req2', 'req3', 'req5']},
    {'_id': '222', 'status': 'Interview', 'requirements': ['req3', 'req2', 'req4']},
    {'_id': '333', 'status': 'Accepted', 'requirements': ['req2', 'req1', 'req2', 'req6']},
    {'_id': '444', 'status': 'Rejected', 'requirements': ['req3', 'req4', 'req2']},
    {'_id': '555', 'status': 'Interview', 'requirements': ['req3', 'req2']},
    {'_id': '666', 'status': 'Rejected', 'requirements': ['req2', 'req3']},
    {'_id': '777', 'status': 'Rejected', 'requirements': ['req4', 'req3']},
    {'_id': '888', 'status': 'Accepted', 'requirements': ['req2', 'req1', 'req4', 'req3', 'req6']}
]
"""

# Count all values based on the table labels
# 1st row: Interview/Accepted, 2nd row: Rejected, 3rd row: Column total
# 1st column: requirement, 1st column: No requirement, 2nd column: Row total
app_length = len(application_info)

def get_conti_rows(row_num, requirement):
    status_filter = [] # Row total
    req_filter = [] # Row row_num, Col 1

    if row_num == 1:
        status_filter = list(filter(lambda p: p['status'] == 'interview' or p['status'] == 'accepted', application_info))
    elif row_num == 2:
        status_filter = list(filter(lambda p: p['status'] == 'rejected', application_info))
    else:
        status_filter = application_info

    for app in status_filter:
        if requirement in app['requirements']:
            req_filter.append(app)
    
    req_filter_len = len(req_filter)
    status_filter_len = len(status_filter)
    not_req_len = status_filter_len - req_filter_len

    return [req_filter_len, not_req_len, status_filter_len]

def get_expected_rows(contigency_table):
    result = []
    total = contigency_table[2][2]
    row_1_col_1 = math.ceil((contigency_table[2][0] * contigency_table[0][2]) / total)
    row_1_col_2 = math.ceil((contigency_table[2][1] * contigency_table[0][2]) / total)
    row_2_col_1 = math.ceil((contigency_table[2][0] * contigency_table[1][2]) / total)
    row_2_col_2 = math.ceil((contigency_table[2][1] * contigency_table[1][2]) / total)

    result.append([row_1_col_1, row_1_col_2])
    result.append([row_2_col_1, row_2_col_2])

    return result

def calculate_chi(contigency_table, expected_freq_table):
    chi = 0

    for outer_index in range(2):
        for inner_index in range(2):
            calc = pow(contigency_table[outer_index][inner_index] - expected_freq_table[outer_index][inner_index], 2)
            if expected_freq_table[outer_index][inner_index] != 0:
                chi += (calc) / expected_freq_table[outer_index][inner_index]
    
    return chi

"""
contigency_table = [
    get_conti_rows(1, 'req1'),
    get_conti_rows(2, 'req1'),
    get_conti_rows(3, 'req1')
]
"""

# Calculate values based on the table above
# 1st row: Interview/Accepted, 2nd row: Rejected
# 1st column: Req1 (We repeat this for all reqs), 2nd column: No Req1
#expected_freq_table = get_expected_rows(contigency_table)

# Chi-square calculation based on the two tables above
#chi_square_stat = calculate_chi(contigency_table, expected_freq_table)
#print(chi_square_stat)

# Calculate degree of freedom
#df = 1

# Check a table to see if the accepted/rejected response from companies
# are related to a certain requirement
# if yes, then it means that the requirement is influencing your application (good or bad)
# if no, there's no association. Therefore, just ignore it.
"""
alpha = 0.05
critical_value = stats.chi2.ppf(1 - alpha, df)
is_associated = False

if critical_value > chi_square_stat:
    is_associated = False
else:
    is_associated = True
"""

# Add the result to MongoDB requirements (chi_square prop)
# If there's a strong association && count for Interview/Accepted is more than Rejected
# --> Then, add 1
output = {}

for req in initial_combination:
    contigency_table = [
        get_conti_rows(1, req),
        get_conti_rows(2, req),
        get_conti_rows(3, req)
    ]
    #print(contigency_table)

    # Calculate values based on the table above
    # 1st row: Interview/Accepted, 2nd row: Rejected
    # 1st column: requirement, 2nd column: No requirement
    expected_freq_table = get_expected_rows(contigency_table)
    #print(expected_freq_table)

    # Chi-square calculation based on the two tables above
    chi_square_stat = calculate_chi(contigency_table, expected_freq_table)
    #print(chi_square_stat)

    # Calculate degree of freedom
    df = 1

    # Check a table to see if the accepted/rejected response from companies
    # are related to a certain requirement
    # if yes, then it means that the requirement is influencing your application (good or bad)
    # if no, there's no association. Therefore, just ignore it.
    alpha = 0.05
    critical_value = stats.chi2.ppf(1 - alpha, df)
    is_associated = False

    if critical_value > chi_square_stat:
        is_associated = False
    else:
        is_associated = True
    
    output[req] = { 'is_associated': is_associated, 'table': contigency_table }


new_data = { 'combined': output }
print(json.dumps(new_data))