// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BZDMembershipNFTs
 * @dev A contract for managing BuZhiDAO seasonal membership NFTs.
 */

contract BZDMembershipNFTs is ERC1155, Ownable {
    mapping(address => bool) public admins;
    uint256 adminCount;
    mapping(uint256 => mapping(address => bool)) public membersBySeason;
    mapping(uint256 => uint256) public memberCountBySeason;

    // Starting season count at 1
    uint256 public currentSeason = 1;
    string private _baseURI;

    constructor() ERC1155("BuZhiDAO Seasonal Membership NFT") {
        admins[msg.sender] = true;
        adminCount = 1;
    }

    /**
     * @dev Modifier to check that the caller is an admin.
     */
    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admins can perform this action");
        _;
    }

    /**
     * @dev Sets the base URI for token metadata.
     * @param baseURI The new base URI.
     */
    function setBaseURI(string memory baseURI) public onlyAdmin {
        _baseURI = baseURI;
    }

    /**
     * @dev Adds an admin to the contract.
     * @param admin The address of the admin to add.
     */
    function addAdmin(address admin) public onlyAdmin {
        require(admins[admin] == false, "Address is already an admin");
        admins[admin] = true;
        adminCount = adminCount + 1;
    }

    /**
     * @dev Removes an admin from the contract.
     * @param admin The address of the admin to remove.
     */
    function removeAdmin(address admin) public onlyAdmin {
        require(admins[admin] == true, "Address is not an admin");
        require(adminCount > 1, "Cannot remove last admin");
        admins[admin] = false;
        adminCount = adminCount - 1;
    }

    /**
     * @dev Sets the current season for minting.
     * @param seasonId The ID of the current season.
     */
    function setCurrentSeason(uint256 seasonId) public onlyAdmin {
        currentSeason = seasonId;
    }

    /**
     * @dev Mints membership NFTs to the specified addresses for the current season.
     * @param recipients The addresses to mint membership NFTs to.
     * @param seasonId The ID of the season to mint membership NFTs for.
     */
    function mint(
        address[] calldata recipients,
        uint256 seasonId
    ) public onlyAdmin {
        require(seasonId == currentSeason, "Season ID must be current season");
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];
            // Only mint if the recipient does not already have a membership NFT for this season
            // Silent fail otherwise for convenience
            if (!membersBySeason[seasonId][recipient]) {
                _mint(recipient, seasonId, 1, " ");
                membersBySeason[seasonId][recipient] = true;
                memberCountBySeason[seasonId] =
                    memberCountBySeason[seasonId] +
                    1;
            }
        }
    }

    /**
     * @dev Burns the membership NFT for the specified address and season.
     * @param account The address of the account to burn the membership NFT for.
     * @param seasonId The ID of the season to burn the membership NFT for.
     */
    function burn(address account, uint256 seasonId) public onlyAdmin {
        require(_exists(seasonId), "Invalid tokenId");
        require(
            membersBySeason[seasonId][account],
            "Account is not a member of this season"
        );
        _burn(account, seasonId, 1);
        if (memberCountBySeason[seasonId] == 0) {
            delete memberCountBySeason[seasonId];
        } else {
            memberCountBySeason[seasonId] = memberCountBySeason[seasonId] - 1;
        }
    }

    /**
     * @dev Returns the URI for the specified token ID.
     * @param tokenId The ID of the token to get the URI for.
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");

        return string(abi.encodePacked(_baseURI, Strings.toString(tokenId)));
    }

    /**
     * @dev Checks if the specified token ID exists.
     * @param tokenId The ID of the token to check.
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId <= currentSeason;
    }

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
