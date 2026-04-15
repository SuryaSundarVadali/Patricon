pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template JurisdictionMembership() {
    signal input jurisdiction;
    signal input allowedSetHash;

    signal output isMember;

    component allowedSetPoseidon = Poseidon(3);

    // Constrain jurisdiction to be one of {1, 2, 3}.
    (jurisdiction - 1) * (jurisdiction - 2) * (jurisdiction - 3) === 0;

    allowedSetPoseidon.inputs[0] <== 1;
    allowedSetPoseidon.inputs[1] <== 2;
    allowedSetPoseidon.inputs[2] <== 3;
    allowedSetPoseidon.out === allowedSetHash;

    isMember <== 1;
}

component main { public [allowedSetHash] } = JurisdictionMembership();
