// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * This contract manages membership address in a set data structure that's not natively supported in solidity
 * This data structure is needed to support adding and deleting members while being able to show list of all members
 */

contract BZDMembershipDirectory is Ownable {

    // Custom Errors //

    error MemberExists();

    error NoSuchMember();

    // Public Variables //

    // Members count
    uint256 public memberCount;

    // Mapping from member to status of membership
    // (member address => member status true/false)
    mapping(address => bool) public isMember;

    // Mapping from member address to time stamp if added as member
    // (member address => time stamp)
    mapping(address => uint256) public memberJoinedTimestamp;

    // Mapping from member address to time stamp if removed from membership
    // (member address => time stamp)
    mapping(address => uint256) public memberRemovedTimestamp;

    // Private Variables //

    // Mapping from index to member address of the members list
    // (member index => member address)
    mapping(uint256 => address) private _indexToMember;

    // Mapping from member address to index of the members list
    // (member address => member index)
    mapping(address => uint256) private _memberAddressIndex;

    // Public Functions //

    /**
     * @dev Used to access each member by index.
     * For example, we can get the `numberOfMembers`, and then
     * iterate through each index (e.g. 0, 1, 2) to get the address of each member.
     * @param index index of the member (first member will be index 0)
     */
    function memberByIndex(uint256 index) public view returns (address) {
        return _indexToMember[index];
    }

    /**
     * @dev Used to access all members in the set.
     */

    function members() public view returns (address[] memory) {
        address[] memory result = new address[](memberCount);
        for (uint256 i = 0; i < memberCount; ) {
            result[i] = _indexToMember[i];

            unchecked {
                ++i;
            }
        }
        return result;
    }

    // Only Owner Functions //

    /**
     * @dev Private function to add a member to this extension's member set data structures.
     * @param member address of the member to be added to the set
     */
    function addMember(address member) external payable onlyOwner {
        if (isMember[member]) revert MemberExists();
        uint256 length = memberCount;

        _indexToMember[length] = member;
        _memberAddressIndex[member] = length;
        isMember[member] = true;
        memberJoinedTimestamp[member] = block.timestamp;
        
        unchecked {
            ++memberCount;
        }
    }

    /**
     * @dev Private function to remove a member from this contract's member set data structures.
     * This has O(1) time complexity, but alters the order of the _memberAddressIndex array.
     * See https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/token/ERC721/extensions/ERC721Enumerable.sol#L134
     * @param member address of the member to be removed from the set
     */
    function removeMember(address member) external payable onlyOwner {
        if (!isMember[member]) revert NoSuchMember();

        // To prevent a gap in the array, we store the last member in the index of the member to delete
        // then delete the last slot (swap and pop).
        uint256 lastMemberIndex = --memberCount;
        uint256 toBeRemovedMemberIndex = _memberAddressIndex[member];

        // If the member to delete is not the last member in the data structure, swap the last member with the member to delete
        if (toBeRemovedMemberIndex != lastMemberIndex) {
            address lastMemberAddress = _indexToMember[lastMemberIndex];

            // Move the last member to the slot of the to-delete member
            _indexToMember[toBeRemovedMemberIndex] = lastMemberAddress;

            // Update the moved member's index to the slot of the to-delete member
            _memberAddressIndex[lastMemberAddress] = toBeRemovedMemberIndex;
        }

        // This also deletes the contents at the last position of the array
        delete _indexToMember[lastMemberIndex];
        delete _memberAddressIndex[member];

        isMember[member] = false;
        memberRemovedTimestamp[member] = block.timestamp;
    }
}
