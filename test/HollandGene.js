const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();

describe("HollandGene contract", function () {
  async function deployTokenFixture() {
    const HollandGene = await ethers.getContractFactory("HollandGene");
    const [owner, addr1, addr2] = await ethers.getSigners();

    const hardhatToken = await HollandGene.deploy(
      'HollandGene',
      'HG',
      process.env.IPFS_METADATA_URL,
      'invalid'
    );
    await hardhatToken.deployed();

    return { HollandGene, hardhatToken, owner, addr1, addr2 };
  }

  it("mintしたらNFTがmint数分取得できていること", async function () {
    const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
    await hardhatToken.connect(addr1).mint(3, { value: ethers.utils.parseEther("1") });
    const tokenIds = await hardhatToken.tokensOfOwner(addr1.address);
    expect(tokenIds).to.deep.equal(
      [
        ethers.BigNumber.from("1"),
        ethers.BigNumber.from("2"),
        ethers.BigNumber.from("3"),
      ]
    );
  });

  it("あるアカウントの所持tokenIdが飛び飛びになっていてもtokensOfOwnerでtokenIdのリストがとれること", async function () {
    const { hardhatToken, addr1, addr2 } = await loadFixture(deployTokenFixture);
    // addr1の所持tokenIdが飛び飛びになるようmint
    await hardhatToken.connect(addr1).mint(1, { value: ethers.utils.parseEther("1") });
    await hardhatToken.connect(addr2).mint(2, { value: ethers.utils.parseEther("1") });
    await hardhatToken.connect(addr1).mint(1, { value: ethers.utils.parseEther("1") });
    expect(await hardhatToken.tokensOfOwner(addr1.address)).to.deep.equal(
      [
        ethers.BigNumber.from("1"),
        ethers.BigNumber.from("4"),
      ]
    );
  });

  it("ownerは0ethでmintできること", async function () {
    const { hardhatToken, owner } = await loadFixture(deployTokenFixture);
    await hardhatToken.connect(owner).mint(1, { value: ethers.utils.parseEther("0") });
    const tokenIds = await hardhatToken.tokensOfOwner(owner.address);
    expect([ ethers.BigNumber.from("1") ]).to.deep.equal(
      tokenIds
    );
  });

  it("Maxの供給量をpublic関数でセットできること", async function () {
    const { hardhatToken } = await loadFixture(deployTokenFixture);
    await hardhatToken.setMaxSupply(100);
    expect(ethers.BigNumber.from("100")).to.equal(
      await hardhatToken.maxSupply()
    );
  });

  it("Maxの供給量のset関数がowner以外だとエラーになること", async function () {
    const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
    await expect(hardhatToken.connect(addr1).setMaxSupply(100)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    )
  });
});
