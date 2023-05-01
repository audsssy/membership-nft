// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./BZDMembershipDirectory.sol";

/**
 * @title BZDMembershipNFTs
 * @dev A contract for managing BuZhiDAO seasonal membership NFTs.
 */

contract BZDMembershipNFTs is ERC1155, Ownable {
    // admins directory
    BZDMembershipDirectory public admins;

    // membership directory for each season
    mapping(uint256 => BZDMembershipDirectory) public membersBySeason;

    // Starting season count at 1
    uint256 public currentSeason = 1;

    // metadata base URI for membership NFTs
    string private _baseURI;

    constructor() ERC1155("BuZhiDAO Seasonal Membership NFT") {
        admins = new BZDMembershipDirectory();
        BZDMembershipDirectory membersDirectory = new BZDMembershipDirectory();
        membersBySeason[currentSeason] = membersDirectory;
        admins.addMember(msg.sender);
    }

    // Admin Functions //

    /**
     * @dev Modifier to check that the caller is an admin.
     */
    modifier onlyAdmin() {
        require(
            admins.isMember(msg.sender),
            "Only admins can perform this action"
        );
        _;
    }

    /**
     * @dev Sets the base URI for token metadata.
     * @param baseURI The new base URI.
     */
    function setBaseURI(string memory baseURI) public onlyAdmin {
        _baseURI = baseURI;
    }

    // Admin Management //

    /**
     * @dev Adds an admin to the contract.
     * @param admin The address of the admin to add.
     */
    function addAdmin(address admin) public onlyAdmin {
        admins.addMember(admin);
    }

    /**
     * @dev Removes an admin from the contract.
     * @param admin The address of the admin to remove.
     */
    function removeAdmin(address admin) public onlyAdmin {
        require(admins.memberCount() > 1, "Cannot remove last admin");
        admins.removeMember(admin);
    }

    /**
     * @dev Returns the number of admins.
     */
    function adminsCount() public view returns (uint256) {
        return admins.memberCount();
    }

    // Season Management //

    /**
     * @dev Sets the current season.
     * @param seasonId The ID of the current season that starts from 1
     */
    function setCurrentSeason(uint256 seasonId) public onlyAdmin {
        currentSeason = seasonId;
    }

    // Members Management //

    /**
     * @dev Returns the number of members for the season.
     * @param seasonId The ID of the season to get the number of members for.
     */

    function membersForSeason(
        uint256 seasonId
    ) public view returns (address[] memory) {
        return membersBySeason[seasonId].members();
    }

    /**
     * @dev Mints membership NFTs to the specified addresses for the current season.
     * @param members The addresses to mint membership NFTs to.
     * @param seasonId The ID of the season to mint membership NFTs for.
     */
    function mintAndAddMembersToSeason(
        address[] calldata members,
        uint256 seasonId
    ) public onlyAdmin {
        require(seasonId == currentSeason, "Season ID must be current season");
        for (uint256 i = 0; i < members.length; i++) {
            address member = members[i];
            // Only mint if the recipient is not already a member of the season
            // Silent fail otherwise for convenience
            if (!membersBySeason[seasonId].isMember(member)) {
                _mint(member, seasonId, 1, " ");
                membersBySeason[seasonId].addMember(member);
            }
        }
    }

    /**
     * @dev Burns the membership NFT for the specified address and season.
     * @param member The address of the account to burn the membership NFT for.
     * @param seasonId The ID of the season to burn the membership NFT for.
     */
    function burnAndRemoveMemberFromSeason(
        address member,
        uint256 seasonId
    ) public onlyAdmin {
        require(
            membersBySeason[seasonId].isMember(member),
            "Account is not a member of this season"
        );
        require(
            membersBySeason[seasonId].memberCount() > 0,
            "No members this season to burn"
        );
        _burn(member, seasonId, 1);
        membersBySeason[seasonId].removeMember(member);
    }

    // Metadata //

    /**
     * @dev Returns the URI for the specified token ID.
     * @param tokenId The ID of the token to get the URI for, refers to seasonId here
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(_baseURI, Strings.toString(tokenId)));
    }

    // SBT //

    /**
     * @dev Override for the ERC1155 `_beforeTokenTransfer` function to prevent transfers.
     */
    function _beforeTokenTransfer(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) internal virtual override {
        // Prevent transferring tokens between addresses
        require(
            from == address(0) || to == address(0),
            "Tokens are non-transferable"
        );
        super._beforeTokenTransfer(operator, from, to, ids, amounts, data);
    }
}
