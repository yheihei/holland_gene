const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs')  // npm install --save merkletreejs
const { keccak256 } = require('@ethersproject/keccak256')  // npm install --save keccak256
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();

describe("HollandGene contract", function () {
  async function deployTokenFixture() {
    const HollandGene = await ethers.getContractFactory("HollandGene");
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const hardhatToken = await HollandGene.deploy(
      'HollandGene',
      'HG',
      'ipfs://CID/',
      'ipfs://notRevealedUri'
    );
    await hardhatToken.deployed();

    return { HollandGene, hardhatToken, owner, addr1, addr2, addr3 };
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
    expect(tokenIds).to.deep.equal(
      [ ethers.BigNumber.from("1") ]
    );
  });

  it("Maxの供給量をpublic関数でセットできること", async function () {
    const { hardhatToken } = await loadFixture(deployTokenFixture);
    await hardhatToken.setMaxSupply(100);
    expect(await hardhatToken.maxSupply()).to.equal(
      ethers.BigNumber.from("100")
    );
  });

  it("Maxの供給量のset関数がowner以外だとエラーになること", async function () {
    const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
    await expect(hardhatToken.connect(addr1).setMaxSupply(100)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    )
  });

  it("revealedがtrueの時、mintしたらリビール前の情報が取得できること", async function () {
    const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
    await hardhatToken.setRevealed(true)
    await hardhatToken.connect(addr1).mint(1, { value: ethers.utils.parseEther("1") });
    const tokenURI = await hardhatToken.tokenURI(1)
    expect(tokenURI).to.equal('ipfs://CID/1.json')
  });

  it("revealedがfalseの時、mintしたらリビール前の情報が取得できること", async function () {
    const { hardhatToken, addr1 } = await loadFixture(deployTokenFixture);
    await hardhatToken.setRevealed(false)
    await hardhatToken.connect(addr1).mint(1, { value: ethers.utils.parseEther("1") });
    const tokenURI = await hardhatToken.tokenURI(1)
    expect(tokenURI).to.equal('ipfs://notRevealedUri')
  });

  it("WL所持済みのアドレスがpreMintできること", async function () {
    const { hardhatToken, addr1, addr2 } = await loadFixture(deployTokenFixture);
    const leaves = [addr1.address, addr2.address].map((x) =>
      keccak256(x)
    )
    // WL登録
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    rootTree = tree.getRoot()
    await hardhatToken.setMerkleRoot(rootTree)

    await hardhatToken.connect(addr1).preMint(
      1,
      /**
       * そのアドレスのproofはMerkleTreeを持った外部に問い合わせてもいいし、
       * フロント側で持っててMerkleTreeを生成して、getHexProofでやるのでも良いだろう
       */
      tree.getHexProof(keccak256(addr1.address)),
      { value: ethers.utils.parseEther("1") }
    );
    const tokenIds = await hardhatToken.tokensOfOwner(addr1.address);
    expect(tokenIds).to.deep.equal(
      [ ethers.BigNumber.from("1") ]
    );
  });

  it("WL未所持のアドレスがpreMintできること", async function () {
    const { hardhatToken, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);
    const leaves = [addr1.address, addr2.address].map((x) =>
      keccak256(x)
    )
    // WL登録
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    rootTree = tree.getRoot()
    await hardhatToken.setMerkleRoot(rootTree)

    await expect(
      hardhatToken.connect(addr3).preMint(
        1,
        tree.getHexProof(keccak256(addr3.address)),
        { value: ethers.utils.parseEther("1") }
      )
    ).to.be.revertedWith("You don't have a whitelist!")
  });
});
