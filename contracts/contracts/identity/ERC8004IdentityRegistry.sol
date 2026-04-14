// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC1271} from "openzeppelin-contracts/contracts/interfaces/IERC1271.sol";
import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ECDSA} from "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "openzeppelin-contracts/contracts/utils/cryptography/EIP712.sol";
import {ERC721URIStorage} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title ERC8004IdentityRegistry
/// @notice ERC-8004 identity registry built on ERC-721 metadata ownership.
contract ERC8004IdentityRegistry is ERC721URIStorage, EIP712 {
    error ReservedMetadataKey(string key);
    error InvalidSignature();
    error DeadlineExpired();
    error NotOwnerOrOperator();

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(
        uint256 indexed agentId, string indexed indexedMetadataKey, string metadataKey, bytes metadataValue
    );

    struct MetadataEntry {
        string metadataKey;
        bytes metadataValue;
    }

    bytes32 private constant SET_AGENT_WALLET_TYPEHASH =
        keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");
    bytes4 private constant EIP1271_MAGICVALUE = 0x1626ba7e;

    uint256 private _nextAgentId = 1;
    mapping(uint256 => mapping(string => bytes)) private _metadata;
    mapping(uint256 => address) private _agentWallet;

    constructor() ERC721("Patricon Agent Identity", "PAGENT") EIP712("ERC8004IdentityRegistry", "1") {}

    function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender, agentURI);
        _setBulkMetadata(agentId, metadata);
    }

    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender, agentURI);
    }

    function register() external returns (uint256 agentId) {
        agentId = _mintAgent(msg.sender, "");
    }

    function setAgentURI(uint256 agentId, string calldata newURI) external {
        _requireOwnerOrApproved(agentId);
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    function setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) external {
        _requireOwnerOrApproved(agentId);
        _setMetadata(agentId, metadataKey, metadataValue);
    }

    function getMetadata(uint256 agentId, string calldata metadataKey) external view returns (bytes memory) {
        return _metadata[agentId][metadataKey];
    }

    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external {
        _requireOwnerOrApproved(agentId);
        if (block.timestamp > deadline) revert DeadlineExpired();
        _validateWalletSignature(agentId, newWallet, deadline, signature);
        _agentWallet[agentId] = newWallet;
    }

    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _agentWallet[agentId];
    }

    function unsetAgentWallet(uint256 agentId) external {
        _requireOwnerOrApproved(agentId);
        _agentWallet[agentId] = address(0);
    }

    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    function _mintAgent(address owner_, string memory agentURI) internal returns (uint256 agentId) {
        agentId = _nextAgentId;
        _nextAgentId = agentId + 1;
        _mint(owner_, agentId);
        _setTokenURI(agentId, agentURI);
        emit Registered(agentId, agentURI, owner_);
    }

    function _setBulkMetadata(uint256 agentId, MetadataEntry[] calldata metadata) internal {
        for (uint256 i = 0; i < metadata.length; i++) {
            _setMetadata(agentId, metadata[i].metadataKey, metadata[i].metadataValue);
        }
    }

    function _setMetadata(uint256 agentId, string calldata metadataKey, bytes calldata metadataValue) internal {
        if (keccak256(bytes(metadataKey)) == keccak256(bytes("agentWallet"))) {
            revert ReservedMetadataKey(metadataKey);
        }
        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    function _requireOwnerOrApproved(uint256 agentId) internal view {
        address owner_ = ownerOf(agentId);
        if (!(msg.sender == owner_ || getApproved(agentId) == msg.sender || isApprovedForAll(owner_, msg.sender))) {
            revert NotOwnerOrOperator();
        }
    }

    function _validateWalletSignature(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature)
        internal
        view
    {
        bytes32 digest =
            _hashTypedDataV4(keccak256(abi.encode(SET_AGENT_WALLET_TYPEHASH, agentId, newWallet, deadline)));

        if (newWallet.code.length == 0) {
            address recovered = ECDSA.recover(digest, signature);
            if (recovered != newWallet) revert InvalidSignature();
            return;
        }

        bytes4 result = IERC1271(newWallet).isValidSignature(digest, signature);
        if (result != EIP1271_MAGICVALUE) revert InvalidSignature();
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address previousOwner = super._update(to, tokenId, auth);
        if (previousOwner != to && _agentWallet[tokenId] != address(0)) {
            _agentWallet[tokenId] = address(0);
        }
        return previousOwner;
    }
}
