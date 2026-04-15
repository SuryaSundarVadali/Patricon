// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {AgentRegistry} from "../contracts/identity/AgentRegistry.sol";
import {PolicyRegistry} from "../contracts/policy/PolicyRegistry.sol";
import {ERC8004IdentityRegistry} from "../contracts/identity/ERC8004IdentityRegistry.sol";
import {ERC8004ReputationRegistry} from "../contracts/identity/ERC8004ReputationRegistry.sol";
import {ERC8004ValidationRegistry} from "../contracts/identity/ERC8004ValidationRegistry.sol";

contract DeployERC8004 is Script {

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
        vm.startBroadcast();

        identityRegistry = address(new ERC8004IdentityRegistry());
        reputationRegistry = address(new ERC8004ReputationRegistry(identityRegistry));
        validationRegistry = address(new ERC8004ValidationRegistry(identityRegistry));
        agentRegistry = address(new AgentRegistry());
        policyRegistry = address(new PolicyRegistry(agentRegistry));

        vm.stopBroadcast();

        emit ERC8004SuiteDeployed(
            identityRegistry, reputationRegistry, validationRegistry, agentRegistry, policyRegistry
        );
    }
}
