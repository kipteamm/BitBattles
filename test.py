from collections import defaultdict

import random
import string


def generate_inputs(num_inputs):
    num_rows = 2 ** num_inputs
    result = defaultdict(list)
    
    for row in range(num_rows):
        for i in range(num_inputs):
            result[string.ascii_lowercase[i]].append(row // (2 ** (num_inputs - i - 1)) % 2)
    
    return result

def generate_outputs(num_outputs, num_inputs):
    result = defaultdict(list)

    for i in range(num_outputs):
        for j in range(2**num_inputs):
            result[string.ascii_uppercase[i]].append(round(random.random()))

    return result

print(generate_inputs(3))
print(generate_outputs(2, 3))