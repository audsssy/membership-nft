// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import { ERC1155, ERC1155TokenReceiver } from "solmate/src/tokens/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

import "./BZDMembershipDirectory.sol";

/**
 * @title BZDMembershipNFTs
 * @dev A contract for managing BuZhiDAO seasonal membership NFTs.
 */

contract BZDMembershipNFTs is ERC1155, Ownable {

    // Custom Errors //
    
    error Unauthorized();

    error NonTransferable();

    error CannotRemoveAdmin();

    error NotInSeason();

    error NothingToBurn();

    error LengthMismatch();

    error UnsafeRecipient();

    error InvalidRecipient();

    // Storage //

    // admins directory
    BZDMembershipDirectory public admins;

    // membership directory for each season
    mapping(uint256 => BZDMembershipDirectory) public membersBySeason;

    // Starting season count at 1
    uint256 public currentSeason = 1;

    // metadata base URI for membership NFTs
    string private _baseURI;

    // Transferability per ID
    // TokenID => Transferability
    mapping(uint256 => bool) public transferable;

    // Constructor //

    constructor() {
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
        if (!admins.isMember(msg.sender)) revert Unauthorized();            
        _;
    }

    /**
     * @dev Sets the base URI for token metadata.
     * @param baseURI The new base URI.
     */
    function setBaseURI(string memory baseURI) external onlyAdmin {
        _baseURI = baseURI;
    }

    // Admin Management //

    /**
     * @dev Adds an admin to the contract.
     * @param admin The address of the admin to add.
     */
    function addAdmin(address admin) external onlyAdmin {
        admins.addMember(admin);
    }

    /**
     * @dev Removes an admin from the contract.
     * @param admin The address of the admin to remove.
     */
    function removeAdmin(address admin) external onlyAdmin {
        if (admins.memberCount() < 2) revert CannotRemoveAdmin();

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
    function setCurrentSeason(uint256 seasonId) external onlyAdmin {
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
    ) external onlyAdmin {
        if (seasonId != currentSeason) revert NotInSeason();

        for (uint256 i = 0; i < members.length; ) {
            address member = members[i];
            // Only mint if the recipient is not already a member of the season
            // Silent fail otherwise for convenience
            if (!membersBySeason[seasonId].isMember(member)) {
                _mint(member, seasonId, 1, "");
                membersBySeason[seasonId].addMember(member);
            }

            unchecked {
                ++i;
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
    ) external onlyAdmin {
        if (!membersBySeason[seasonId].isMember(member)) revert NotInSeason();
        if (membersBySeason[seasonId].memberCount() < 1) revert NothingToBurn();
        
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

    function setTransferability(uint256 id, bool _transferable) public payable onlyAdmin {
        transferable[id] = _transferable;
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) public override {
        if (!transferable[id]) revert NonTransferable();

        this.safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) public override {
        if (ids.length != amounts.length) revert LengthMismatch();

        if (msg.sender != from)
            if (!isApprovedForAll[from][msg.sender]) revert Unauthorized();

        // Storing these outside the loop saves ~15 gas per iteration.
        uint256 id;
        uint256 amount;

        for (uint256 i = 0; i < ids.length; ) {

            if (!transferable[id]) revert NonTransferable();

            id = ids[i];
            amount = amounts[i];

            balanceOf[from][id] -= amount;
            balanceOf[to][id] += amount;

            // An array can't have a total length
            // larger than the max uint256 value.
            unchecked {
                ++i;
            }
        }

        emit TransferBatch(msg.sender, from, to, ids, amounts);

        if (to.code.length != 0) {
            if (
                ERC1155TokenReceiver(to).onERC1155BatchReceived(
                    msg.sender,
                    from,
                    ids,
                    amounts,
                    data
                ) != ERC1155TokenReceiver.onERC1155BatchReceived.selector
            ) revert UnsafeRecipient();
        } else if (to == address(0)) revert InvalidRecipient();
    }
}