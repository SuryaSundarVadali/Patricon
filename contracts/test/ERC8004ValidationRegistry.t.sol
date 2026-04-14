// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC8004IdentityRegistry} from "../contracts/identity/ERC8004IdentityRegistry.sol";
import {ERC8004ValidationRegistry} from "../contracts/identity/ERC8004ValidationRegistry.sol";

contract ERC8004ValidationRegistryTest is Test {
    ERC8004IdentityRegistry internal identity;
    ERC8004ValidationRegistry internal validation;

    address internal ownerAddr = vm.addr(21);
    address internal nonOwnerAddr = vm.addr(22);
    address internal validatorAddr = vm.addr(23);
    address internal wrongValidatorAddr = vm.addr(24);

    uint256 internal agentId;

    function setUp() public {
        identity = new ERC8004IdentityRegistry();
        validation = new ERC8004ValidationRegistry(address(identity));

        vm.prank(ownerAddr);
        agentId = identity.register("ipfs://agent-validation");
    }

    function testValidationRequest_byOwner() public {
        bytes32 requestHash = keccak256("req-1");

        vm.prank(ownerAddr);
        validation.validationRequest(validatorAddr, agentId, "ipfs://req", requestHash);

        (address validator,,,,,) = validation.getValidationStatus(requestHash);
        assertEq(validator, validatorAddr);
    }

    function testValidationRequest_byNonOwner_reverts() public {
        vm.expectRevert(abi.encodeWithSelector(ERC8004ValidationRegistry.AgentNotRegistered.selector, agentId));
        vm.prank(nonOwnerAddr);
        validation.validationRequest(validatorAddr, agentId, "ipfs://req", keccak256("req-1"));
    }

    function testValidationResponse_byValidator() public {
        bytes32 requestHash = keccak256("req-2");

        vm.prank(ownerAddr);
        validation.validationRequest(validatorAddr, agentId, "ipfs://req", requestHash);

        vm.prank(validatorAddr);
        validation.validationResponse(requestHash, 100, "ipfs://resp", keccak256("resp"), "passed");

        (, uint256 returnedAgentId, uint8 response,,,) = validation.getValidationStatus(requestHash);
        assertEq(returnedAgentId, agentId);
        assertEq(response, 100);
    }

    function testValidationResponse_byWrongAddress_reverts() public {
        bytes32 requestHash = keccak256("req-3");

        vm.prank(ownerAddr);
        validation.validationRequest(validatorAddr, agentId, "ipfs://req", requestHash);

        vm.expectRevert(ERC8004ValidationRegistry.NotValidatorForRequest.selector);
        vm.prank(wrongValidatorAddr);
        validation.validationResponse(requestHash, 100, "ipfs://resp", keccak256("resp"), "passed");
    }

    function testProgressiveValidation() public {
        bytes32 requestHash = keccak256("req-4");

        vm.prank(ownerAddr);
        validation.validationRequest(validatorAddr, agentId, "ipfs://req", requestHash);

        vm.prank(validatorAddr);
        validation.validationResponse(requestHash, 20, "", bytes32(0), "running");
        (,,,,, uint256 firstUpdate) = validation.getValidationStatus(requestHash);

        vm.warp(block.timestamp + 10);
        vm.prank(validatorAddr);
        validation.validationResponse(requestHash, 100, "", bytes32(0), "done");
        (,, uint8 response,, string memory tag, uint256 secondUpdate) = validation.getValidationStatus(requestHash);

        assertEq(response, 100);
        assertEq(tag, "done");
        assertGt(secondUpdate, firstUpdate);
    }

    function testGetSummary_averaged() public {
        bytes32 requestHashA = keccak256("req-a");
        bytes32 requestHashB = keccak256("req-b");

        vm.prank(ownerAddr);
        validation.validationRequest(validatorAddr, agentId, "", requestHashA);
        vm.prank(ownerAddr);
        validation.validationRequest(validatorAddr, agentId, "", requestHashB);

        vm.prank(validatorAddr);
        validation.validationResponse(requestHashA, 40, "", bytes32(0), "score");
        vm.prank(validatorAddr);
        validation.validationResponse(requestHashB, 80, "", bytes32(0), "score");

        address[] memory validators = new address[](0);
        (uint64 count, uint8 avg) = validation.getSummary(agentId, validators, "score");
        assertEq(count, 2);
        assertEq(avg, 60);
    }
}
