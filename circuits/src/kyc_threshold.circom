pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/comparators.circom";

template KYCTierCheck() {
    signal input actualTier;
    signal input requiredTier;

    signal output meetsRequirement;

    component geRequired = GreaterEqThan(8);
    component geOne = GreaterEqThan(8);
    component leThree = LessEqThan(8);

    geRequired.in[0] <== actualTier;
    geRequired.in[1] <== requiredTier;
    geRequired.out === 1;

    geOne.in[0] <== actualTier;
    geOne.in[1] <== 1;
    geOne.out === 1;

    leThree.in[0] <== actualTier;
    leThree.in[1] <== 3;
    leThree.out === 1;

    meetsRequirement <== 1;
}

component main { public [requiredTier] } = KYCTierCheck();
