import { ethers } from 'hardhat';
import { expect } from 'chai';
import { BZDMembershipNFTs } from '../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

describe('BZDMembershipNFTs', () => {
  let nft: BZDMembershipNFTs;
  let owner: SignerWithAddress;
  let admin: SignerWithAddress;
  let admin2: SignerWithAddress;
  let admin3: SignerWithAddress;
  let member: SignerWithAddress;
  let otherMember: SignerWithAddress;

  beforeEach(async () => {
    [owner, admin, admin2, admin3, member, otherMember] =
      await ethers.getSigners();

    const BZDMembershipNFTs = await ethers.getContractFactory(
      'BZDMembershipNFTs'
    );
    nft = (await BZDMembershipNFTs.deploy()) as BZDMembershipNFTs;
    await nft.deployed();
    await nft.addAdmin(admin.address);

  });

  describe('admin restrictions', () => {
    it('allows only an admin to set the base URI', async () => {
      await expect(
        nft.connect(member).setBaseURI('https://example.com/')
      ).to.be.revertedWith('Only admins can perform this action');

      await expect(
        nft.connect(admin).setBaseURI('https://example.com/')
      ).to.be.fulfilled;
    });

    it('allows only an admin to add another admin', async () => {
      await expect(nft.connect(member).addAdmin(admin2.address)).to.be
        .reverted;
      await expect(nft.connect(admin).addAdmin(admin2.address)).to.be
        .fulfilled;
      await expect(nft.connect(admin2).addAdmin(admin3.address)).to.be
        .fulfilled;

      expect(await nft.admins(admin2.address)).to.be.true;
      expect(await nft.admins(admin3.address)).to.be.true;
    });

    it('allows only an admin to remove another admin', async () => {
      await expect(nft.connect(member).removeAdmin(admin.address)).to.be
        .reverted;
      await expect(nft.connect(admin).removeAdmin(admin3.address)).to.be
        .reverted;
      await expect(nft.connect(admin2).removeAdmin(admin.address)).to.be
        .fulfilled;

      expect(await nft.admins(admin.address)).to.be.false;
      expect(await nft.admins(admin2.address)).to.be.true;
      expect(await nft.admins(admin3.address)).to.be.false;

    });

    it('allows only an admin to set the current season', async () => {
      await expect(nft.connect(member).setCurrentSeason(2)).to.be.reverted;

      await expect(nft.connect(admin).setCurrentSeason(2)).to.be.fulfilled;

      expect(await nft.currentSeason()).to.equal(2);
    });

    it('allows only an admin to mint tokens', async () => {
      await expect(
        nft.connect(member).mint([member.address], 1)
      ).to.be.revertedWith('Only admins can perform this action');

      await expect(
        nft.connect(admin).mint([member.address], 1)
      ).to.be.fulfilled;

      expect(await nft.balanceOf(member.address, 1)).to.equal(1);
    });

    it('allows only an admin to burn tokens', async () => {
      await nft.setCurrentSeason(1);
      await nft.mint([member.address], 1);

      await expect(
        nft.connect(member).burn(member.address, 1)
      ).to.be.revertedWith('Only admins can perform this action');

      await expect(nft.connect(admin).burn(member.address, 1)).to.be.fulfilled;

      expect(await nft.balanceOf(member.address, 1)).to.equal(0);
    });
  });

  describe('membership tracking', () =>{
  it('adds members to the correct season on minting', async () => {
    await nft.setCurrentSeason(1);
    await nft.mint([member.address], 1);
    await nft.mint([otherMember.address], 1);
    await nft.mint([member.address, otherMember.address], 2);

    expect(await nft.membersBySeason(1, member.address)).to.be.true;
    expect(await nft.membersBySeason(1, otherMember.address)).to.be.true;
    expect(await nft.membersBySeason(2, member.address)).to.be.true;
    expect(await nft.membersBySeason(2, otherMember.address)).to.be.true;
    expect(await nft.memberCountBySeason(1)).to.equal(2);
    expect(await nft.memberCountBySeason(2)).to.equal(2);
  });

  it('removes members from the correct season on burning', async () => {
    await nft.setCurrentSeason(1);
    await nft.mint([member.address, otherMember.address], 1);

    await nft.burn(member.address, 1);

    expect(await nft.membersBySeason(1, member.address)).to.be.false;
    expect(await nft.membersBySeason(1, otherMember.address)).to.be.true;
    expect(await nft.memberCountBySeason(1)).to.equal(1);
  });
});

describe('token metadata', () => {
  beforeEach(async () => {
    await nft.setBaseURI('https://example.com/');
  });

  it('returns the correct URI for a valid token ID', async () => {
    await nft.setCurrentSeason(1);

    const uri = await nft.uri(1);

    expect(uri).to.equal('https://example.com/1');
  });

  it('reverts when querying the URI for an invalid token ID', async () => {
    await nft.setCurrentSeason(1);

    await expect(nft.uri(2)).to.be.revertedWith(
      'URI query for nonexistent token'
    );
  });
});

describe('token transfers', () => {
  it('prevents transferring tokens between addresses', async () => {
    await nft.setCurrentSeason(1);
    await nft.mint([member.address], 1);

    await expect(
      nft.connect(member).safeTransferFrom(
        member.address,
        otherMember.address,
        1,
        1,
        '0x'
      )
    ).to.be.revertedWith('Tokens are non-transferable');

    expect(await nft.balanceOf(member.address, 1)).to.equal(1);
    expect(await nft.balanceOf(otherMember.address, 1)).to.equal(0);
  });
});
});