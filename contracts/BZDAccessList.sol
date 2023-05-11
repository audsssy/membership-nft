// SPDX-License-Identifier: MIT

pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Multicall.sol";

interface IBZDMembershipDirectory {
    function isMember(address account) external view returns (bool);
}

interface IBZDMembershipNFT {
    function mintAndAddMembersToSeason(address member, uint256 seasonId) external ;
}

struct List {
    bool open;
    uint256 fee;
    address[] list;
    mapping(address => bool) listed;
}

/// @title BZDWhitelist
/// @notice BZD access manager
/// credit: https://github.com/kalidao/kali-contracts/blob/main/contracts/access/KaliAccessManager.sol
contract BZDAccessList is Multicall {
    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------

    error Unauthorized();

    error IncorrectAmount();

    error MintHasNotStarted();

    error NotListed();

    error NoAccountToRemove();

    error NoAccountToAdd();

    error WithdrawalFailed();

    error ListNotFound();
    
    /// -----------------------------------------------------------------------
    /// Storage
    /// -----------------------------------------------------------------------

    /// @dev BZDMembershipDirectory contract.
    IBZDMembershipDirectory public admins;
    
    /// @dev BZDMembershipNFT contract.
    IBZDMembershipNFT public nft;

    uint256 public listCount;
    
    mapping(uint256 => List) public lists;

    /// -----------------------------------------------------------------------
    /// Modifier
    /// -----------------------------------------------------------------------

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

    /// @notice Add accounts.
    /// @param accounts An array of accounts to add to an access list.
    function list(address[] calldata accounts) external onlyAdmin {
        if (accounts.length == 0) revert NoAccountToAdd();
        unchecked {
            ++listCount;
        }

        uint256 length = accounts.length;

        for (uint256 i = 0; i < length; ) {

            lists[listCount].list.push(accounts[i]);
            lists[listCount].listed[accounts[i]] = true;

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Add accounts to an existing list.
    /// @param id The identifier of an existing list.
    /// @param accounts An array of accounts to add to an existing access list.
    function updateList(uint256 id, address[] calldata accounts) external onlyAdmin {
        if (accounts.length == 0) revert NoAccountToAdd();

        (, , , uint256 _length) = this.getList(id);

        if (_length > 0) {
            uint256 length = accounts.length;

            for (uint256 i = 0; i < length; ) {

                lists[id].list.push(accounts[i]);
                lists[id].listed[accounts[i]] = true;

                unchecked {
                    ++i;
                }
            }
        } else {
            revert ListNotFound();
        }
    }

    /// @notice Remove single account from an existing list.
    /// @param id The identifier of an existing list.
    /// @param account An account to be removed from an existing access list.
    function remove(uint256 id, address account) external onlyAdmin {
        (, , address[] memory _lists, uint256 _length ) = this.getList(id);
        if (_length < 1) revert NoAccountToRemove();

        address accountToRemove;

        for (uint256 i = 0; i < _length; ) {
            accountToRemove = _lists[i];
            
            if (accountToRemove == account) {
                delete lists[id].list[i];
                delete lists[listCount].listed[accountToRemove];
            }

            unchecked {
                ++i;
            }
        }
    }

    /// @notice Update mint price per access list.
    /// @param id The identifier of an access list.
    /// @param _fee The fee required to mint a BZDMembershipNFT.
    function setMintPrice(uint256 id, uint256 _fee) external onlyAdmin {
        lists[id].fee = _fee;
    }

    /// @notice Allow an access list to start minting BZDMembershipNFTs.
    /// @param id The identifier of a list.
    /// @param _open Status to mint a BZDMembershipNFT.
    function startMint(uint256 id, bool _open) external onlyAdmin {
        lists[id].open = _open;
    }

    /// -----------------------------------------------------------------------
    /// Mint Logic
    /// -----------------------------------------------------------------------

    /// @notice Allow an access list to start minting BZDMembershipNFTs.
    /// @param id The identifier of an access list.
    /// @param seasonId The season to mint a BZDMembershipNFT.
    function mint(uint256 id, uint256 seasonId) external payable {
        (bool _open, uint256 _fee, ,) = this.getList(id);
        (bool isListed) = this.verifyAccount(id, msg.sender);

        if (!isListed) revert NotListed();
        if (!_open) revert MintHasNotStarted();
        if (_fee != msg.value) revert IncorrectAmount();

        nft.mintAndAddMembersToSeason(msg.sender, seasonId);
    }

    /// -----------------------------------------------------------------------
    /// Getter Logic
    /// -----------------------------------------------------------------------

    function verifyAccount(uint256 id, address account) external view returns (bool isListed) {
        return lists[id].listed[account];
    }

    function getList(uint256 id) external view returns (bool, uint256, address[] memory, uint256) {
        return (lists[id].open, lists[id].fee, lists[id].list, lists[id].list.length);
    }

    /// -----------------------------------------------------------------------
    /// Admin Logic
    /// -----------------------------------------------------------------------

    /// @notice Update contract addresses.
    /// @param _admins The address of a BZDMembershipDirectory contract.
    /// @param _nft The address of a BZDMembershipNFT contract.
    function updateContract(IBZDMembershipDirectory _admins, IBZDMembershipNFT _nft) external onlyAdmin {
        admins = _admins;
        nft = _nft;
    }
    
    /// @notice Withraw funds from this BZDAccessList contract.
    /// @param to The recipient to send funds to.
    function withdraw(address payable to) external onlyAdmin {
        (bool success, ) = to.call{value: address(this).balance}("");
        if (!success) revert WithdrawalFailed();
    }

    receive() external payable {}
}