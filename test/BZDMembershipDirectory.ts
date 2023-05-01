import { expect } from "chai";
import { ethers } from "hardhat";
import { BZDMembershipDirectory } from "../typechain";
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'; 

describe("BZDMembershipDirectory", function () {
  let membershipDirectory: BZDMembershipDirectory;
  let owner: SignerWithAddress, addr1:SignerWithAddress, addr2:SignerWithAddress, nonOwner: SignerWithAddress;

  beforeEach(async function () {
    membershipDirectory = await ethers.getContractFactory("BZDMembershipDirectory");

    [owner, addr1, addr2, nonOwner] = await ethers.getSigners();

    membershipDirectory = await membershipDirectory.deploy();
    await membershipDirectory.deployed();
  });

  it("Should initialize with the correct owner", async function () {
    expect(await membershipDirectory.owner()).to.equal(owner.address);
  });

  it("Should add members correctly", async function () {
    await membershipDirectory.addMember(addr1.address);
    expect(await membershipDirectory.isMember(addr1.address)).to.be.true;
    expect(await membershipDirectory.memberJoinedTimestamp(addr1.address)).to.not.equal(0);

    await membershipDirectory.addMember(addr2.address);
    expect(await membershipDirectory.isMember(addr2.address)).to.be.true;
    expect(await membershipDirectory.memberJoinedTimestamp(addr2.address)).to.not.equal(0);
  });

  it("Should not add a member that is already in the directory", async function () {
    await membershipDirectory.addMember(addr1.address);
    await expect(membershipDirectory.addMember(addr1.address)).to.be.revertedWith("Member already exists");
  });

  it("Should remove members correctly", async function () {
    await membershipDirectory.addMember(addr1.address);
    await membershipDirectory.removeMember(addr1.address);
    expect(await membershipDirectory.isMember(addr1.address)).to.be.false;
    expect(await membershipDirectory.memberRemovedTimestamp(addr1.address)).to.not.equal(0);
  });

  it("Should not remove a member that is not in the directory", async function () {
    await expect(membershipDirectory.removeMember(addr1.address)).to.be.revertedWith("Member does not exist");
  });

  it("Should return the correct member count", async function () {
    expect(await membershipDirectory.memberCount()).to.equal(0);

    await membershipDirectory.addMember(addr1.address);
    expect(await membershipDirectory.memberCount()).to.equal(1);

    await membershipDirectory.addMember(addr2.address);
    expect(await membershipDirectory.memberCount()).to.equal(2);

    await membershipDirectory.removeMember(addr1.address);
    expect(await membershipDirectory.memberCount()).to.equal(1);
  });

  it("Should return the correct list of members", async function () {
    await membershipDirectory.addMember(addr1.address);
    await membershipDirectory.addMember(addr2.address);

    const members = await membershipDirectory.members();
    expect(members.length).to.equal(2);
    expect(members).to.include(addr1.address);
    expect(members).to.include(addr2.address);
  });

  it("Should not allow non-owner to add members", async function () {
    await expect(membershipDirectory.connect(nonOwner).addMember(addr1.address)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should not allow non-owner to remove members", async function () {
    await membershipDirectory.addMember(addr1.address);
    await expect(membershipDirectory.connect(nonOwner).removeMember(addr1.address)).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should return correct member address by index", async function () {
    await membershipDirectory.addMember(addr1.address);
    await membershipDirectory.addMember(addr2.address);

    expect(await membershipDirectory.memberByIndex(0)).to.equal(addr1.address);
    expect(await membershipDirectory.memberByIndex(1)).to.equal(addr2.address);
  });

  it("Should return an empty array when no members are present", async function () {
    const members = await membershipDirectory.members();
    expect(members.length).to.equal(0);
  });

  it("Should return correct member joined and removed timestamps", async function () {
    await membershipDirectory.addMember(addr1.address);
    const joinTimestamp = await membershipDirectory.memberJoinedTimestamp(addr1.address);

    expect(joinTimestamp).to.not.equal(0);

    await membershipDirectory.removeMember(addr1.address);
    const removedTimestamp = await membershipDirectory.memberRemovedTimestamp(addr1.address);

    expect(removedTimestamp).to.not.equal(0);
    expect(removedTimestamp).to.be.gt(joinTimestamp);
  });

  it("Should allow non-owner to access memberByIndex", async function () {
    await membershipDirectory.addMember(addr1.address);

    expect(await membershipDirectory.connect(nonOwner).memberByIndex(0)).to.equal(addr1.address);
  });
});

