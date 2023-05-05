import { ethers } from "hardhat";
import { expect } from "chai";
import { BZDMembershipNFTs } from "../typechain";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'; 

describe("BZDMembershipNFTs", () => {
  let contract: BZDMembershipNFTs;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addr3: SignerWithAddress;
  beforeEach(async () => {
    [owner, addr1, addr2, addr3] = await ethers.getSigners();
    const ContractFactory = await ethers.getContractFactory(
      "BZDMembershipNFTs"
    );
    contract = (await ContractFactory.deploy()) as BZDMembershipNFTs;
    await contract.deployed();
  });

  // Test 1: Successful deployment with correct initial state
  it("Should successfully deploy with the correct initial state", async () => {
    expect(await contract.currentSeason()).to.equal(1);
    expect(await contract.adminsCount()).to.equal(1);
  });

  // Test 2: Adding and removing an admin
  it("Should add and remove an admin", async () => {
    await contract.addAdmin(addr1.address);
    expect(await contract.adminsCount()).to.equal(2);

    await contract.connect(addr1).removeAdmin(addr1.address);
    expect(await contract.adminsCount()).to.equal(1);
  });

  // Test 3: Only admin can add or remove other admins
  it("Should not allow non-admins to add or remove admins", async () => {
    await contract.addAdmin(addr1.address);

    expect(
      contract.connect(addr2).addAdmin(addr2.address)
    ).to.be.revertedWithCustomError(contract, "Unauthorized");
    expect(
      contract.connect(addr2).removeAdmin(addr1.address)
    ).to.be.revertedWithCustomError(contract, "Unauthorized");
  });

  // Test 4: Setting base URI for token metadata
  it("Should set the base URI for token metadata", async () => {
    const newBaseURI = "https://example.com/metadata/";
    await contract.setBaseURI(newBaseURI);
    expect(await contract.uri(1)).to.equal(newBaseURI + "1");
  });

  // Test 5: Only admin can set base URI
  it("Should not allow non-admins to set the base URI", async () => {
    const newBaseURI = "https://example.com/metadata/";
    expect(
      contract.connect(addr1).setBaseURI(newBaseURI)
    ).to.be.revertedWithCustomError(contract, "Unauthorized");
  });

  // Test 6: Setting current season
  it("Should set the current season", async () => {
    const newSeason = 2;
    await contract.setCurrentSeason(newSeason);
    expect(await contract.currentSeason()).to.equal(newSeason);
  });

  // Test 7: Only admin can set current season
  it("Should not allow non-admins to set the current season", async () => {
    const newSeason = 2;
    expect(
      contract.connect(addr1).setCurrentSeason(newSeason)
    ).to.be.revertedWithCustomError(contract, "Unauthorized");
  });

  // Test 8: Minting membership NFTs and adding members to the season
  it("Should mint membership NFTs and add members to the season", async () => {
    const members = [addr1.address, addr2.address];
    const seasonId = 1;

    await contract.mintAndAddMembersToSeason(members, seasonId);

    // Check if the membership NFTs were minted
    expect(await contract.balanceOf(addr1.address, seasonId)).to.equal(1);
    expect(await contract.balanceOf(addr2.address, seasonId)).to.equal(1);

    // Check if members were added to the season
    const seasonMembers = await contract.membersForSeason(seasonId);
    expect(seasonMembers).to.include.members(members);
  });

  // Test 9: Only admin can mint membership NFTs
  it("Should not allow non-admins to mint membership NFTs", async () => {
    const members = [addr1.address, addr2.address];
    const seasonId = 1;

    expect(
      contract.connect(addr1).mintAndAddMembersToSeason(members, seasonId)
    ).to.be.revertedWithCustomError(contract, "Unauthorized");
  });

  // Test 10: Minting membership NFTs only for the current season
  it("Should not allow minting membership NFTs for a non-current season", async () => {
    const members = [addr1.address, addr2.address];
    const seasonId = 2;

    expect(
      contract.mintAndAddMembersToSeason(members, seasonId)
    ).to.be.revertedWithCustomError(contract, "Unauthorized");
  });

  // Test 11: Burning membership NFTs and removing members from the season
  it("Should burn membership NFTs and remove members from the season", async () => {
    const members = [addr1.address, addr2.address];
    const seasonId = 1;

    // Mint NFTs and add members to the season
    await contract.mintAndAddMembersToSeason(members, seasonId);

    // Burn NFTs and remove members from the season
    await contract.burnAndRemoveMemberFromSeason(addr1.address, seasonId);
    await contract.burnAndRemoveMemberFromSeason(addr2.address, seasonId);

    // Check if the membership NFTs were burned
    expect(await contract.balanceOf(addr1.address, seasonId)).to.equal(0);
    expect(await contract.balanceOf(addr2.address, seasonId)).to.equal(0);

    // Check if members were removed from the season
    const seasonMembers = await contract.membersForSeason(seasonId);
    expect(seasonMembers).to.not.include.members(members);
  });

  // Test 12: Only admin can burn membership NFTs
  it("Should not allow non-admins to burn membership NFTs", async () => {
    const members = [addr1.address, addr2.address];
    const seasonId = 1;

    // Mint NFTs and add members to the season
    await contract.mintAndAddMembersToSeason(members, seasonId);

    expect(
      contract
        .connect(addr1)
        .burnAndRemoveMemberFromSeason(addr1.address, seasonId)
    ).to.be.revertedWithCustomError(contract, "Unauthorized");
  });

  // Test 13: Burning membership NFTs only for existing season members
  it("Should not allow burning membership NFTs for non-season members", async () => {
    const seasonId = 2;

    expect(
      contract.burnAndRemoveMemberFromSeason(addr1.address, seasonId)
      // Test 13 continued: Burning membership NFTs only for existing season members
    ).to.be.revertedWithCustomError(contract, "NotInSeason");
  });

  // Test 14: Transferring membership NFTs should be prevented
  it("Should prevent transferring membership NFTs", async () => {
    const members = [addr1.address];
    const seasonId = 1;

    // Mint NFTs and add members to the season
    await contract.mintAndAddMembersToSeason(members, seasonId);

    await expect(
      contract
        .connect(addr1)
        .safeTransferFrom(addr1.address, addr2.address, seasonId, 1, [])
    ).to.be.revertedWithCustomError(contract, "NonTransferable");
  });

  // Test 15: Batch transferring membership NFTs should be prevented
  it("Should prevent batch transferring membership NFTs", async () => {
    const members = [addr1.address, addr2.address];
    const seasonId = 1;

    // Mint NFTs and add members to the season
    await contract.mintAndAddMembersToSeason(members, seasonId);

    await expect(
      contract
        .connect(addr1)
        .safeBatchTransferFrom(
          addr1.address,
          addr2.address,
          [seasonId, seasonId],
          [1, 1],
          []
        )
    ).to.be.revertedWithCustomError(contract, "NonTransferable");
  });

  // Test 16: Adding multiple admins
  it("Should add multiple admins", async () => {
    await contract.addAdmin(addr2.address);
    await contract.addAdmin(addr3.address);

    const adminsDirectoryAddress = await contract.admins();
    const adminsDirectory = await ethers.getContractAt(
      "BZDMembershipDirectory",
      adminsDirectoryAddress
    );

    expect(await adminsDirectory.memberCount()).to.equal(3);
    expect(await adminsDirectory.isMember(addr2.address)).to.be.true;
    expect(await adminsDirectory.isMember(addr3.address)).to.be.true;
  });

  // Test 17: Newly added admin performing admin-only actions
  it("Should allow newly added admin to perform admin-only actions", async () => {
    // Add addr2 as admin
    await contract.addAdmin(addr2.address);

    // Set new baseURI
    const newBaseURI = "https://example.com/metadata/";
    await contract.connect(addr2).setBaseURI(newBaseURI);
    expect(await contract.uri(1)).to.equal(newBaseURI + "1");

    // // Set current season
    const newSeason = 1;
    await contract.connect(addr2).setCurrentSeason(newSeason);
    expect(await contract.currentSeason()).to.equal(newSeason);

    // Mint NFTs for new season
    const members = [addr1.address, addr3.address];
    await contract.mintAndAddMembersToSeason(members, newSeason);

    const memberDirectoryAddress = await contract.membersBySeason(newSeason);
    const memberDirectory = await ethers.getContractAt(
      "BZDMembershipDirectory",
      memberDirectoryAddress
    );

    expect(await contract.balanceOf(addr1.address, newSeason)).to.equal(1);
    expect(await memberDirectory.isMember(addr1.address)).to.be.true;
    expect(await memberDirectory.isMember(addr3.address)).to.be.true;
  });
});
    
