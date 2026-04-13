pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

template Poseidon2() {
    signal input in[2];
    signal output out;

    component h = Poseidon(2);
    h.inputs[0] <== in[0];
    h.inputs[1] <== in[1];

    out <== h.out;
}

template Poseidon3() {
    signal input in[3];
    signal output out;

    component h = Poseidon(3);
    h.inputs[0] <== in[0];
    h.inputs[1] <== in[1];
    h.inputs[2] <== in[2];

    out <== h.out;
}

template Poseidon5() {
    signal input in[5];
    signal output out;

    component h = Poseidon(5);
    h.inputs[0] <== in[0];
    h.inputs[1] <== in[1];
    h.inputs[2] <== in[2];
    h.inputs[3] <== in[3];
    h.inputs[4] <== in[4];

    out <== h.out;
}