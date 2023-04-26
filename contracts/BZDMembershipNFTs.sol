// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract BZDMembershipNFTs is ERC1155, Ownable {
    mapping(address => bool) public admins;
    uint256 adminCount;
    mapping(uint256 => mapping(address => bool)) public membersBySeason;
    mapping(uint256 => uint256) public memberCountBySeason;
    uint256 public currentSeason = 1;
    string private _baseURI;

    constructor() ERC1155("BuZhiDAO Seasonal Membership NFT") {
        admins[msg.sender] = true;
        adminCount = 1;
    }

    modifier onlyAdmin() {
        require(admins[msg.sender], "Only admins can perform this action");
        _;
    }

    function setBaseURI(string memory baseURI) public onlyAdmin {
        _baseURI = baseURI;
    }

    function addAdmin(address admin) public onlyAdmin {
        admins[admin] = true;
        adminCount = adminCount + 1;
    }

    function removeAdmin(address admin) public onlyAdmin {
        require(adminCount > 1, "Cannot remove last admin");
        admins[admin] = false;
        adminCount = adminCount - 1;
    }

    function setCurrentSeason(uint256 seasonId) public onlyAdmin {
        currentSeason = seasonId;
    }

    function mint(
        address[] calldata recipients,
        uint256 seasonId
    ) public onlyAdmin {
        require(seasonId == currentSeason, "Season ID must be current season");
        for (uint256 i = 0; i < recipients.length; i++) {
            address recipient = recipients[i];

            _mint(recipient, seasonId, 1, "");

            membersBySeason[seasonId][recipient] = true;
            memberCountBySeason[seasonId] = memberCountBySeason[seasonId] + 1;
        }
    }

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

    function uri(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "URI query for nonexistent token");

        return string(abi.encodePacked(_baseURI, Strings.toString(tokenId)));
    }

    function _exists(uint256 tokenId) internal view returns (bool) {
        return tokenId <= currentSeason;
    }

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
