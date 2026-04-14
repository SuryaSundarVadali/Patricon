// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicyRegistry} from "./IPolicyRegistry.sol";
import {IAgentRegistry} from "../identity/IAgentRegistry.sol";

/// @title Patricon PolicyRegistry
/// @notice Stores policy configuration and policy hash per agent for proof-gated execution.
contract PolicyRegistry is IPolicyRegistry {
    error NotOwner();
    error MissingRole(bytes32 role, address account);
    error InvalidAgent();
    error InvalidPolicyHash();
    error InvalidVersion();
    error InvalidPolicyStatus();
    error ContractPaused();
    error AgentNotActive();
    error CallerNotAgent();

    bytes32 public constant POLICY_ADMIN_ROLE = keccak256("POLICY_ADMIN_ROLE");
    bytes32 public constant EMERGENCY_ADMIN_ROLE = keccak256("EMERGENCY_ADMIN_ROLE");

    enum PolicyStatus {
        Unset,
        Active,
        Paused,
        Deprecated
    }

    struct PolicyConfig {
        bytes32 policyHash;
        uint64 policyVersion;
        uint64 circuitVersion;
        PolicyStatus status;
    }

    address public owner;
    bool public paused;
    IAgentRegistry public immutable agentRegistryRef;

    bytes32 private constant DEFAULT_ADMIN_ROLE = 0x00;
    mapping(bytes32 => mapping(address => bool)) private _roles;

    mapping(address => bool) public admins;
    mapping(address => PolicyConfig) private policies;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event AdminUpdated(address indexed admin, bool enabled);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event PauseStateUpdated(bool paused);
    event PolicyConfigured(
        address indexed agent, bytes32 indexed policyHash, uint64 policyVersion, uint64 circuitVersion, bool active
    );
    event PolicyStatusUpdated(address indexed agent, PolicyStatus status);

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

    constructor(address agentRegistry_) {
        if (agentRegistry_ == address(0)) revert InvalidAgent();

        owner = msg.sender;
        agentRegistryRef = IAgentRegistry(agentRegistry_);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(POLICY_ADMIN_ROLE, msg.sender);
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

    function _ensureActiveAgent(address agent) internal view {
        (,,, bool active) = agentRegistryRef.getAgentBinding(agent);
        if (!active) revert AgentNotActive();
    }

    function hasRole(bytes32 role, address account) external view returns (bool) {
        return _roles[role][account];
    }

    function grantRole(bytes32 role, address account) external onlyOwner {
        if (account == address(0)) revert InvalidAgent();
        _grantRole(role, account);
    }

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

    function pause() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        paused = true;
        emit PauseStateUpdated(true);
    }

    function unpause() external onlyRole(EMERGENCY_ADMIN_ROLE) {
        paused = false;
        emit PauseStateUpdated(false);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAgent();
        address previousOwner = owner;
        owner = newOwner;
        _grantRole(DEFAULT_ADMIN_ROLE, newOwner);
        _grantRole(POLICY_ADMIN_ROLE, newOwner);
        _grantRole(EMERGENCY_ADMIN_ROLE, newOwner);
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    function setAdmin(address admin, bool enabled) external onlyOwner {
        if (admin == address(0)) revert InvalidAgent();
        admins[admin] = enabled;
        if (enabled) {
            _grantRole(POLICY_ADMIN_ROLE, admin);
        } else if (_roles[POLICY_ADMIN_ROLE][admin]) {
            _roles[POLICY_ADMIN_ROLE][admin] = false;
            emit RoleRevoked(POLICY_ADMIN_ROLE, admin, msg.sender);
        }
        emit AdminUpdated(admin, enabled);
    }

    function selfRegisterPolicy(bytes32 policyHash, uint64 policyVersion, uint64 circuitVersion)
        external
        whenNotPaused
    {
        _ensureActiveAgent(msg.sender);
        _register(msg.sender, policyHash, policyVersion, circuitVersion, true);
    }

    function registerOrUpdatePolicy(
        address agent,
        bytes32 policyHash,
        uint64 policyVersion,
        uint64 circuitVersion,
        bool active
    ) external whenNotPaused {
        if (agent != msg.sender) revert CallerNotAgent();
        _ensureActiveAgent(msg.sender);
        _register(msg.sender, policyHash, policyVersion, circuitVersion, active);
    }

    function _register(address agent, bytes32 policyHash, uint64 policyVersion, uint64 circuitVersion, bool active)
        internal
    {
        if (agent == address(0)) revert InvalidAgent();
        if (policyHash == bytes32(0)) revert InvalidPolicyHash();
        if (policyVersion == 0 || circuitVersion == 0) revert InvalidVersion();

        policies[agent] = PolicyConfig({
            policyHash: policyHash,
            policyVersion: policyVersion,
            circuitVersion: circuitVersion,
            status: active ? PolicyStatus.Active : PolicyStatus.Paused
        });

        emit PolicyConfigured(agent, policyHash, policyVersion, circuitVersion, active);
    }

    /// @notice Updates policy lifecycle state.
    function setPolicyStatus(address agent, PolicyStatus status) external onlyRole(POLICY_ADMIN_ROLE) whenNotPaused {
        if (agent == address(0)) revert InvalidAgent();
        if (!(status == PolicyStatus.Active || status == PolicyStatus.Paused || status == PolicyStatus.Deprecated)) {
            revert InvalidPolicyStatus();
        }

        PolicyConfig storage cfg = policies[agent];
        if (cfg.policyHash == bytes32(0)) revert InvalidPolicyHash();
        cfg.status = status;
        emit PolicyStatusUpdated(agent, status);
    }

    /// @inheritdoc IPolicyRegistry
    function getPolicyForAgent(address agent)
        external
        view
        returns (bytes32 policyHash, uint64 policyVersion, uint64 circuitVersion, bool active)
    {
        PolicyConfig memory cfg = policies[agent];
        return (cfg.policyHash, cfg.policyVersion, cfg.circuitVersion, cfg.status == PolicyStatus.Active);
    }

    function policyHashOf(address agent) external view returns (bytes32) {
        return policies[agent].policyHash;
    }
}
