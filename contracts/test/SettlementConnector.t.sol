// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "../contracts/identity/AgentRegistry.sol";
import {PolicyRegistry} from "../contracts/policy/PolicyRegistry.sol";
import {SettlementConnector} from "../contracts/adapters/SettlementConnector.sol";
import {MockVerifierPolicy} from "../contracts/verifier/mocks/MockVerifiers.sol";

interface Vm {
    function expectRevert(bytes calldata) external;
    function prank(address) external;
}

contract SettlementConnectorTest {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    AgentRegistry internal agentRegistry;
    PolicyRegistry internal policyRegistry;
    MockVerifierPolicy internal policyVerifier;
    SettlementConnector internal connector;

    address internal constant AGENT = address(0xA11CE);
    address internal constant PAYEE = address(0xBEEF);
    address internal constant ASSET = address(0xCAFE);

    function setUp() public {
        agentRegistry = new AgentRegistry();
        policyRegistry = new PolicyRegistry(address(agentRegistry));
        policyVerifier = new MockVerifierPolicy();
        connector = new SettlementConnector(address(policyRegistry), address(policyVerifier));

        VM.prank(AGENT);
        agentRegistry.registerOrUpdateAgent(
            AGENT,
            keccak256("settlement-agent"),
            bytes32(uint256(4001)),
            bytes32(uint256(4002)),
            bytes32(uint256(4003)),
            1,
            true
        );

        VM.prank(AGENT);
        policyRegistry.registerOrUpdatePolicy(AGENT, bytes32(uint256(3001)), 1, 1, true);
    }

    function testExecuteSettlementWithValidProofPasses() public {
        SettlementConnector.Groth16Proof memory emptyProof;
        uint256[14] memory policySignals;
        policySignals[2] = 3001;
        policySignals[3] = 1_000;
        policySignals[11] = 11;
        policySignals[12] = 1_710_001_000;
        policySignals[13] = 21;

        connector.executeSettlementWithProof(
            keccak256("payment-ref-1"),
            AGENT,
            AGENT,
            PAYEE,
            ASSET,
            700,
            11,
            1_710_001_000,
            21,
            emptyProof,
            policySignals
        );
    }

    function testExecuteSettlementWithInvalidProofReverts() public {
        SettlementConnector.Groth16Proof memory emptyProof;
        uint256[14] memory policySignals;
        policySignals[2] = 3001;
        policySignals[3] = 1_000;
        policySignals[11] = 11;
        policySignals[12] = 1_710_001_000;
        policySignals[13] = 21;

        policyVerifier.setShouldVerify(false);
        VM.expectRevert(abi.encodeWithSelector(SettlementConnector.PolicyProofInvalid.selector));

        connector.executeSettlementWithProof(
            keccak256("payment-ref-2"),
            AGENT,
            AGENT,
            PAYEE,
            ASSET,
            700,
            11,
            1_710_001_000,
            21,
            emptyProof,
            policySignals
        );
    }
}
