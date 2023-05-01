import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";


describe("BZDMembershipNFTs", () => {
  let BZDMembershipNFTs: Contract;
  let owner: Signer;
  let addr1: Signer;
  let addr2: Signer;
  let addrs: Signer[];

  beforeEach(async () => {
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    const BZDMembershipNFTsFactory = await ethers.getContractFactory("BZDMembershipNFTs");
    BZDMembershipNFTs = await BZDMembershipNFTsFactory.deploy();
    await BZDMembershipNFTs.deployed();
  });

  it("Deployment should set the owner and the first admin", async () => {
    expect(await BZDMembershipNFTs.owner()).to.equal(await owner.getAddress());
    expect(await BZDMembershipNFTs.admins(await owner.getAddress())).to.be.true;
  });

  it("Only admins can mint tokens", async () => {
    const seasonId = 1;
    const addr1Address = await addr1.getAddress();
    await expect(BZDMembershipNFTs.connect(addr1).mint([addr1Address], seasonId)).to.be.revertedWith("Only admins can perform this action");
  });

  it("Admins can add and remove other admins", async () => {
    const addr1Address = await addr1.getAddress();
    await BZDMembershipNFTs.addAdmin(addr1Address);
    expect(await BZDMembershipNFTs.admins(addr1Address)).to.be.true;

    await BZDMembershipNFTs.connect(addr1).removeAdmin(addr1Address);
    expect(await BZDMembershipNFTs.admins(addr1Address)).to.be.false;
  });

  it("Admins can update the base URI", async () => {
    const newBaseURI = "https://example.com/api/";
    await BZDMembershipNFTs.setBaseURI(newBaseURI);
    expect(await BZDMembershipNFTs.uri(1)).to.equal(newBaseURI + "1");
  });

  it("Admins can update the current season", async () => {
    const newSeason = 2;
    await BZDMembershipNFTs.setCurrentSeason(newSeason);
    expect(await BZDMembershipNFTs.currentSeason()).to.equal(newSeason);
  });

  it("Minting tokens increases the member count for a season", async () => {
    const seasonId = 1;
    const addr1Address = await addr1.getAddress();
    const addr2Address = await addr2.getAddress();

    await BZDMembershipNFTs.mint([addr1Address, addr2Address], seasonId);

    expect(await BZDMembershipNFTs.memberCountBySeason(seasonId)).to.equal(2);
    expect(await BZDMembershipNFTs.membersBySeason(seasonId, addr1Address)).to.be.true;
    expect(await BZDMembershipNFTs.membersBySeason(seasonId, addr2Address)).to.be.true;
  });

  it("Minting tokens for the same season does not duplicate memberships", async () => {
    const seasonId = 1;
    const addr1Address = await addr1.getAddress();

    await BZDMembershipNFTs.mint([addr1Address], seasonId);
    await BZDMembershipNFTs.mint([addr1Address], seasonId);

    expect(await BZDMembershipNFTs.memberCountBySeason(seasonId)).to.equal(1);
  });

  it("Admins can burn tokens and decrease the member count for a season", async () => {
    const seasonId = 1;
    const addr1Address = await addr1.getAddress();
    await BZDMembershipNFTs.mint([addr1Address], seasonId);

    await BZDMembershipNFTs.burn(addr1Address, seasonId);

    expect(await BZDMembershipNFTs.memberCountBySeason(seasonId)).to.equal(0);
    expect(await BZDMembershipNFTs.membersBySeason(seasonId, addr1Address)).to.be.false;
  });

  it("Token transfers are not allowed", async () => {
    const seasonId = 1;
    const addr1Address = await addr1.getAddress();
    const addr2Address = await addr2.getAddress();

    await BZDMembershipNFTs.mint([addr1Address], seasonId);

    await expect(BZDMembershipNFTs.connect(addr1)["safeTransferFrom(address,address,uint256,uint256,bytes)"](addr1Address, addr2Address, seasonId, 1, "0x")).to.be.revertedWith("Tokens are non-transferable");
  });
});