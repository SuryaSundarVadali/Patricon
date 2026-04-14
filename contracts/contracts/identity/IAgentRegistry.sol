// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IAgentRegistry
/// @notice Read-only interface consumed by proof-gated adapters.
interface IAgentRegistry {
    /// @notice Returns binding data for an agent address.
    /// @param agent Agent account address.
    /// @return didHash DID hash associated with the agent.
    /// @return publicKeyHash Agent public key hash.
    /// @return identityCommitment Identity commitment hash.
    /// @return active Whether the agent is currently active.
    function getAgentBinding(address agent)
        external
        view
        returns (bytes32 didHash, bytes32 publicKeyHash, bytes32 identityCommitment, bool active);

    /// @notice Returns the latest identity registry Merkle root.
    /// @return Current Merkle root.
    function identityMerkleRoot() external view returns (bytes32);
}
