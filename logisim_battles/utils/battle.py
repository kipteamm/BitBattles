from collections import defaultdict

import string
import random


class TableGenerator:
    def __init__(self, inputs: int, outputs: int) -> None:
        self._table = defaultdict(list)
        self._generate_inputs(inputs)
        self._generate_outputs(inputs, outputs)
    
    def _generate_inputs(self, inputs: int) -> None:
        for row in range(2 ** inputs):
            for i in range(inputs):
                self.table[string.ascii_uppercase[i]].append(row // (2 ** (inputs - i - 1)) % 2)
    
    def _generate_outputs(self, inputs: int, outputs: int) -> None:
        for i in range(outputs):
            for j in range(2**inputs):
                self.table[string.ascii_uppercase[25 - i]].append(round(random.random()))

    @property
    def table(self) -> dict:
        return self._table
