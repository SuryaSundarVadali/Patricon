pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";

template PoseidonPolicyGate() {
    signal input identityCommitment;
    signal input policyCommitment;
    signal input actionHash;
    signal input nonce;

    signal output statementCommitment;

    component h = Poseidon(4);
    h.inputs[0] <== identityCommitment;
    h.inputs[1] <== policyCommitment;
    h.inputs[2] <== actionHash;
    h.inputs[3] <== nonce;

    statementCommitment <== h.out;
}
