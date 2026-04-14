// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgentRegistry} from "./IAgentRegistry.sol";

/// @title Patricon AgentRegistry
/// @notice Registers agents, identity bindings, and registry Merkle root used by identity proofs.
contract AgentRegistry is IAgentRegistry {
    error NotOwner();
    error MissingRole(bytes32 role, address account);
    error InvalidAgent();
    error InvalidHash();
    error InvalidVersion();
    error ContractPaused();
    error InvalidTransition();

    bytes32 public constant AGENT_REGISTRAR_ROLE = keccak256("AGENT_REGISTRAR_ROLE");
    bytes32 public constant MERKLE_ADMIN_ROLE = keccak256("MERKLE_ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN_ROLE");

    enum AgentStatus {
        Unregistered,
        Active,
        Paused,
        Revoked
    }

    struct AgentRecord {
        bytes32 agentType;
        bytes32 didHash;
        bytes32 publicKeyHash;
        bytes32 identityCommitment;
        uint64 identityVersion;
        AgentStatus status;
    }

    address public owner;
    bool public paused;

    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
    mapping(bytes32 => mapping(address => bool)) private _roles;

    mapping(address => bool) public admins;
    mapping(address => AgentRecord) private agents;

    bytes32 public identityMerkleRoot;
    uint64 public identityMerkleRootVersion;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AdminUpdated(address indexed admin, bool enabled);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event PauseStateUpdated(bool paused);

    event AgentRegistered(
        address indexed agent,
        bytes32 indexed didHash,
        bytes32 agentType,
        bytes32 publicKeyHash,
        bytes32 identityCommitment,
        uint64 identityVersion,
        bool active
    );
    event AgentStatusUpdated(address indexed agent, AgentStatus status);
    event IdentityMerkleRootUpdated(bytes32 indexed merkleRoot, uint64 indexed rootVersion);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier onlyRole(bytes32 role) {
        _onlyRole(role);
        _;
    }

    modifier whenNotPaused() {
        _whenNotPaused();
        _;
    }

    constructor() {
        owner = msg.sender;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(AGENT_REGISTRAR_ROLE, msg.sender);
        _grantRole(MERKLE_ADMIN_ROLE, msg.sender);
        _grantRole(EMERGENCY_ADMIN_ROLE, msg.sender);
        emit OwnershipTransferred(address(0), msg.sender);
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner) revert NotOwner();
    }

    function _onlyRole(bytes32 role) internal view {
        if (!_roles[role][msg.sender] && !_roles[DEFAULT_ADMIN_ROLE][msg.sender]) {
            revert MissingRole(role, msg.sender);
        }
    }

    function _whenNotPaused() internal view {
        if (paused) revert ContractPaused();
    }

    /// @notice Returns true when account has role.
    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    /// @notice Grants role to account.
    function grantRole(bytes32 role, address account) external onlyOwner {
        if (account == address(0)) revert InvalidAgent();
        _grantRole(role, account);
    }

    /// @notice Revokes role from account.
    function revokeRole(bytes32 role, address account) external onlyOwner {
        if (!_roles[role][account]) {
            return;
        }
        _roles[role][account] = false;
        emit RoleRevoked(role, account, msg.sender);
    }

    function _grantRole(bytes32 role, address account) internal {
        if (_roles[role][account]) {
            return;
        }
        _roles[role][account] = true;
        emit RoleGranted(role, account, msg.sender);
    }

    /// @notice Pauses write operations.
    function pause() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        paused = true;
        emit PauseStateUpdated(true);
    }

    /// @notice Unpauses write operations.
    function unpause() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        paused = false;
        emit PauseStateUpdated(false);
    }

    /// @notice Transfers owner/admin authority.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAgent();
        address previousOwner = owner;
        owner = newOwner;
        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        _grantRole(AGENT_REGISTRAR_ROLE, newOwner);
        _grantRole(MERKLE_ADMIN_ROLE, newOwner);
        _grantRole(EMERGENCY_ADMIN_ROLE, newOwner);
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    /// @notice Backward-compatible admin switch mapped to AGENT_REGISTRAR_ROLE.
    function setAdmin(address admin, bool enabled) external onlyOwner {
        if (admin == address(0)) revert InvalidAgent();
        admins[admin] = enabled;
        if (enabled) {
            _grantRole(AGENT_REGISTRAR_ROLE, admin);
        } else if (_roles[AGENT_REGISTRAR_ROLE][admin]) {
            _roles[AGENT_REGISTRAR_ROLE][admin] = false;
            emit RoleRevoked(AGENT_REGISTRAR_ROLE, admin, msg.sender);
        }
        emit AdminUpdated(admin, enabled);
    }

    /// @notice Registers or updates a non-revoked agent record.
    function registerOrUpdateAgent(
        address agent,
        bytes32 agentType,
        bytes32 didHash,
        bytes32 publicKeyHash,
        bytes32 identityCommitment,
        uint64 identityVersion,
        bool active
    ) external onlyRole(AGENT_REGISTRAR_ROLE) whenNotPaused {
        if (agent == address(0)) revert InvalidAgent();
        if (didHash == bytes32(0) || publicKeyHash == bytes32(0) || identityCommitment == bytes32(0)) {
            revert InvalidHash();
        }
        if (identityVersion == 0) revert InvalidVersion();
        if (agents[agent].status == AgentStatus.Revoked) revert InvalidTransition();

        agents[agent] = AgentRecord({
            agentType: agentType,
            didHash: didHash,
            publicKeyHash: publicKeyHash,
            identityCommitment: identityCommitment,
            identityVersion: identityVersion,
            status: active ? AgentStatus.Active : AgentStatus.Paused
        });

        emit AgentRegistered(agent, didHash, agentType, publicKeyHash, identityCommitment, identityVersion, active);
    }

    /// @notice Sets explicit agent lifecycle status.
    function setAgentStatus(address agent, AgentStatus nextStatus)
        external
        onlyRole(AGENT_REGISTRAR_ROLE)
        whenNotPaused
    {
        if (agent == address(0)) revert InvalidAgent();
        AgentStatus previous = agents[agent].status;
        if (previous == AgentStatus.Unregistered || previous == AgentStatus.Revoked) revert InvalidTransition();
        if (!(nextStatus == AgentStatus.Active || nextStatus == AgentStatus.Paused
                    || nextStatus == AgentStatus.Revoked)) {
            revert InvalidTransition();
        }
        agents[agent].status = nextStatus;
        emit AgentStatusUpdated(agent, nextStatus);
    }

    /// @notice Updates identity Merkle root consumed by proof verifiers.
    function updateIdentityMerkleRoot(bytes32 merkleRoot, uint64 rootVersion)
        external
        onlyRole(MERKLE_ADMIN_ROLE)
        whenNotPaused
    {
        if (merkleRoot == bytes32(0)) revert InvalidHash();
        if (rootVersion == 0) revert InvalidVersion();

        identityMerkleRoot = merkleRoot;
        identityMerkleRootVersion = rootVersion;
        emit IdentityMerkleRootUpdated(merkleRoot, rootVersion);
    }

    /// @inheritdoc IAgentRegistry
    function getAgentBinding(address agent)
        external
        view
        returns (bytes32 didHash, bytes32 publicKeyHash, bytes32 identityCommitment, bool active)
    {
        AgentRecord memory record = agents[agent];
        return (record.didHash, record.publicKeyHash, record.identityCommitment, record.status == AgentStatus.Active);
    }
}
