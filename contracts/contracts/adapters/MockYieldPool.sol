// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IYieldPool} from "./IYieldPool.sol";

/// @title Patricon MockYieldPool
/// @notice Mock pool used for adapter tests and simple testnet deployments.
/// @dev This mock intentionally stays non-upgradeable and lightweight for local/testing flows.
///      For production pools, use audited protocol adapters and governance-gated upgrades.
contract MockYieldPool is IYieldPool {
    error Unauthorized();
    error InvalidAddress();
    error InvalidAmount();
    error ContractPaused();

    address public owner;
    bool public paused;
    bool public permissionlessMode;

    mapping(address => bool) public operators;

    uint256 public totalDeposits;
    uint256 public totalWithdrawals;
    uint256 public totalRebalances;

    event OwnerUpdated(address indexed previousOwner, address indexed newOwner);
    event OperatorUpdated(address indexed operator, bool allowed);
    event PauseStateUpdated(bool paused);
    event PermissionlessModeUpdated(bool enabled);

    event Deposited(address indexed beneficiary, uint256 amount, uint256 tokenId);
    event Withdrawn(address indexed beneficiary, uint256 amount, uint256 tokenId);
    event Rebalanced(address indexed beneficiary, uint256 amount, uint256 fromTokenId, uint256 toTokenId);

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    modifier whenNotPaused() {
        _whenNotPaused();
        _;
    }

    modifier onlyAuthorizedCaller() {
        _onlyAuthorizedCaller();
        _;
    }

    function _onlyOwner() internal view {
        if (msg.sender != owner) revert Unauthorized();
    }

    function _whenNotPaused() internal view {
        if (paused) revert ContractPaused();
    }

    function _onlyAuthorizedCaller() internal view {
        if (!(permissionlessMode || msg.sender == owner || operators[msg.sender])) revert Unauthorized();
    }

    constructor() {
        owner = msg.sender;
        permissionlessMode = true;
        emit OwnerUpdated(address(0), msg.sender);
        emit PermissionlessModeUpdated(true);
    }

    /// @notice Transfers ownership to a new admin.
    /// @param newOwner The next owner address.
    function setOwner(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert InvalidAddress();
        emit OwnerUpdated(owner, newOwner);
        owner = newOwner;
    }

    /// @notice Enables or disables authorized operator role for a caller.
    /// @param operator The operator account.
    /// @param allowed Whether the operator is enabled.
    function setOperator(address operator, bool allowed) external onlyOwner {
        if (operator == address(0)) revert InvalidAddress();
        operators[operator] = allowed;
        emit OperatorUpdated(operator, allowed);
    }

    /// @notice Enables/disables permissionless mode for test/dev compatibility.
    /// @param enabled True to allow any caller, false to require owner/operator caller.
    function setPermissionlessMode(bool enabled) external onlyOwner {
        permissionlessMode = enabled;
        emit PermissionlessModeUpdated(enabled);
    }

    /// @notice Pauses operational entrypoints.
    function pause() external onlyOwner {
        paused = true;
        emit PauseStateUpdated(true);
    }

    /// @notice Unpauses operational entrypoints.
    function unpause() external onlyOwner {
        paused = false;
        emit PauseStateUpdated(false);
    }

    /// @inheritdoc IYieldPool
    function deposit(address beneficiary, uint256 amount, uint256 tokenId)
        external
        override
        whenNotPaused
        onlyAuthorizedCaller
    {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        totalDeposits += amount;
        emit Deposited(beneficiary, amount, tokenId);
    }

    /// @inheritdoc IYieldPool
    function withdraw(address beneficiary, uint256 amount, uint256 tokenId)
        external
        override
        whenNotPaused
        onlyAuthorizedCaller
    {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        totalWithdrawals += amount;
        emit Withdrawn(beneficiary, amount, tokenId);
    }

    /// @inheritdoc IYieldPool
    function rebalance(address beneficiary, uint256 amount, uint256 fromTokenId, uint256 toTokenId)
        external
        override
        whenNotPaused
        onlyAuthorizedCaller
    {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        totalRebalances += amount;
        emit Rebalanced(beneficiary, amount, fromTokenId, toTokenId);
    }
}
