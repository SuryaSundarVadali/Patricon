// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC8004IdentityRegistry} from "../contracts/identity/ERC8004IdentityRegistry.sol";

contract ERC8004IdentityRegistryTest is Test {
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);

    ERC8004IdentityRegistry internal registry;

    uint256 internal ownerPk = 0xA11CE;
    uint256 internal userPk = 0xB0B;
    uint256 internal walletPk = 0xC0DE;

    address internal ownerAddr;
    address internal userAddr;
    address internal walletAddr;

    function setUp() public {
        registry = new ERC8004IdentityRegistry();
        ownerAddr = vm.addr(ownerPk);
        userAddr = vm.addr(userPk);
        walletAddr = vm.addr(walletPk);
    }

    function testSelfRegistration_anyWallet() public {
        vm.prank(ownerAddr);
        uint256 first = registry.register("ipfs://agent-1");

        vm.prank(userAddr);
        uint256 second = registry.register("ipfs://agent-2");

        assertEq(first, 1);
        assertEq(second, 2);
        assertEq(registry.ownerOf(first), ownerAddr);
        assertEq(registry.ownerOf(second), userAddr);
    }

    function testRegisterEmitsEvent() public {
        vm.expectEmit(true, false, true, true);
        emit Registered(1, "ipfs://agent-1", ownerAddr);

        vm.prank(ownerAddr);
        registry.register("ipfs://agent-1");
    }

    function testAgentWalletSetAndClear() public {
        vm.prank(ownerAddr);
        uint256 agentId = registry.register("ipfs://agent-1");

        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)"),
                agentId,
                walletAddr,
                deadline
            )
        );
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                keccak256(
                    abi.encode(
                        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                        keccak256(bytes("ERC8004IdentityRegistry")),
                        keccak256(bytes("1")),
                        block.chainid,
                        address(registry)
                    )
                ),
                structHash
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(walletPk, digest);

        vm.prank(ownerAddr);
        registry.setAgentWallet(agentId, walletAddr, deadline, abi.encodePacked(r, s, v));
        assertEq(registry.getAgentWallet(agentId), walletAddr);

        vm.prank(ownerAddr);
        registry.transferFrom(ownerAddr, userAddr, agentId);
        assertEq(registry.getAgentWallet(agentId), address(0));
    }

    function testReservedKeyReverts() public {
        vm.prank(ownerAddr);
        uint256 agentId = registry.register("ipfs://agent-1");

        vm.expectRevert(abi.encodeWithSelector(ERC8004IdentityRegistry.ReservedMetadataKey.selector, "agentWallet"));
        vm.prank(ownerAddr);
        registry.setMetadata(agentId, "agentWallet", bytes("forbidden"));
    }

    function testSetAgentURIByOwner() public {
        vm.prank(ownerAddr);
        uint256 agentId = registry.register("ipfs://agent-1");

        vm.expectEmit(true, false, true, true);
        emit URIUpdated(agentId, "ipfs://agent-1-v2", ownerAddr);

        vm.prank(ownerAddr);
        registry.setAgentURI(agentId, "ipfs://agent-1-v2");
        assertEq(registry.tokenURI(agentId), "ipfs://agent-1-v2");

        vm.expectRevert(ERC8004IdentityRegistry.NotOwnerOrOperator.selector);
        vm.prank(userAddr);
        registry.setAgentURI(agentId, "ipfs://agent-1-v3");
    }

    function testTotalAgents() public {
        vm.prank(ownerAddr);
        registry.register("ipfs://agent-1");
        assertEq(registry.totalAgents(), 1);

        vm.prank(userAddr);
        registry.register("ipfs://agent-2");
        assertEq(registry.totalAgents(), 2);
    }
}
