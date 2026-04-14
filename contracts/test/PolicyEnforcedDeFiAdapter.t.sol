// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "../contracts/identity/AgentRegistry.sol";
import {PolicyRegistry} from "../contracts/policy/PolicyRegistry.sol";
import {PolicyEnforcedDeFiAdapter} from "../contracts/adapters/PolicyEnforcedDeFiAdapter.sol";
import {MockYieldPool} from "../contracts/adapters/MockYieldPool.sol";
import {MockVerifierIdentity, MockVerifierPolicy} from "../contracts/verifier/mocks/MockVerifiers.sol";

interface Vm {
    function expectRevert(bytes calldata) external;
    function prank(address) external;
}

contract PolicyEnforcedDeFiAdapterTest {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    AgentRegistry internal agentRegistry;
    PolicyRegistry internal policyRegistry;
    MockVerifierIdentity internal identityVerifier;
    MockVerifierPolicy internal policyVerifier;
    MockYieldPool internal pool;
    PolicyEnforcedDeFiAdapter internal adapter;

    address internal constant AGENT = address(0xA11CE);

    function setUp() public {
        agentRegistry = new AgentRegistry();
        policyRegistry = new PolicyRegistry(address(agentRegistry));
        identityVerifier = new MockVerifierIdentity();
        policyVerifier = new MockVerifierPolicy();
        pool = new MockYieldPool();

        adapter = new PolicyEnforcedDeFiAdapter(
            address(pool),
            address(policyRegistry),
            address(agentRegistry),
            address(identityVerifier),
            address(policyVerifier)
        );

        bytes32 didHash = bytes32(uint256(1001));
        bytes32 publicKeyHash = bytes32(uint256(1002));
        bytes32 identityCommitment = bytes32(uint256(1003));
        bytes32 merkleRoot = bytes32(uint256(2001));
        bytes32 policyHash = bytes32(uint256(3001));

        VM.prank(AGENT);
        agentRegistry.registerOrUpdateAgent(
            AGENT, keccak256("yield-farming-agent"), didHash, publicKeyHash, identityCommitment, 1, true
        );
        agentRegistry.updateIdentityMerkleRoot(merkleRoot, 1);

        VM.prank(AGENT);
        policyRegistry.registerOrUpdatePolicy(AGENT, policyHash, 1, 1, true);
    }

    function testDepositWithValidProofPasses() public {
        PolicyEnforcedDeFiAdapter.Groth16Proof memory emptyIdentityProof;
        PolicyEnforcedDeFiAdapter.Groth16Proof memory emptyPolicyProof;

        uint256[6] memory identitySignals;
        identitySignals[0] = 1003;
        identitySignals[2] = 2001;
        identitySignals[3] = 1002;
        identitySignals[4] = 3001;
        identitySignals[5] = 1;

        uint256[14] memory policySignals;
        policySignals[2] = 3001;
        policySignals[3] = 1_000;
        policySignals[11] = 11;
        policySignals[12] = 1_710_000_500;
        policySignals[13] = 19;

        adapter.depositWithProof(
            AGENT, 700, 11, 1_710_000_500, 19, emptyIdentityProof, identitySignals, emptyPolicyProof, policySignals
        );

        if (pool.totalDeposits() != 700) revert("expected deposit to be executed");
    }

    function testDepositWithInvalidProofReverts() public {
        PolicyEnforcedDeFiAdapter.Groth16Proof memory emptyIdentityProof;
        PolicyEnforcedDeFiAdapter.Groth16Proof memory emptyPolicyProof;

        uint256[6] memory identitySignals;
        identitySignals[0] = 1003;
        identitySignals[2] = 2001;
        identitySignals[3] = 1002;
        identitySignals[4] = 3001;
        identitySignals[5] = 1;

        uint256[14] memory policySignals;
        policySignals[2] = 3001;
        policySignals[3] = 1_000;
        policySignals[11] = 11;
        policySignals[12] = 1_710_000_500;
        policySignals[13] = 19;

        policyVerifier.setShouldVerify(false);
        VM.expectRevert(abi.encodeWithSelector(PolicyEnforcedDeFiAdapter.PolicyProofInvalid.selector));

        adapter.depositWithProof(
            AGENT, 700, 11, 1_710_000_500, 19, emptyIdentityProof, identitySignals, emptyPolicyProof, policySignals
        );
    }

    function testDepositWithMismatchedPolicyHashReverts() public {
        PolicyEnforcedDeFiAdapter.Groth16Proof memory emptyIdentityProof;
        PolicyEnforcedDeFiAdapter.Groth16Proof memory emptyPolicyProof;

        uint256[6] memory identitySignals;
        identitySignals[0] = 1003;
        identitySignals[2] = 2001;
        identitySignals[3] = 1002;
        identitySignals[4] = 9999;
        identitySignals[5] = 1;

        uint256[14] memory policySignals;
        policySignals[2] = 3001;
        policySignals[3] = 1_000;
        policySignals[11] = 11;
        policySignals[12] = 1_710_000_500;
        policySignals[13] = 19;

        VM.expectRevert(abi.encodeWithSelector(PolicyEnforcedDeFiAdapter.PolicyHashMismatch.selector));

        adapter.depositWithProof(
            AGENT, 700, 11, 1_710_000_500, 19, emptyIdentityProof, identitySignals, emptyPolicyProof, policySignals
        );
    }
}
