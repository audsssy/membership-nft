import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  BZDAccessList,
  BZDMembershipDirectory,
  BZDMembershipNFTs,
} from "../typechain";

describe("BZDAccessList", function () {
  let accessList: BZDAccessList;
  let membershipDirectory: BZDMembershipDirectory;
  let membershipNFTs: BZDMembershipNFTs;

  let owner: SignerWithAddress,
    addr1: SignerWithAddress,
    addr2: SignerWithAddress,
    nonOwner: SignerWithAddress;

  beforeEach(async function () {
    const accessListFactory = await ethers.getContractFactory("BZDAccessList");
    const membershipDirectoryFactory = await ethers.getContractFactory(
      "BZDMembershipDirectory"
    );
    const membershipNFTsFactory = await ethers.getContractFactory(
      "BZDMembershipNFTs"
    );

    [owner, addr1, addr2, nonOwner] = await ethers.getSigners();

    membershipDirectory =
      (await membershipDirectoryFactory.deploy()) as BZDMembershipDirectory;
    membershipNFTs =
      (await membershipNFTsFactory.deploy()) as BZDMembershipNFTs;
    accessList = (await accessListFactory.deploy(
      membershipDirectory.address,
      membershipNFTs.address
    )) as BZDAccessList;

    // Add admin
    await membershipDirectory.addMember(addr1.address);

    // Add accessList to membershipNFTs
    await membershipNFTs.updateContract(accessList.address);
  });

  it("Should initialize with the correct params", async function () {
    expect(await membershipDirectory.owner()).to.equal(owner.address);
    expect(await membershipDirectory.isMember(addr1.address)).to.be.true;

    expect(await accessList.nft()).to.equal(membershipNFTs.address);
    expect(await accessList.admins()).to.equal(membershipDirectory.address);
  });

  it("Should allow admin to add accounts to access list", async function () {
    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);

    let count = await accessList.listCount();
    // console.log(count)
    const [open, fee, list, listLength] = await accessList.getList(
      accessList.listCount()
    );

    expect(list[0]).to.equal(owner.address);
    expect(list[1]).to.equal(addr1.address);
    expect(list[2]).to.equal(addr2.address);

    expect(await accessList.verifyAccount(count, owner.address)).to.be.true;
    expect(await accessList.verifyAccount(count, addr1.address)).to.be.true;
    expect(await accessList.verifyAccount(count, addr2.address)).to.be.true;
  });

  it("Should not allow admin to add empty account array to access list", async function () {
    expect(accessList
      .connect(addr1)
      .list([])).to.be.revertedWithCustomError(accessList, "NoAccountToAdd");
  });

  it("Should not allow non-admin to add accounts to access list", async function () {
    expect(
      accessList
        .connect(addr2)
        .list([owner.address, addr1.address, addr2.address])
    ).to.be.revertedWithCustomError(accessList, "Unauthorized");
  });

  it("Should allow admin to update accounts to existing access list", async function () {
    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);

    let count = await accessList.listCount();
    const [, , list, listCount] = await accessList.getList(count);
    // console.log("list", list, listCount);

    expect(list[0]).to.equal(owner.address);
    expect(list[1]).to.equal(addr1.address);
    expect(list[2]).to.equal(addr2.address);

    await accessList
      .connect(addr1)
      .updateList(count, [
        nonOwner.address,
        addr1.address,
      ]);

    const [, , updatedList, updatedListCount] = await accessList.getList(count);
    // console.log("updatedList", updatedList, updatedListCount);
    expect(updatedList[0]).to.equal(owner.address);
    expect(updatedList[1]).to.equal(addr1.address);
    expect(updatedList[2]).to.equal(addr2.address);
    expect(updatedList[3]).to.equal(nonOwner.address);
    expect(updatedList[4]).to.equal(addr1.address);
    
    expect(await accessList.verifyAccount(count, owner.address)).to.be.true;
    expect(await accessList.verifyAccount(count, addr1.address)).to.be.true;
    expect(await accessList.verifyAccount(count, addr2.address)).to.be.true;
    expect(await accessList.verifyAccount(count, nonOwner.address)).to.be.true;
  });

  it("Should not allow admin to update accounts to an empty access list", async function () {
    await expect(
      accessList
        .connect(addr1)
        .updateList(1, [owner.address, addr1.address, addr2.address])
    ).to.be.revertedWithCustomError(accessList, "ListNotFound");
  });

  it("Should not allow non-admin to update accounts", async function () {
    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);

    const [, , list, ] = await accessList.getList(
      accessList.listCount()
    );

    expect(list[0]).to.equal(owner.address);
    expect(list[1]).to.equal(addr1.address);
    expect(list[2]).to.equal(addr2.address);

    await expect(
      accessList
        .connect(addr2)
        .updateList(1, [owner.address, addr1.address, addr2.address])
    ).to.be.revertedWithCustomError(accessList, "Unauthorized");
  });

  it("Should allow admin to update new contracts", async function () {
    await accessList
      .connect(addr1)
      .updateContract(ethers.constants.AddressZero, ethers.constants.AddressZero);

    expect(await accessList.admins()).to.equal(ethers.constants.AddressZero);
    expect(await accessList.nft()).to.equal(ethers.constants.AddressZero);
  });

  it("Should not allow non-admin to add accounts to access list", async function () {
    await expect(
      accessList
        .connect(addr2)
        .updateContract(
          ethers.constants.AddressZero,
          ethers.constants.AddressZero
        )
    ).to.be.revertedWithCustomError(accessList, "Unauthorized");
  });

  it("Should allow admin to remove accounts from access list", async function () {
    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);

    const [, , list] = await accessList.getList(accessList.listCount());

    expect(list[0]).to.equal(owner.address);
    expect(list[1]).to.equal(addr1.address);
    expect(list[2]).to.equal(addr2.address);

    await accessList
      .connect(addr1)
      .remove(accessList.listCount(), owner.address);

    const [, , _list] = await accessList.getList(accessList.listCount());

    expect(_list[0]).to.equal(ethers.constants.AddressZero);
    expect(_list[1]).to.equal(addr1.address);
    expect(_list[2]).to.equal(addr2.address);
  });

  // ADD ANOTHER TO INVOKE NoAccountToAdd();

  it("Should not allow non-admin to remove accounts to access list", async function () {
    await expect(
      accessList.connect(addr2).remove(accessList.listCount(), owner.address)
    ).to.be.revertedWithCustomError(accessList, "Unauthorized");
  });

  it("Should allow admin to set mint price", async function () {
    await accessList.connect(addr1).setMintPrice(accessList.listCount(), 100);
    const [, fee, ,] = await accessList.getList(accessList.listCount());
    expect(fee).to.equal(100);
  });

  it("Should not allow non-admin to set mint price", async function () {
    await expect(
      accessList.connect(addr2).setMintPrice(accessList.listCount(), 100)
    ).to.be.revertedWithCustomError(accessList, "Unauthorized");
  });

  it("Should allow admin to start mint", async function () {
    await accessList.connect(addr1).startMint(accessList.listCount(), true);
    const [open, , ,] = await accessList.getList(accessList.listCount());
    expect(open).to.equal(true);
  });

  it("Should not allow non-admin to start mint", async function () {
    await expect(
      accessList.connect(addr2).startMint(accessList.listCount(), true)
    ).to.be.revertedWithCustomError(accessList, "Unauthorized");
  });

  it("Should allow minting if on access list", async function () {
    const seasonId = 1;
    let count = await accessList.listCount();

    await membershipNFTs.updateContract(accessList.address);

    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);
    // console.log(count);

    count = await accessList.listCount();
    await accessList
      .connect(addr1)
      .setMintPrice(count, ethers.utils.parseEther("1"));
    await accessList.connect(addr1).startMint(count, true);

    // console.log(await membershipNFTs.balanceOf(addr2.address, seasonId));
    const [, fee, list] = await accessList.getList(count);

    expect(fee).to.equal(ethers.utils.parseEther("1"));
    expect(list[1]).to.equal(addr1.address);

    await accessList.connect(addr2).mint(count, seasonId, {
      value: ethers.utils.parseEther("1"),
    });
    expect(await membershipNFTs.balanceOf(addr2.address, seasonId)).to.equal(1);
  });

  it("Should not allow minting if not on access list", async function () {
    const seasonId = 1;
    let count = await accessList.listCount();

    await membershipNFTs.updateContract(accessList.address);

    await accessList.connect(addr1).list([owner.address, addr1.address]);
    // console.log(count);

    count = await accessList.listCount();
    await accessList
      .connect(addr1)
      .setMintPrice(count, ethers.utils.parseEther("1"));
    await accessList.connect(addr1).startMint(count, true);

    // console.log(await membershipNFTs.balanceOf(addr2.address, seasonId));
    const [, fee, list] = await accessList.getList(count);

    expect(fee).to.equal(ethers.utils.parseEther("1"));
    expect(list[1]).to.equal(addr1.address);

    await expect(
      accessList.connect(addr2).mint(count, seasonId, {
        value: ethers.utils.parseEther("1"),
      })
    ).to.revertedWithCustomError(accessList, "NotListed");
  });

  it("Should not allow minting if minting has not started", async function () {
    const seasonId = 1;
    let count = await accessList.listCount();

    await membershipNFTs.updateContract(accessList.address);

    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);
    // console.log(count);

    count = await accessList.listCount();
    await accessList
      .connect(addr1)
      .setMintPrice(count, ethers.utils.parseEther("1"));

    const [, fee, list] = await accessList.getList(count);

    expect(fee).to.equal(ethers.utils.parseEther("1"));
    expect(list[1]).to.equal(addr1.address);

    await expect(
      accessList.connect(addr2).mint(count, seasonId, {
        value: ethers.utils.parseEther("1"),
      })
    ).to.revertedWithCustomError(accessList, "MintHasNotStarted");
  });

  it("Should not allow double minting even if on access list", async function () {
    const seasonId = 1;
    let count = await accessList.listCount();

    await membershipNFTs.updateContract(accessList.address);

    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);
    // console.log(count);

    count = await accessList.listCount();
    await accessList
      .connect(addr1)
      .setMintPrice(count, ethers.utils.parseEther("1"));
    await accessList.connect(addr1).startMint(count, true);

    await accessList.connect(addr2).mint(count, seasonId, {
      value: ethers.utils.parseEther("1"),
    });
    expect(await membershipNFTs.balanceOf(addr2.address, seasonId)).to.equal(1);

    await expect(
      accessList.connect(addr2).mint(count, seasonId, {
        value: ethers.utils.parseEther("1"),
      })
    ).to.revertedWithCustomError(membershipNFTs, "ExistingMember");
  });

  it("Should not allow minting even if minting price unmatched", async function () {
    const seasonId = 1;
    let count = await accessList.listCount();

    await membershipNFTs.updateContract(accessList.address);

    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);
    // console.log(count);

    count = await accessList.listCount();
    await accessList
      .connect(addr1)
      .setMintPrice(count, ethers.utils.parseEther("1"));
    await accessList.connect(addr1).startMint(count, true);

    await expect(
      accessList.connect(addr2).mint(count, seasonId, {
        value: ethers.utils.parseEther("0.5"),
      })
    ).to.revertedWithCustomError(accessList, "IncorrectAmount");
  });
  
  it("Should allow admin to withdraw from BZDAccessList", async function () {
    const seasonId = 1;
    let count = await accessList.listCount();

    await membershipNFTs.updateContract(accessList.address);

    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);

    count = await accessList.listCount();
    await accessList
      .connect(addr1)
      .setMintPrice(count, ethers.utils.parseEther("1"));
    await accessList.connect(addr1).startMint(count, true);

    const [, fee, list] = await accessList.getList(count);
    expect(fee).to.equal(ethers.utils.parseEther("1"));
    expect(list[1]).to.equal(addr1.address);

    await accessList.connect(addr2).mint(count, seasonId, {
      value: ethers.utils.parseEther("1"),
    });

    let balance = await ethers.provider.getBalance(accessList.address);
    expect(balance).to.equal(ethers.utils.parseEther("1"));
    await accessList.connect(addr1).withdraw(nonOwner.address);
    balance = await ethers.provider.getBalance(accessList.address);
    expect(balance).to.equal(0);
  });

  it("Should not allow non-admin to withdraw from BZDAccessList", async function () {
    const seasonId = 1;
    let count = await accessList.listCount();

    await membershipNFTs.updateContract(accessList.address);

    await accessList
      .connect(addr1)
      .list([owner.address, addr1.address, addr2.address]);

    count = await accessList.listCount();
    await accessList
      .connect(addr1)
      .setMintPrice(count, ethers.utils.parseEther("1"));
    await accessList.connect(addr1).startMint(count, true);

    const [, fee, list] = await accessList.getList(count);
    expect(fee).to.equal(ethers.utils.parseEther("1"));
    expect(list[1]).to.equal(addr1.address);

    await accessList.connect(addr2).mint(count, seasonId, {
      value: ethers.utils.parseEther("1"),
    });
    
    let balance = await ethers.provider.getBalance(accessList.address);
    expect(balance).to.equal(ethers.utils.parseEther("1"));
    await expect(accessList.connect(addr2).withdraw(nonOwner.address)).to.be.revertedWithCustomError(accessList, "Unauthorized");

    balance = await ethers.provider.getBalance(accessList.address);
    expect(balance).to.equal(ethers.utils.parseEther("1"));
  });
});
