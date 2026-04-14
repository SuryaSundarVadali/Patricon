// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "../contracts/identity/AgentRegistry.sol";
import {PolicyRegistry} from "../contracts/policy/PolicyRegistry.sol";
import {ERC8004IdentityRegistry} from "../contracts/identity/ERC8004IdentityRegistry.sol";
import {ERC8004ReputationRegistry} from "../contracts/identity/ERC8004ReputationRegistry.sol";
import {ERC8004ValidationRegistry} from "../contracts/identity/ERC8004ValidationRegistry.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

contract DeployERC8004 {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    event ERC8004SuiteDeployed(
        address identityRegistry,
        address reputationRegistry,
        address validationRegistry,
        address agentRegistry,
        address policyRegistry
    );

    function run()
        external
        returns (
            address identityRegistry,
            address reputationRegistry,
            address validationRegistry,
            address agentRegistry,
            address policyRegistry
        )
    {
        VM.startBroadcast();

        identityRegistry = address(new ERC8004IdentityRegistry());
        reputationRegistry = address(new ERC8004ReputationRegistry(identityRegistry));
        validationRegistry = address(new ERC8004ValidationRegistry(identityRegistry));
        agentRegistry = address(new AgentRegistry());
        policyRegistry = address(new PolicyRegistry(agentRegistry));

        VM.stopBroadcast();

        emit ERC8004SuiteDeployed(
            identityRegistry, reputationRegistry, validationRegistry, agentRegistry, policyRegistry
        );
    }
}
