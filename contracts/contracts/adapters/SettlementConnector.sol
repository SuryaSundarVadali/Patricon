// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPolicyRegistry} from "../policy/IPolicyRegistry.sol";
import {IVerifierPolicy} from "../verifier/IVerifierPolicy.sol";

/// @title Patricon SettlementConnector
/// @notice Minimal settlement gateway that requires a valid policy proof prior to settlement intent emission.
contract SettlementConnector {
    error InvalidAddress();
    error InvalidPaymentParty();
    error InvalidAmount();
    error Unauthorized();
    error ContractPaused();
    error ReentrancyBlocked();
    error InvalidCommitWindow();
    error CommitAlreadyExists();
    error MissingCommit();
    error CommitExpired();
    error CommitMismatch();
    error UnknownOrInactivePolicy();
    error PolicyHashMismatch();
    error PolicySignalMismatch();
    error PolicyProofInvalid();

    struct Groth16Proof {
        uint256[2] pA;
        uint256[2][2] pB;
        uint256[2] pC;
    }

    IPolicyRegistry public immutable POLICY_REGISTRY;
    IVerifierPolicy public immutable POLICY_VERIFIER;

    address public owner;
    bool public paused;
    bool public permissionlessExecution;
    mapping(address => bool) public executors;
    mapping(bytes32 => uint256) public settlementCommitExpiry;

    uint256 private _reentrancyLock;

    event PaymentRequested(
        bytes32 indexed paymentRef,
        address indexed agent,
        address indexed payer,
        address payee,
        address asset,
        uint256 amount,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        bytes32 policyHash
    );

    event PaymentExecuted(
        bytes32 indexed paymentRef,
        address indexed agent,
        address indexed payer,
        address payee,
        address asset,
        uint256 amount,
        bytes32 policyHash
    );

    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event ExecutorUpdated(address indexed executor, bool allowed);
    event PauseStateUpdated(bool paused);
    event PermissionlessExecutionUpdated(bool enabled);
    event SettlementCommitted(bytes32 indexed commitHash, address indexed committer, uint256 expiresAt);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier onlyExecutor() {
        _onlyExecutor();
        _;
    }

    modifier whenNotPaused() {
        _whenNotPaused();
        _;
    }

    modifier nonReentrant() {
        _nonReentrantBefore();
        _;
        _nonReentrantAfter();
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner) revert Unauthorized();
    }

    function _onlyExecutor() internal view {
        if (!(permissionlessExecution || msg.sender == owner || executors[msg.sender])) revert Unauthorized();
    }

    function _whenNotPaused() internal view {
        if (paused) revert ContractPaused();
    }

    function _nonReentrantBefore() internal {
        if (_reentrancyLock == 1) revert ReentrancyBlocked();
        _reentrancyLock = 1;
    }

    function _nonReentrantAfter() internal {
        _reentrancyLock = 0;
    }

    constructor(address policyRegistry_, address policyVerifier_) {
        if (policyRegistry_ == address(0) || policyVerifier_ == address(0)) revert InvalidAddress();
        POLICY_REGISTRY = IPolicyRegistry(policyRegistry_);
        POLICY_VERIFIER = IVerifierPolicy(policyVerifier_);

        owner = msg.sender;
        permissionlessExecution = true;
        emit OwnerUpdated(address(0), msg.sender);
        emit PermissionlessExecutionUpdated(true);
    }

    /// @notice Transfers settlement connector ownership.
    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Enables/disables an executor account.
    function setExecutor(address executor, bool allowed) external onlyOwner {
        if (executor == address(0)) revert InvalidAddress();
        executors[executor] = allowed;
        emit ExecutorUpdated(executor, allowed);
    }

    /// @notice Enables/disables permissionless execution.
    function setPermissionlessExecution(bool enabled) external onlyOwner {
        permissionlessExecution = enabled;
        emit PermissionlessExecutionUpdated(enabled);
    }

    /// @notice Pauses execution entrypoints.
    function pause() external onlyOwner {
        paused = true;
        emit PauseStateUpdated(true);
    }

    /// @notice Unpauses execution entrypoints.
    function unpause() external onlyOwner {
        paused = false;
        emit PauseStateUpdated(false);
    }

    /// @notice Commits a settlement hash to mitigate reveal-time frontrunning.
    /// @param commitHash Keccak256 hash of settlement payload + caller + salt.
    /// @param validForSeconds Commit validity window in seconds.
    function commitSettlement(bytes32 commitHash, uint256 validForSeconds) external onlyExecutor whenNotPaused {
        if (commitHash == bytes32(0)) revert CommitMismatch();
        if (validForSeconds == 0 || validForSeconds > 1 days) revert InvalidCommitWindow();
        if (settlementCommitExpiry[commitHash] != 0) revert CommitAlreadyExists();

        uint256 expiresAt = block.timestamp + validForSeconds;
        settlementCommitExpiry[commitHash] = expiresAt;
        emit SettlementCommitted(commitHash, msg.sender, expiresAt);
    }

    function executeSettlementWithProof(
        bytes32 paymentRef,
        address agent,
        address payer,
        address payee,
        address asset,
        uint256 amount,
        uint256 tokenId,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        Groth16Proof calldata policyProof,
        uint256[14] calldata policySignals
    ) external whenNotPaused onlyExecutor nonReentrant {
        _executeSettlement(
            paymentRef,
            agent,
            payer,
            payee,
            asset,
            amount,
            tokenId,
            executionTimestamp,
            tradeNonce,
            policyProof,
            policySignals
        );
    }

    /// @notice Executes settlement using a previously committed payload hash.
    function executeSettlementWithProofFromCommit(
        bytes32 paymentRef,
        address agent,
        address payer,
        address payee,
        address asset,
        uint256 amount,
        uint256 tokenId,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        Groth16Proof calldata policyProof,
        uint256[14] calldata policySignals,
        bytes32 salt
    ) external whenNotPaused onlyExecutor nonReentrant {
        bytes memory encoded = abi.encode(
            msg.sender,
            paymentRef,
            agent,
            payer,
            payee,
            asset,
            amount,
            tokenId,
            executionTimestamp,
            tradeNonce,
            policySignals,
            salt
        );
        bytes32 commitHash;
        assembly {
            commitHash := keccak256(add(encoded, 0x20), mload(encoded))
        }

        uint256 expiresAt = settlementCommitExpiry[commitHash];
        if (expiresAt == 0) revert MissingCommit();
        if (block.timestamp > expiresAt) revert CommitExpired();
        delete settlementCommitExpiry[commitHash];

        _executeSettlement(
            paymentRef,
            agent,
            payer,
            payee,
            asset,
            amount,
            tokenId,
            executionTimestamp,
            tradeNonce,
            policyProof,
            policySignals
        );
    }

    function _executeSettlement(
        bytes32 paymentRef,
        address agent,
        address payer,
        address payee,
        address asset,
        uint256 amount,
        uint256 tokenId,
        uint256 executionTimestamp,
        uint256 tradeNonce,
        Groth16Proof calldata policyProof,
        uint256[14] calldata policySignals
    ) internal {
        if (payer == address(0) || payee == address(0) || asset == address(0)) {
            revert InvalidPaymentParty();
        }
        if (amount == 0) revert InvalidAmount();

        (bytes32 policyHash,,, bool active) = POLICY_REGISTRY.getPolicyForAgent(agent);
        if (!active || policyHash == bytes32(0)) revert UnknownOrInactivePolicy();
        if (policySignals[2] != uint256(policyHash)) revert PolicyHashMismatch();
        if (policySignals[11] != tokenId || policySignals[12] != executionTimestamp || policySignals[13] != tradeNonce)
        {
            revert PolicySignalMismatch();
        }
        if (amount > policySignals[3]) revert PolicySignalMismatch();

        bool valid = POLICY_VERIFIER.verifyProof(policyProof.pA, policyProof.pB, policyProof.pC, policySignals);
        if (!valid) revert PolicyProofInvalid();

        emit PaymentRequested(
            paymentRef, agent, payer, payee, asset, amount, executionTimestamp, tradeNonce, policyHash
        );
        emit PaymentExecuted(paymentRef, agent, payer, payee, asset, amount, policyHash);
    }
}
