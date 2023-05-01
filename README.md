# BZDMembershipNFTs

This is a smart contract that manages BuZhiDAO seasonal membership NFTs using the ERC1155 standard. The contract is responsible for minting, burning, and managing membership tokens for each season.

## Features

- Admin management
- Season management
- Member management
- Metadata management
- Non-transferable membership tokens

## Requirements

- Solidity ^0.8.9
- OpenZeppelin Contracts library

## Installation

Install the OpenZeppelin Contracts library:

```
npm install @openzeppelin/contracts
```

## Usage

1. Deploy the `BZDMembershipNFTs` contract.
2. Use admin management functions to add or remove admins.
3. Use season management functions to set the current season.
4. Use member management functions to mint and burn membership tokens for each season.

## Functions

### addAdmin

Add an admin to the contract.

```solidity
function addAdmin(address admin) public onlyAdmin
```

### removeAdmin

Remove an admin from the contract.

```solidity
function removeAdmin(address admin) public onlyAdmin
```

### adminsCount

Returns the number of admins.

```solidity
function adminsCount() public view returns (uint256)
```

### setCurrentSeason

Set the current season.

```solidity
function setCurrentSeason(uint256 seasonId) public onlyAdmin
```

### membersForSeason

Returns the number of members for the season.

```solidity
function membersForSeason(uint256 seasonId) public view returns (address[] memory)
```

### mintAndAddMembersToSeason

Mints membership NFTs to the specified addresses for the current season.

```solidity
function mintAndAddMembersToSeason(address[] calldata members, uint256 seasonId) public onlyAdmin
```

### burnAndRemoveMemberFromSeason

Burns the membership NFT for the specified address and season.

```solidity
function burnAndRemoveMemberFromSeason(address member, uint256 seasonId) public onlyAdmin
```

### uri

Returns the URI for the specified token ID.

```solidity
function uri(uint256 tokenId) public view override returns (string memory)
```

## License

This smart contract is released under the Unlicensed license.

# BZDMembershipDirectory

This is a smart contract that manages a membership directory using a set-like data structure that's not natively supported in Solidity. The contract allows for adding and deleting members while being able to list all members. And is used for both members and admins in the above membership NFT contract

## Features

- Member count tracking
- Membership status tracking
- Timestamp tracking for joining and removal of members
- Access to each member by index
- Access to all members in the set

## Requirements

- Solidity ^0.8.9
- OpenZeppelin Contracts library

## Installation

Install the OpenZeppelin Contracts library:

```
npm install @openzeppelin/contracts
```

## Usage

1. Inherit or initialize the `BZDMembershipDirectory` contract in your smart contract.
2. Use the `addMember` and `removeMember` functions to manage the membership.
3. Use the `memberByIndex` and `members` functions to access the members.

## Functions

### memberByIndex

Access each member by index.

```solidity
function memberByIndex(uint256 index) public view returns (address)
```

### members

Access all members in the set.

```solidity
function members() public view returns (address[] memory)
```

### addMember

Add a member to the membership directory.

```solidity
function addMember(address member) public onlyOwner
```

### removeMember

Remove a member from the membership directory.

```solidity
function removeMember(address member) public onlyOwner
```

## License

This smart contract is released under the MIT License.
