// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AgentRegistry} from "../contracts/identity/AgentRegistry.sol";
import {PolicyRegistry} from "../contracts/policy/PolicyRegistry.sol";
import {VerifierIdentity} from "../contracts/verifier/PatriconIdentityVerifier.sol";
import {VerifierPolicy} from "../contracts/verifier/PatriconPolicyVerifier.sol";
import {MockYieldPool} from "../contracts/adapters/MockYieldPool.sol";
import {PolicyEnforcedDeFiAdapter} from "../contracts/adapters/PolicyEnforcedDeFiAdapter.sol";
import {SettlementConnector} from "../contracts/adapters/SettlementConnector.sol";

interface Vm {
    function startBroadcast() external;
    function stopBroadcast() external;
}

/// @title DeployPatricon
/// @notice Foundry deployment script for the Patricon contract stack.
/// @dev run(address targetPoolOverride) deploys a full stack and returns all deployed addresses.
///      If targetPoolOverride is zero address, a MockYieldPool is deployed and used.
contract DeployPatricon {
    Vm internal constant VM = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    event ContractsDeployed(
        address identityVerifier,
        address policyVerifier,
        address policyRegistry,
        address agentRegistry,
        address targetPool,
        address policyEnforcedDeFiAdapter,
        address settlementConnector
    );

    /// @notice Default deployment entrypoint used by forge script when no --sig is provided.
    /// @dev Uses address(0), which deploys MockYieldPool.
    function run()
        external
        returns (
            address identityVerifier,
            address policyVerifier,
            address policyRegistry,
            address agentRegistry,
            address targetPool,
            address policyEnforcedDeFiAdapter,
            address settlementConnector
        )
    {
        return _run(address(0));
    }

    function run(address targetPoolOverride)
        external
        returns (
            address identityVerifier,
            address policyVerifier,
            address policyRegistry,
            address agentRegistry,
            address targetPool,
            address policyEnforcedDeFiAdapter,
            address settlementConnector
        )
    {
        return _run(targetPoolOverride);
    }

    function _run(address targetPoolOverride)
        internal
        returns (
            address identityVerifier,
            address policyVerifier,
            address policyRegistry,
            address agentRegistry,
            address targetPool,
            address policyEnforcedDeFiAdapter,
            address settlementConnector
        )
    {
        VM.startBroadcast();

        identityVerifier = address(new VerifierIdentity());
        policyVerifier = address(new VerifierPolicy());
        agentRegistry = address(new AgentRegistry());
        policyRegistry = address(new PolicyRegistry(agentRegistry));

        if (targetPoolOverride == address(0)) {
            targetPool = address(new MockYieldPool());
        } else {
            targetPool = targetPoolOverride;
        }

        policyEnforcedDeFiAdapter = address(
            new PolicyEnforcedDeFiAdapter(targetPool, policyRegistry, agentRegistry, identityVerifier, policyVerifier)
        );

        settlementConnector = address(new SettlementConnector(policyRegistry, policyVerifier));

        VM.stopBroadcast();

        emit ContractsDeployed(
            identityVerifier,
            policyVerifier,
            policyRegistry,
            agentRegistry,
            targetPool,
            policyEnforcedDeFiAdapter,
            settlementConnector
        );
    }
}
