pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";

template AssertBit() {
    signal input in;
    in * (1 - in) === 0;
}

template AssertLeq64() {
    signal input left;
    signal input right;

    component cmp = LessEqThan(64);
    cmp.in[0] <== left;
    cmp.in[1] <== right;
    cmp.out === 1;
}

template AssertEq() {
    signal input left;
    signal input right;

    left === right;
}