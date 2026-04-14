// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../contracts/identity/AgentRegistry.sol";
import {PolicyRegistry} from "../contracts/policy/PolicyRegistry.sol";

contract PolicyRegistrySelfServiceTest is Test {
    event PolicyConfigured(
        address indexed agent, bytes32 indexed policyHash, uint64 policyVersion, uint64 circuitVersion, bool active
    );

    AgentRegistry internal agentRegistry;
    PolicyRegistry internal policyRegistry;

    address internal activeAgent = vm.addr(41);
    address internal inactiveAgent = vm.addr(42);

    function setUp() public {
        agentRegistry = new AgentRegistry();
        policyRegistry = new PolicyRegistry(address(agentRegistry));

        vm.prank(activeAgent);
        agentRegistry.selfRegisterAgent(
            keccak256("yield-farming-agent"), bytes32(uint256(11)), bytes32(uint256(12)), bytes32(uint256(13)), 1
        );
    }

    function testActivatedAgentCanRegisterPolicy() public {
        bytes32 policyHash = keccak256("policy-active");

        vm.expectEmit(true, true, false, false);
        emit PolicyConfigured(activeAgent, policyHash, 1, 1, true);

        vm.prank(activeAgent);
        policyRegistry.registerOrUpdatePolicy(activeAgent, policyHash, 1, 1, true);

        (bytes32 configuredHash, uint64 policyVersion, uint64 circuitVersion, bool isActive) =
            policyRegistry.getPolicyForAgent(activeAgent);
        assertEq(configuredHash, policyHash);
        assertEq(policyVersion, 1);
        assertEq(circuitVersion, 1);
        assertTrue(isActive);
    }

    function testInactiveAgent_cannotRegisterPolicy() public {
        vm.expectRevert(PolicyRegistry.AgentNotActive.selector);
        vm.prank(inactiveAgent);
        policyRegistry.selfRegisterPolicy(keccak256("policy-inactive"), 1, 1);
    }

    function testCallerNotAgent_reverts() public {
        vm.expectRevert(PolicyRegistry.CallerNotAgent.selector);
        vm.prank(activeAgent);
        policyRegistry.registerOrUpdatePolicy(inactiveAgent, keccak256("policy"), 1, 1, true);
    }

    function testAdminCanDeprecatePolicy() public {
        bytes32 policyHash = keccak256("policy-active");

        vm.prank(activeAgent);
        policyRegistry.selfRegisterPolicy(policyHash, 1, 1);

        policyRegistry.setPolicyStatus(activeAgent, PolicyRegistry.PolicyStatus.Deprecated);

        (,,, bool isActive) = policyRegistry.getPolicyForAgent(activeAgent);
        assertFalse(isActive);
    }
}
