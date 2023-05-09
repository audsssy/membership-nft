// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

interface IBZDMembershipDirectory {
    function isMember(address account) external view returns (bool);
}

interface IBZDMembershipNFT {
    function mintAndAddMembersToSeason(address[] calldata members, uint256 seasonId) external ;
}

struct List {
    uint256 fee;
    address[] list;
    mapping( address => bool) listed;
}

/// @title BZDWhitelist
/// @notice BZD access manager
/// credit: https://github.com/kalidao/kali-contracts/blob/main/contracts/access/KaliAccessManager.sol
contract BZDAccessList {
    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    // event ListCreated(address indexed operator, uint256 id);
    // event AccountListed(address indexed account, uint256 id, bool approved);

    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------

    error Unauthorized();
    error IncorrectAmount();
    error NotListed();
    error NothingToRemove();

    /// -----------------------------------------------------------------------
    /// List Storage
    /// -----------------------------------------------------------------------

    // admins directory
    IBZDMembershipDirectory public admins;
    IBZDMembershipNFT public nft;

    uint256 public listCount;
    mapping(uint256 => address[]) lists;
    mapping(uint256 => uint256) listMintFee;
    mapping(uint256 => mapping(address => bool)) listed;

    /**
     * @dev Modifier to check that the caller is an admin.
     */
    modifier onlyAdmin() {
        if (!admins.isMember(msg.sender)) revert Unauthorized();
        _;
    }

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor(IBZDMembershipDirectory _admins, IBZDMembershipNFT _nft) {
        admins = _admins;
        nft = _nft;
    }

    /// -----------------------------------------------------------------------
    /// List Logic
    /// -----------------------------------------------------------------------

    function listAccount(address[] calldata accounts) external onlyAdmin {
        unchecked {
            ++listCount;
        }

        uint256 length = accounts.length;

        for (uint256 i = 0; i < length; ) {

            lists[listCount].push(accounts[i]);
            listed[listCount][accounts[i]] = true;

            unchecked {
                ++i;
            }
        }
    }

    function removeAccount(uint256 id, address account) external onlyAdmin {
        if (lists[id].length < 1) revert NothingToRemove();

        uint256 length = lists[id].length;
        address accountToRemove;

        for (uint256 i = 0; i < length; ) {

            accountToRemove = lists[id][i];
            
            if (accountToRemove == account) {
                lists[id][i] = address(0);
                listed[id][account] = false;
            }

            unchecked {
                ++i;
            }
        }
    }

    function setMintPrice(uint256 id, uint256 fee) external onlyAdmin {
        listMintFee[id] = fee;
    }

    /// -----------------------------------------------------------------------
    /// Mint Logic
    /// -----------------------------------------------------------------------

    function mint(uint256 id, uint256 _seasonId) external payable {
        if (!listed[id][msg.sender]) revert NotListed();
        if (listMintFee[id] != msg.value) revert IncorrectAmount();

        // Might look into creating a new function at BZDMembershipNFT to add single member
        address[] memory _account = new address[](1);
        _account[1] = msg.sender;

        nft.mintAndAddMembersToSeason(_account, _seasonId);
    }

    /// -----------------------------------------------------------------------
    /// Getter Logic
    /// -----------------------------------------------------------------------

    function verify(uint256 id, address account) external view returns (bool isListed) {
        return listed[id][account];
    }

    function getList(uint256 id) external view returns (address[] memory, uint256) {
        return (lists[id], lists[id].length);
    }

    /// -----------------------------------------------------------------------
    /// Admin Logic
    /// -----------------------------------------------------------------------

    function updateContract(IBZDMembershipDirectory _admins, IBZDMembershipNFT _nft) external onlyAdmin {
        admins = _admins;
        nft = _nft;
    }

    receive() external payable {}
}