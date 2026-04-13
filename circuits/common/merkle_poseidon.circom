pragma circom 2.1.6;

include "./poseidon_wrappers.circom";
include "./range_checks.circom";

template PoseidonBinaryMerkleProof(depth) {
    signal input leaf;
    signal input pathElements[depth];
    signal input pathIndices[depth];
    signal output root;

    signal levelHashes[depth + 1];
    levelHashes[0] <== leaf;

    component bits[depth];
    signal leftInputs[depth];
    signal rightInputs[depth];
    component hashers[depth];

    for (var i = 0; i < depth; i++) {
        bits[i] = AssertBit();
        bits[i].in <== pathIndices[i];

        hashers[i] = Poseidon2();

        // If index bit is 0, current hash is the left child; otherwise it is the right child.
        leftInputs[i] <== levelHashes[i] + (pathElements[i] - levelHashes[i]) * pathIndices[i];
        rightInputs[i] <== pathElements[i] + (levelHashes[i] - pathElements[i]) * pathIndices[i];

        hashers[i].in[0] <== leftInputs[i];
        hashers[i].in[1] <== rightInputs[i];
        levelHashes[i + 1] <== hashers[i].out;
    }

    root <== levelHashes[depth];
}