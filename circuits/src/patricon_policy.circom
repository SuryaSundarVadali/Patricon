pragma circom 2.1.6;

include "./templates/poseidon_policy_gate.circom";

template PatriconPolicyMain() {
    signal input identityCommitment;
    signal input policyCommitment;
    signal input actionHash;
    signal input nonce;

    signal output statementCommitment;

    component gate = PoseidonPolicyGate();
    gate.identityCommitment <== identityCommitment;
    gate.policyCommitment <== policyCommitment;
    gate.actionHash <== actionHash;
    gate.nonce <== nonce;

    statementCommitment <== gate.statementCommitment;
}

component main = PatriconPolicyMain();
