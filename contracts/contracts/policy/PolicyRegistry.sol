// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Patricon PolicyRegistry
/// @notice Stores policy configuration and policy hash per agent for proof-gated execution.
contract PolicyRegistry {
    error NotOwner();
    error NotAdmin();
    error InvalidAgent();
    error InvalidPolicyHash();
    error InvalidVersion();

    struct PolicyConfig {
        bytes32 policyHash;
        uint64 policyVersion;
        uint64 circuitVersion;
        bool active;
    }

    address public owner;
    mapping(address => bool) public admins;
    mapping(address => PolicyConfig) private policies;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AdminUpdated(address indexed admin, bool enabled);
    event PolicyConfigured(
        address indexed agent, bytes32 indexed policyHash, uint64 policyVersion, uint64 circuitVersion, bool active
    );

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAdmin() {
        if (!(msg.sender == owner || admins[msg.sender])) revert NotAdmin();
        _;
    }

    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAgent();
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setAdmin(address admin, bool enabled) external onlyOwner {
        if (admin == address(0)) revert InvalidAgent();
        admins[admin] = enabled;
        emit AdminUpdated(admin, enabled);
    }

    function registerOrUpdatePolicy(
        address agent,
        bytes32 policyHash,
        uint64 policyVersion,
        uint64 circuitVersion,
        bool active
    ) external onlyAdmin {
        if (agent == address(0)) revert InvalidAgent();
        if (policyHash == bytes32(0)) revert InvalidPolicyHash();
        if (policyVersion == 0 || circuitVersion == 0) revert InvalidVersion();

        policies[agent] = PolicyConfig({
            policyHash: policyHash, policyVersion: policyVersion, circuitVersion: circuitVersion, active: active
        });

        emit PolicyConfigured(agent, policyHash, policyVersion, circuitVersion, active);
    }

    function getPolicyForAgent(address agent)
        external
        view
        returns (bytes32 policyHash, uint64 policyVersion, uint64 circuitVersion, bool active)
    {
        PolicyConfig memory cfg = policies[agent];
        return (cfg.policyHash, cfg.policyVersion, cfg.circuitVersion, cfg.active);
    }

    function policyHashOf(address agent) external view returns (bytes32) {
        return policies[agent].policyHash;
    }
}
