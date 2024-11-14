from collections import defaultdict

import typing as t

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


class Simulate:
    def __init__(self, gates: list[dict], wires: list[dict]) -> None:
        self._gates = gates
        self._wires = wires
        self._wire_lookup = defaultdict(list)
        self._input_lookup = defaultdict(dict)
        self._outputs = []
        self._prepared = False

    def _get_input_wires(self, gate: dict) -> list:
        wires: t.Optional[list[dict]] = []

        for input in gate["inputs"]:
            if not input["x"] or not input["y"]:
                continue

            _wires = self._wire_lookup.get(f"{input['x']},{input['y']}")

            if not _wires:
                continue

            if len(_wires) > 1:
                raise ValueError("Invalid circuit. Gate inputs cannot have more than one input wire.")

            wire = _wires[0]
            wires.append(wire)

            if self._prepared:
                continue

            if input["x"] == wire["startX"] and input["y"] == wire["startY"]:
                self._input_lookup[f"{wire['startX']},{wire['startY']}"] = gate
                continue

            self._input_lookup[f"{wire['endX']},{wire['endY']}"] = gate

        return wires

    def _prepare(self) -> None:
        self._outputs = []

        for wire in self._wires:
            wire["state"] = "off"
            wire["visited"] = False

            if self._prepared:
                continue

            self._wire_lookup[f"{wire['startX']},{wire['startY']}"].append(wire)
            self._wire_lookup[f"{wire['endX']},{wire['endY']}"].append(wire)

        for gate in self._gates:
            gate["inputStates"] = self._get_input_wires(gate)

        self._prepared = True

    def _get_output_wire(self, gate: dict) -> t.Optional[dict]:
        if not gate["output"]["x"] or not gate["output"]["y"]:
            return None

        wires = self._wire_lookup.get(f"{gate['output']['x']},{gate['output']['y']}")
        if not wires:
            return None

        return wires[0]

    def _get_input_wire_index(self, gate: dict, wire: dict) -> int:
        gate["completed"] = 0
        index = None

        for i in range(len(gate["inputStates"])):
            _wire = gate["inputStates"][i]
            if isinstance(_wire, int):
                gate["completed"] += 1

            if wire == _wire:
                index = i

        if index == None:
            raise ValueError("Invalid gate 1")

        return index

    def _evaluate(self, gate: dict) -> int:
        gate_type = gate["type"]
        inputs = gate["inputStates"]

        if gate_type == "AND":
            return int(all(inputs))

        if gate_type == "OR":
            return int(any(inputs))

        if gate_type == "NOT":
            return int(not inputs[0])

        if gate_type == "INPUT":
            raise ValueError("Inputs should not evaluated")

        if gate_type == "OUTPUT":
            gate["value"] = inputs[0]
            return gate["value"]

        raise ValueError("Invalid circuit. Gate does not exist")

    def _evaluate_gate(self, gate: dict, wire: dict, state: int) -> None:
        input_wire_index = self._get_input_wire_index(gate, wire)
        gate["inputStates"][input_wire_index] = state

        if (gate["completed"] + 1) < len(gate["inputStates"]):
            return

        _state = self._evaluate(gate)
        output_wire = self._get_output_wire(gate)

        if output_wire:
            return self._propagate_signal(output_wire, _state)

    def _propagate_signal(self, wire: dict, state: int) -> None:
        if wire["visited"]:
            return

        wire["state"] = "on" if state else "off"
        wire["visited"] = True

        gate = self._input_lookup.get(f"{wire['startX']},{wire['startY']}")
        if not gate:
            gate = self._input_lookup.get(f"{wire['endX']},{wire['endY']}")

        if gate:
            return self._evaluate_gate(gate, wire, state)

        wires = self._wire_lookup.get(f"{wire['startX']},{wire['startY']}", [])
        wires.extend(self._wire_lookup.get(f"{wire['endX']},{wire['endY']}", []))

        for wire in wires:
            if wire["visited"]:
                continue

            self._propagate_signal(wire, state)

    def simulate(self, initial_states: dict) -> None:
        self._prepare()

        for gate in self._gates:
            if gate["type"] == "OUTPUT":
                self._outputs.append(gate)
                continue

            if gate["type"] != "INPUT":
                continue

            wire = self._get_output_wire(gate)
            if not wire:
                raise ValueError("Invalid circuit. Inputs not connected.")

            self._propagate_signal(wire, initial_states.get(gate["id"], 1))

    def test(self, truthtable: dict) -> bool:
        for i in range(len(truthtable["A"])):
            inputs = {}
            outputs = {}

            for key, value in truthtable.items():
                if ord(key) > 77:
                    outputs[key] = value[i]
                else:
                    inputs[key] = value[i]

            self.simulate(inputs)

            for output in self._outputs:
                if output["value"] != outputs[output["id"]]:
                    return False

        return True
