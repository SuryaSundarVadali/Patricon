// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC8004IdentityValidationRead {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/// @title ERC8004ValidationRegistry
/// @notice Validation request/response registry for ERC-8004 agents.
contract ERC8004ValidationRegistry {
    error AgentNotRegistered(uint256 agentId);
    error NotValidatorForRequest();
    error InvalidResponse();
    error AverageOutOfRange();

    struct ValidationRecord {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
    }

    address private immutable _IDENTITY_REGISTRY;

    mapping(bytes32 => ValidationRecord) private _validations;
    mapping(uint256 => bytes32[]) private _agentValidations;
    mapping(address => bytes32[]) private _validatorRequests;

    event ValidationRequest(
        address indexed validatorAddress, uint256 indexed agentId, string requestURI, bytes32 indexed requestHash
    );

    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseURI,
        bytes32 responseHash,
        string tag
    );

    constructor(address identityRegistry_) {
        _IDENTITY_REGISTRY = identityRegistry_;
    }

    function getIdentityRegistry() external view returns (address) {
        return _IDENTITY_REGISTRY;
    }

    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external {
        if (validatorAddress == address(0) || requestHash == bytes32(0)) {
            revert InvalidResponse();
        }

        address owner_ = _requireAgentOwner(agentId);
        if (!_isOwnerOrOperator(agentId, owner_, msg.sender)) revert AgentNotRegistered(agentId);

        ValidationRecord storage record = _validations[requestHash];
        if (record.validatorAddress != address(0)) revert InvalidResponse();

        _validations[requestHash] = ValidationRecord({
            validatorAddress: validatorAddress,
            agentId: agentId,
            response: 0,
            responseHash: bytes32(0),
            tag: "",
            lastUpdate: block.timestamp
        });

        _agentValidations[agentId].push(requestHash);
        _validatorRequests[validatorAddress].push(requestHash);

        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external {
        if (response > 100) revert InvalidResponse();

        ValidationRecord storage record = _validations[requestHash];
        if (record.validatorAddress == address(0) || record.validatorAddress != msg.sender) {
            revert NotValidatorForRequest();
        }

        record.response = response;
        record.responseHash = responseHash;
        record.tag = tag;
        record.lastUpdate = block.timestamp;

        emit ValidationResponse(msg.sender, record.agentId, requestHash, response, responseURI, responseHash, tag);
    }

    function getValidationStatus(bytes32 requestHash)
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 responseHash,
            string memory tag,
            uint256 lastUpdate
        )
    {
        ValidationRecord memory record = _validations[requestHash];
        return
            (
                record.validatorAddress,
                record.agentId,
                record.response,
                record.responseHash,
                record.tag,
                record.lastUpdate
            );
    }

    function getSummary(uint256 agentId, address[] calldata validatorAddresses, string calldata tag)
        external
        view
        returns (uint64 count, uint8 averageResponse)
    {
        bytes32[] memory hashes = _agentValidations[agentId];
        uint256 sum;

        for (uint256 i = 0; i < hashes.length; i++) {
            ValidationRecord memory record = _validations[hashes[i]];
            if (record.validatorAddress == address(0)) continue;
            if (!_matchValidator(record.validatorAddress, validatorAddresses)) continue;
            if (!_matchTag(record.tag, tag)) continue;

            sum += record.response;
            count += 1;
        }

        if (count == 0) {
            return (0, 0);
        }

        uint256 avg = sum / count;
        if (avg > type(uint8).max) revert AverageOutOfRange();
        // casting to 'uint8' is safe because avg is explicitly bounded above by uint8.max
        // forge-lint: disable-next-line(unsafe-typecast)
        averageResponse = uint8(avg);
    }

    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory requestHashes) {
        return _agentValidations[agentId];
    }

    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory requestHashes) {
        return _validatorRequests[validatorAddress];
    }

    function _requireAgentOwner(uint256 agentId) internal view returns (address owner_) {
        try IERC8004IdentityValidationRead(_IDENTITY_REGISTRY).ownerOf(agentId) returns (address ownerOfToken) {
            return ownerOfToken;
        } catch {
            revert AgentNotRegistered(agentId);
        }
    }

    function _isOwnerOrOperator(uint256 agentId, address owner_, address caller) internal view returns (bool) {
        if (caller == owner_) return true;
        if (IERC8004IdentityValidationRead(_IDENTITY_REGISTRY).getApproved(agentId) == caller) return true;
        return IERC8004IdentityValidationRead(_IDENTITY_REGISTRY).isApprovedForAll(owner_, caller);
    }

    function _matchValidator(address validator, address[] calldata validators) internal pure returns (bool) {
        if (validators.length == 0) return true;
        for (uint256 i = 0; i < validators.length; i++) {
            if (validators[i] == validator) {
                return true;
            }
        }
        return false;
    }

    function _matchTag(string memory actual, string calldata expected) internal pure returns (bool) {
        if (bytes(expected).length == 0) return true;
        return keccak256(bytes(actual)) == keccak256(bytes(expected));
    }
}
