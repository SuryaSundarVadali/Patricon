// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPolicyRegistry
/// @notice Read-only interface consumed by adapters and settlement connectors.
interface IPolicyRegistry {
    /// @notice Returns policy configuration bound to an agent.
    /// @param agent Agent account address.
    /// @return policyHash Policy hash configured for the agent.
    /// @return policyVersion Policy version identifier.
    /// @return circuitVersion Circuit version identifier.
    /// @return active Whether the policy is currently active.
    function getPolicyForAgent(address agent)
        external
        view
        returns (bytes32 policyHash, uint64 policyVersion, uint64 circuitVersion, bool active);
}
