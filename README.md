Sure thing! Here's the documentation in Markdown format:

## `BZDMembershipNFTs`

A contract for managing BuZhiDAO seasonal membership NFTs using the ERC1155 standard.

### `admins`

```solidity
mapping(address => bool) public admins
```

A mapping of admin addresses to a boolean indicating whether they are currently an admin.

### `membersBySeason`

```solidity
mapping(uint256 => mapping(address => bool)) public membersBySeason
```

A nested mapping of season IDs to a mapping of member addresses to a boolean indicating whether they are a member of the given season.

### `memberCountBySeason`

```solidity
mapping(uint256 => uint256) public memberCountBySeason
```

A mapping of season IDs to the number of members in the given season.

### `currentSeason`

```solidity
uint256 public currentSeason
```

The ID of the current season.

### `_baseURI`

```solidity
string private _baseURI
```

The base URI for the token metadata.

### `constructor()`

The constructor function for the contract. Sets the contract name and initializes the sender as an admin.

### `onlyAdmin`

A modifier function that restricts a function to be callable only by an admin.

### `setBaseURI`

```solidity
function setBaseURI(string memory baseURI) public onlyAdmin
```

Sets the base URI for the token metadata.

### `addAdmin`

```solidity
function addAdmin(address admin) public onlyAdmin
```

Adds a new admin to the contract.

### `removeAdmin`

```solidity
function removeAdmin(address admin) public onlyAdmin
```

Removes an admin from the contract.

### `setCurrentSeason`

```solidity
function setCurrentSeason(uint256 seasonId) public onlyAdmin
```

Sets the ID of the current season.

### `mint`

```solidity
function mint(address[] calldata recipients, uint256 seasonId) public onlyAdmin
```

Mints a new membership NFT for each recipient in the list, for the current season.

### `burn`

```solidity
function burn(address account, uint256 seasonId) public onlyAdmin
```

Burns the membership NFT of the given account for the given season.

### `uri`

```solidity
function uri(uint256 tokenId) public view override returns (string memory)
```

Returns the URI for the token metadata of the given token ID.

### `_exists`

```solidity
function _exists(uint256 tokenId) internal view returns (bool)
```

Returns a boolean indicating whether the given token ID exists.

### `_beforeTokenTransfer`

A hook function that is called before any token transfer operation. This function prevents transferring tokens between addresses.

## References:

- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [Ethereum Improvement Proposal: ERC-1155 Multi Token Standard](https://eips.ethereum.org/EIPS/eip-1155)
