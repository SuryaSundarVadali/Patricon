// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../contracts/identity/AgentRegistry.sol";
import {ERC8004IdentityRegistry} from "../contracts/identity/ERC8004IdentityRegistry.sol";

contract AgentRegistryOpenTest is Test {
    event AgentRegistered(
        address indexed agent,
        bytes32 indexed didHash,
        bytes32 agentType,
        bytes32 publicKeyHash,
        bytes32 identityCommitment,
        uint64 identityVersion,
        bool active
    );

    event ERC8004IdentityLinked(
        address indexed agent, address indexed identityRegistry, uint256 indexed erc8004AgentId
    );

    AgentRegistry internal registry;
    ERC8004IdentityRegistry internal identity;

    address internal userAddr = vm.addr(31);
    address internal otherAddr = vm.addr(32);

    function setUp() public {
        registry = new AgentRegistry();
        identity = new ERC8004IdentityRegistry();
    }

    function testSelfRegister_succeeds() public {
        vm.expectEmit(true, true, false, false);
        emit AgentRegistered(userAddr, bytes32(uint256(1)), bytes32(0), bytes32(0), bytes32(0), 1, true);

        vm.prank(userAddr);
        registry.registerOrUpdateAgent(
            userAddr,
            keccak256("yield-farming-agent"),
            bytes32(uint256(1)),
            bytes32(uint256(2)),
            bytes32(uint256(3)),
            1,
            true
        );

        (,,, bool active) = registry.getAgentBinding(userAddr);
        assertTrue(active);
    }

    function testSelfRegister_cannotRegisterOtherAddress() public {
        vm.expectRevert(AgentRegistry.CallerNotAgent.selector);
        vm.prank(userAddr);
        registry.registerOrUpdateAgent(
            otherAddr,
            keccak256("yield-farming-agent"),
            bytes32(uint256(1)),
            bytes32(uint256(2)),
            bytes32(uint256(3)),
            1,
            true
        );
    }

    function testRevokedCannotReRegister() public {
        vm.prank(userAddr);
        registry.registerOrUpdateAgent(
            userAddr,
            keccak256("yield-farming-agent"),
            bytes32(uint256(1)),
            bytes32(uint256(2)),
            bytes32(uint256(3)),
            1,
            true
        );

        registry.setAgentStatus(userAddr, AgentRegistry.AgentStatus.Revoked);

        vm.expectRevert(AgentRegistry.InvalidTransition.selector);
        vm.prank(userAddr);
        registry.selfRegisterAgent(
            keccak256("yield-farming-agent"), bytes32(uint256(1)), bytes32(uint256(2)), bytes32(uint256(3)), 2
        );
    }

    function testAdminCanStillSetStatus() public {
        vm.prank(userAddr);
        registry.selfRegisterAgent(
            keccak256("yield-farming-agent"), bytes32(uint256(1)), bytes32(uint256(2)), bytes32(uint256(3)), 1
        );

        registry.setAgentStatus(userAddr, AgentRegistry.AgentStatus.Paused);
        (,,, bool active) = registry.getAgentBinding(userAddr);
        assertFalse(active);
    }

    function testLinkERC8004Identity_succeeds() public {
        vm.prank(userAddr);
        registry.selfRegisterAgent(
            keccak256("yield-farming-agent"), bytes32(uint256(1)), bytes32(uint256(2)), bytes32(uint256(3)), 1
        );

        vm.prank(userAddr);
        uint256 agentId = identity.register("ipfs://identity");

        vm.expectEmit(true, true, true, true);
        emit ERC8004IdentityLinked(userAddr, address(identity), agentId);

        vm.prank(userAddr);
        registry.linkERC8004Identity(address(identity), agentId);
    }

    function testLinkERC8004Identity_nonOwner_reverts() public {
        vm.prank(userAddr);
        registry.selfRegisterAgent(
            keccak256("yield-farming-agent"), bytes32(uint256(1)), bytes32(uint256(2)), bytes32(uint256(3)), 1
        );

        vm.prank(otherAddr);
        uint256 agentId = identity.register("ipfs://identity");

        vm.expectRevert(abi.encodeWithSelector(AgentRegistry.ERC8004LinkFailed.selector, agentId));
        vm.prank(userAddr);
        registry.linkERC8004Identity(address(identity), agentId);
    }
}
