pragma circom 2.1.6;

include "../common/poseidon_wrappers.circom";
include "../common/merkle_poseidon.circom";
include "../common/range_checks.circom";

template AgentRegistryMembership(depth) {
    // Public inputs used by on-chain verification.
    signal input merkleRoot;
    signal input agentPublicKeyHash;
    signal input policyHash;
    signal input identityNonce;

    // Private witness inputs.
    signal input merkleLeaf;
    signal input merklePathElements[depth];
    signal input merklePathIndices[depth];
    signal input agentSecret;

    // Public outputs.
    signal output identityCommitment;
    signal output replayNullifier;

    component leafHash = Poseidon2();
    leafHash.in[0] <== agentPublicKeyHash;
    leafHash.in[1] <== agentSecret;

    identityCommitment <== leafHash.out;
    merkleLeaf === identityCommitment;

    component proof = PoseidonBinaryMerkleProof(depth);
    proof.leaf <== merkleLeaf;
    for (var i = 0; i < depth; i++) {
        proof.pathElements[i] <== merklePathElements[i];
        proof.pathIndices[i] <== merklePathIndices[i];
    }
    proof.root === merkleRoot;

    // Bind proof usage to a nonce and policy fingerprint to reduce replay surface.
    component nonceRange = AssertLeq64();
    nonceRange.left <== identityNonce;
    nonceRange.right <== 18446744073709551615;

    component nullifierHash = Poseidon3();
    nullifierHash.in[0] <== agentPublicKeyHash;
    nullifierHash.in[1] <== policyHash;
    nullifierHash.in[2] <== identityNonce;
    replayNullifier <== nullifierHash.out;
}

component main { public [merkleRoot, agentPublicKeyHash, policyHash, identityNonce] } = AgentRegistryMembership(8);