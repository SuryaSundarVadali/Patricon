// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC8004IdentityRead {
    function ownerOf(uint256 tokenId) external view returns (address);
    function getApproved(uint256 tokenId) external view returns (address);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}

/// @title ERC8004ReputationRegistry
/// @notice ERC-8004 compatible feedback registry for agent identities.
contract ERC8004ReputationRegistry {
    error OwnerCannotGiveFeedback();
    error EmptyClientList();
    error InvalidValueDecimals();
    error AgentNotRegistered(uint256 agentId);
    error FeedbackNotFound();
    error SummaryOutOfRange();

    struct FeedbackRecord {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool isRevoked;
    }

    struct FeedbackInput {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        string endpoint;
        string feedbackURI;
        bytes32 feedbackHash;
    }

    address private immutable _IDENTITY_REGISTRY;

    mapping(uint256 => mapping(address => mapping(uint64 => FeedbackRecord))) private _feedback;
    mapping(uint256 => mapping(address => uint64)) private _lastIndex;
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _hasGivenFeedback;
    mapping(uint256 => mapping(address => mapping(uint64 => mapping(address => uint64)))) private _responseCounts;

    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex);

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseURI,
        bytes32 responseHash
    );

    constructor(address identityRegistry_) {
        _IDENTITY_REGISTRY = identityRegistry_;
    }

    function getIdentityRegistry() external view returns (address) {
        return _IDENTITY_REGISTRY;
    }

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        FeedbackInput memory input = FeedbackInput({
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            endpoint: endpoint,
            feedbackURI: feedbackURI,
            feedbackHash: feedbackHash
        });

        _giveFeedback(agentId, msg.sender, input);
    }

    function _giveFeedback(uint256 agentId, address client, FeedbackInput memory input) internal {
        address owner_ = _requireAgentOwner(agentId);
        if (_isOwnerOrOperator(agentId, owner_, client)) revert OwnerCannotGiveFeedback();
        if (input.valueDecimals > 18) revert InvalidValueDecimals();

        uint64 nextIndex = _lastIndex[agentId][client] + 1;
        _lastIndex[agentId][client] = nextIndex;

        _feedback[agentId][client][nextIndex] = FeedbackRecord({
            value: input.value, valueDecimals: input.valueDecimals, tag1: input.tag1, tag2: input.tag2, isRevoked: false
        });

        if (!_hasGivenFeedback[agentId][client]) {
            _hasGivenFeedback[agentId][client] = true;
            _clients[agentId].push(client);
        }

        emit NewFeedback(
            agentId,
            client,
            nextIndex,
            input.value,
            input.valueDecimals,
            input.tag1,
            input.tag1,
            input.tag2,
            input.endpoint,
            input.feedbackURI,
            input.feedbackHash
        );
    }

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        if (feedbackIndex == 0 || feedbackIndex > _lastIndex[agentId][msg.sender]) revert FeedbackNotFound();

        FeedbackRecord storage record = _feedback[agentId][msg.sender][feedbackIndex];
        record.isRevoked = true;

        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external {
        if (feedbackIndex == 0 || feedbackIndex > _lastIndex[agentId][clientAddress]) {
            revert FeedbackNotFound();
        }

        _responseCounts[agentId][clientAddress][feedbackIndex][msg.sender] += 1;

        emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseURI, responseHash);
    }

    function getSummary(uint256 agentId, address[] calldata clientAddresses, string calldata tag1, string calldata tag2)
        external
        view
        returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)
    {
        if (clientAddresses.length == 0) revert EmptyClientList();

        int256 sum;
        bool firstSeen;

        for (uint256 i = 0; i < clientAddresses.length; i++) {
            address client = clientAddresses[i];
            uint64 last = _lastIndex[agentId][client];
            for (uint64 idx = 1; idx <= last; idx++) {
                FeedbackRecord memory record = _feedback[agentId][client][idx];
                if (record.isRevoked) continue;
                if (!_matchesTag(record.tag1, tag1) || !_matchesTag(record.tag2, tag2)) continue;

                if (!firstSeen) {
                    summaryValueDecimals = record.valueDecimals;
                    firstSeen = true;
                }

                sum += int256(record.value);
                count += 1;
            }
        }

        if (sum < type(int128).min || sum > type(int128).max) revert SummaryOutOfRange();
        // casting to 'int128' is safe because sum is explicitly bounded to int128 range above
        // forge-lint: disable-next-line(unsafe-typecast)
        summaryValue = int128(sum);
    }

    function readFeedback(uint256 agentId, address clientAddress, uint64 feedbackIndex)
        external
        view
        returns (int128 value, uint8 valueDecimals, string memory tag1, string memory tag2, bool isRevoked)
    {
        if (feedbackIndex == 0 || feedbackIndex > _lastIndex[agentId][clientAddress]) revert FeedbackNotFound();

        FeedbackRecord memory record = _feedback[agentId][clientAddress][feedbackIndex];
        return (record.value, record.valueDecimals, record.tag1, record.tag2, record.isRevoked);
    }

    function readAllFeedback(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2,
        bool includeRevoked
    )
        external
        view
        returns (
            address[] memory clients,
            uint64[] memory feedbackIndexes,
            int128[] memory values,
            uint8[] memory valueDecimals,
            string[] memory tag1s,
            string[] memory tag2s,
            bool[] memory revokedStatuses
        )
    {
        address[] memory selectedClients = _resolveClients(agentId, clientAddresses);

        uint256 totalMatches;
        for (uint256 i = 0; i < selectedClients.length; i++) {
            address client = selectedClients[i];
            uint64 last = _lastIndex[agentId][client];
            for (uint64 idx = 1; idx <= last; idx++) {
                FeedbackRecord memory record = _feedback[agentId][client][idx];
                if (!includeRevoked && record.isRevoked) continue;
                if (!_matchesTag(record.tag1, tag1) || !_matchesTag(record.tag2, tag2)) continue;
                totalMatches++;
            }
        }

        clients = new address[](totalMatches);
        feedbackIndexes = new uint64[](totalMatches);
        values = new int128[](totalMatches);
        valueDecimals = new uint8[](totalMatches);
        tag1s = new string[](totalMatches);
        tag2s = new string[](totalMatches);
        revokedStatuses = new bool[](totalMatches);

        uint256 cursor;
        for (uint256 i = 0; i < selectedClients.length; i++) {
            address client = selectedClients[i];
            uint64 last = _lastIndex[agentId][client];
            for (uint64 idx = 1; idx <= last; idx++) {
                FeedbackRecord memory record = _feedback[agentId][client][idx];
                if (!includeRevoked && record.isRevoked) continue;
                if (!_matchesTag(record.tag1, tag1) || !_matchesTag(record.tag2, tag2)) continue;

                clients[cursor] = client;
                feedbackIndexes[cursor] = idx;
                values[cursor] = record.value;
                valueDecimals[cursor] = record.valueDecimals;
                tag1s[cursor] = record.tag1;
                tag2s[cursor] = record.tag2;
                revokedStatuses[cursor] = record.isRevoked;
                cursor++;
            }
        }
    }

    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return _lastIndex[agentId][clientAddress];
    }

    function getResponseCount(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        address[] calldata responders
    ) external view returns (uint64 count) {
        for (uint256 i = 0; i < responders.length; i++) {
            count += _responseCounts[agentId][clientAddress][feedbackIndex][responders[i]];
        }
    }

    function _requireAgentOwner(uint256 agentId) internal view returns (address owner_) {
        try IERC8004IdentityRead(_IDENTITY_REGISTRY).ownerOf(agentId) returns (address ownerOfToken) {
            return ownerOfToken;
        } catch {
            revert AgentNotRegistered(agentId);
        }
    }

    function _isOwnerOrOperator(uint256 agentId, address owner_, address caller) internal view returns (bool) {
        if (caller == owner_) return true;
        if (IERC8004IdentityRead(_IDENTITY_REGISTRY).getApproved(agentId) == caller) return true;
        return IERC8004IdentityRead(_IDENTITY_REGISTRY).isApprovedForAll(owner_, caller);
    }

    function _resolveClients(uint256 agentId, address[] calldata clientAddresses)
        internal
        view
        returns (address[] memory)
    {
        if (clientAddresses.length > 0) {
            address[] memory selected = new address[](clientAddresses.length);
            for (uint256 i = 0; i < clientAddresses.length; i++) {
                selected[i] = clientAddresses[i];
            }
            return selected;
        }
        return _clients[agentId];
    }

    function _matchesTag(string memory actual, string calldata expected) internal pure returns (bool) {
        if (bytes(expected).length == 0) return true;
        return keccak256(bytes(actual)) == keccak256(bytes(expected));
    }
}
