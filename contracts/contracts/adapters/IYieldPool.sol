// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IYieldPool
/// @notice Minimal adapter-facing interface for pool actions.
interface IYieldPool {
    /// @notice Deposits assets for a beneficiary strategy account.
    /// @param beneficiary The account credited by the pool implementation.
    /// @param amount The nominal amount for the operation.
    /// @param tokenId The pool token or position identifier.
    function deposit(address beneficiary, uint256 amount, uint256 tokenId) external;

    /// @notice Withdraws assets for a beneficiary strategy account.
    /// @param beneficiary The account debited by the pool implementation.
    /// @param amount The nominal amount for the operation.
    /// @param tokenId The pool token or position identifier.
    function withdraw(address beneficiary, uint256 amount, uint256 tokenId) external;

    /// @notice Rebalances from one token/position id to another.
    /// @param beneficiary The account associated with the rebalance.
    /// @param amount The nominal amount for the operation.
    /// @param fromTokenId The source token or position identifier.
    /// @param toTokenId The destination token or position identifier.
    function rebalance(address beneficiary, uint256 amount, uint256 fromTokenId, uint256 toTokenId) external;
}
