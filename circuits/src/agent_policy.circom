pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

template AgentPolicyCheck() {
    signal input tradeValue;
    signal input maxAllowedLimit;
    signal input minAllowedLimit;
    signal input policyHash;

    signal output isCompliant;

    component leq = LessEqThan(64);
    component geq = GreaterEqThan(64);
    component policyPoseidon = Poseidon(2);

    leq.in[0] <== tradeValue;
    leq.in[1] <== maxAllowedLimit;
    leq.out === 1;

    geq.in[0] <== tradeValue;
    geq.in[1] <== minAllowedLimit;
    geq.out === 1;

    policyPoseidon.inputs[0] <== maxAllowedLimit;
    policyPoseidon.inputs[1] <== minAllowedLimit;
    policyPoseidon.out === policyHash;

    isCompliant <== 1;
}

component main { public [policyHash] } = AgentPolicyCheck();
