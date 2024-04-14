import sys, json
import numpy as np

#print(sys.argv[1])

threshold = 1
# Check if there's any more requirements to get combinations
is_completed = False
data = json.loads(sys.argv[1])
initial_combination = data['array']
requirement_info = data['object']

"""
initial_combination = [['req1'], ['req2'], ['req3'], ['req4'], ['req5']]
requirement_info = [
    {'_id': '111', 'name': 'req1', 'app_arr': ['1', '2', '3', '4', '5', '6'], '__v': 0},
    {'_id': '222', 'name': 'req2', 'app_arr': ['2', '1', '3', '4'], '__v': 0},
    {'_id': '333', 'name': 'req3', 'app_arr': ['1', '3', '6'], '__v': 0},
    {'_id': '444', 'name': 'req4', 'app_arr': ['5', '2', '3', '4', '8', '6'], '__v': 0},
    {'_id': '555', 'name': 'req5', 'app_arr': ['7'], '__v': 0}
]
"""
#print(requirement_info)

output = {}

# To find app_arr from requirement_info based on a name
def findAppArr(req_name):
    for obj in requirement_info:
        if req_name == obj['name']:
            return np.array(obj['app_arr'])
    return np.array([])

# initial_arr = current combination arr
# k = the number of items in current each combination
def getCombination(initial_arr, k):
    result = []

    for x in initial_arr:
        for y in initial_arr:
            new_combination = x + y # combine two lists
            combination_set = set(new_combination)
            sub_result = list(combination_set)
            sub_result.sort()
            if not(sub_result in result) and (len(sub_result) == (k + 1)):
                result.append(sub_result)

    return result

# Find frequencies for each combination
# arr includes all the combinations where each size is k
def findFrequency(arr):
    result = []

    # Loop through all the different combinations
    for sub_arr in arr:
        common_values = np.array([])
        # Loop through each item in the arrays
        for item in sub_arr:
            if len(common_values) == 0: # First item in the array
                common_values = findAppArr(item)
                #print(common_values)
            else:
                comp_values = findAppArr(item)
                common_values = np.intersect1d(common_values, comp_values)
                #print(common_values)
        
        count = len(common_values)
        if count > 0: # Remove combinations that are below a threshold (== 1)
            # arr with arr[0] == count, (arr after index 0) == a combination
            #print(count)
            new_arr = np.insert(sub_arr, 0, count)
            result.append(new_arr.tolist())

    #print(result)
    return result


combine_arr_before = initial_combination
k = 1
output[k] = findFrequency(combine_arr_before)
#print(output[k])

while (not is_completed):
    #output[k] = combine_arr_before # Add complete set of requirements to output object
    # Get combinations
    combine_arr_after = getCombination(combine_arr_before, k)
    #print(combine_arr_after)
    combine_arr_before = combine_arr_after
    if len(combine_arr_after) < 1:
        print('break')
        break

    k = k + 1
    # Find frequencies
    output[k] = findFrequency(combine_arr_after) 
    #print(output[k])



new_data = { 'combined': output }
print(json.dumps(new_data))