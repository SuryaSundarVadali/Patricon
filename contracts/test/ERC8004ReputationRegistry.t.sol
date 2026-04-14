// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC8004IdentityRegistry} from "../contracts/identity/ERC8004IdentityRegistry.sol";
import {ERC8004ReputationRegistry} from "../contracts/identity/ERC8004ReputationRegistry.sol";

contract ERC8004ReputationRegistryTest is Test {
    ERC8004IdentityRegistry internal identity;
    ERC8004ReputationRegistry internal reputation;

    address internal ownerAddr = vm.addr(11);
    address internal clientAddr = vm.addr(12);
    address internal operatorAddr = vm.addr(13);

    uint256 internal agentId;

    function setUp() public {
        identity = new ERC8004IdentityRegistry();
        reputation = new ERC8004ReputationRegistry(address(identity));

        vm.prank(ownerAddr);
        agentId = identity.register("ipfs://agent-1");
    }

    function testGiveFeedback_succeeds() public {
        vm.prank(clientAddr);
        reputation.giveFeedback(agentId, 80, 2, "quality", "latency", "", "", bytes32(0));

        (int128 value, uint8 decimals, string memory tag1, string memory tag2, bool revoked) =
            reputation.readFeedback(agentId, clientAddr, 1);

        assertEq(value, 80);
        assertEq(decimals, 2);
        assertEq(tag1, "quality");
        assertEq(tag2, "latency");
        assertEq(revoked, false);
    }

    function testOwnerCannotGiveFeedback() public {
        vm.expectRevert(ERC8004ReputationRegistry.OwnerCannotGiveFeedback.selector);
        vm.prank(ownerAddr);
        reputation.giveFeedback(agentId, 80, 2, "quality", "latency", "", "", bytes32(0));
    }

    function testOperatorCannotGiveFeedback() public {
        vm.prank(ownerAddr);
        identity.approve(operatorAddr, agentId);

        vm.expectRevert(ERC8004ReputationRegistry.OwnerCannotGiveFeedback.selector);
        vm.prank(operatorAddr);
        reputation.giveFeedback(agentId, 80, 2, "quality", "latency", "", "", bytes32(0));
    }

    function testRevokeFeedback() public {
        vm.prank(clientAddr);
        reputation.giveFeedback(agentId, 80, 2, "quality", "latency", "", "", bytes32(0));

        vm.prank(clientAddr);
        reputation.revokeFeedback(agentId, 1);

        (,,,, bool revoked) = reputation.readFeedback(agentId, clientAddr, 1);
        assertEq(revoked, true);
    }

    function testGetSummary_filteredByClients() public {
        address secondClient = vm.addr(14);

        vm.prank(clientAddr);
        reputation.giveFeedback(agentId, 80, 2, "quality", "latency", "", "", bytes32(0));

        vm.prank(secondClient);
        reputation.giveFeedback(agentId, 20, 2, "quality", "latency", "", "", bytes32(0));

        address[] memory clients = new address[](1);
        clients[0] = clientAddr;

        (uint64 count, int128 summary, uint8 decimals) = reputation.getSummary(agentId, clients, "quality", "latency");
        assertEq(count, 1);
        assertEq(summary, 80);
        assertEq(decimals, 2);
    }

    function testGetSummary_emptyClients_reverts() public {
        address[] memory clients = new address[](0);
        vm.expectRevert(ERC8004ReputationRegistry.EmptyClientList.selector);
        reputation.getSummary(agentId, clients, "", "");
    }

    function testValueDecimalsOutOfRange_reverts() public {
        vm.expectRevert(ERC8004ReputationRegistry.InvalidValueDecimals.selector);
        vm.prank(clientAddr);
        reputation.giveFeedback(agentId, 80, 19, "quality", "latency", "", "", bytes32(0));
    }
}
