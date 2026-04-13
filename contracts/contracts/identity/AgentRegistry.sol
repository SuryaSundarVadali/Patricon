// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Patricon AgentRegistry
/// @notice Registers agents, identity bindings, and registry Merkle root used by identity proofs.
contract AgentRegistry {
    error NotOwner();
    error NotAdmin();
    error InvalidAgent();
    error InvalidHash();
    error InvalidVersion();

    struct AgentRecord {
        bytes32 agentType;
        bytes32 didHash;
        bytes32 publicKeyHash;
        bytes32 identityCommitment;
        uint64 identityVersion;
        bool active;
    }

    address public owner;
    mapping(address => bool) public admins;
    mapping(address => AgentRecord) private agents;

    bytes32 public identityMerkleRoot;
    uint64 public identityMerkleRootVersion;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AdminUpdated(address indexed admin, bool enabled);
    event AgentRegistered(
        address indexed agent,
        bytes32 indexed didHash,
        bytes32 agentType,
        bytes32 publicKeyHash,
        bytes32 identityCommitment,
        uint64 identityVersion,
        bool active
    );
    event IdentityMerkleRootUpdated(bytes32 indexed merkleRoot, uint64 indexed rootVersion);

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

    function registerOrUpdateAgent(
        address agent,
        bytes32 agentType,
        bytes32 didHash,
        bytes32 publicKeyHash,
        bytes32 identityCommitment,
        uint64 identityVersion,
        bool active
    ) external onlyAdmin {
        if (agent == address(0)) revert InvalidAgent();
        if (didHash == bytes32(0) || publicKeyHash == bytes32(0) || identityCommitment == bytes32(0)) {
            revert InvalidHash();
        }
        if (identityVersion == 0) revert InvalidVersion();

        agents[agent] = AgentRecord({
            agentType: agentType,
            didHash: didHash,
            publicKeyHash: publicKeyHash,
            identityCommitment: identityCommitment,
            identityVersion: identityVersion,
            active: active
        });

        emit AgentRegistered(agent, didHash, agentType, publicKeyHash, identityCommitment, identityVersion, active);
    }

    function updateIdentityMerkleRoot(bytes32 merkleRoot, uint64 rootVersion) external onlyAdmin {
        if (merkleRoot == bytes32(0)) revert InvalidHash();
        if (rootVersion == 0) revert InvalidVersion();

        identityMerkleRoot = merkleRoot;
        identityMerkleRootVersion = rootVersion;
        emit IdentityMerkleRootUpdated(merkleRoot, rootVersion);
    }

    function getAgentBinding(address agent)
        external
        view
        returns (bytes32 didHash, bytes32 publicKeyHash, bytes32 identityCommitment, bool active)
    {
        AgentRecord memory record = agents[agent];
        return (record.didHash, record.publicKeyHash, record.identityCommitment, record.active);
    }
}
