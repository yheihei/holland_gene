const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require('merkletreejs')  // npm install --save merkletreejs
const { keccak256 } = require('@ethersproject/keccak256')  // npm install --save keccak256
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
require("dotenv").config();

describe("ノーマルmint系機能", function () {
  async function deployTokenFixture() {
    const HollandGene = await ethers.getContractFactory("HollandGene");
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const nftContract = await HollandGene.deploy(
      'HollandGene',
      'HG',
      'ipfs://CID/',
      'ipfs://notRevealedUri'
    );
    await nftContract.deployed();
    // public saleにしておく
    await nftContract.setPhase(2)

    return { HollandGene, nftContract, owner, addr1, addr2, addr3 };
  }

  it("mintしたらNFTがmint数分取得できていること", async function () {
    const { nftContract, addr1 } = await loadFixture(deployTokenFixture);
    await nftContract.connect(addr1).mint(3, { value: ethers.utils.parseEther("1") });
    const tokenIds = await nftContract.tokensOfOwner(addr1.address);
    expect(tokenIds).to.deep.equal(
      [
        ethers.BigNumber.from("1"),
        ethers.BigNumber.from("2"),
        ethers.BigNumber.from("3"),
      ]
    );
  });

  it("あるアカウントの所持tokenIdが飛び飛びになっていてもtokensOfOwnerでtokenIdのリストがとれること", async function () {
    const { nftContract, addr1, addr2 } = await loadFixture(deployTokenFixture);
    // addr1の所持tokenIdが飛び飛びになるようmint
    await nftContract.connect(addr1).mint(1, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr2).mint(2, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr1).mint(1, { value: ethers.utils.parseEther("1") });
    expect(await nftContract.tokensOfOwner(addr1.address)).to.deep.equal(
      [
        ethers.BigNumber.from("1"),
        ethers.BigNumber.from("4"),
      ]
    );
  });

  it("ownerは0ethでmintできること", async function () {
    const { nftContract, owner } = await loadFixture(deployTokenFixture);
    await nftContract.connect(owner).mint(1, { value: ethers.utils.parseEther("0") });
    const tokenIds = await nftContract.tokensOfOwner(owner.address);
    expect(tokenIds).to.deep.equal(
      [ ethers.BigNumber.from("1") ]
    );
  });

  it("Maxの供給量をpublic関数でセットできること", async function () {
    const { nftContract } = await loadFixture(deployTokenFixture);
    await nftContract.setMaxSupply(100);
    expect(await nftContract.maxSupply()).to.equal(
      ethers.BigNumber.from("100")
    );
  });

  it("Maxの供給量のset関数がowner以外だとエラーになること", async function () {
    const { nftContract, addr1 } = await loadFixture(deployTokenFixture);
    await expect(nftContract.connect(addr1).setMaxSupply(100)).to.be.revertedWith(
      'Ownable: caller is not the owner'
    )
  });

  it("revealedがtrueの時、mintしたらリビール前の情報が取得できること", async function () {
    const { nftContract, addr1 } = await loadFixture(deployTokenFixture);
    await nftContract.setRevealed(true)
    await nftContract.connect(addr1).mint(1, { value: ethers.utils.parseEther("1") });
    const tokenURI = await nftContract.tokenURI(1)
    expect(tokenURI).to.equal('ipfs://CID/1.json')
  });

  it("revealedがfalseの時、mintしたらリビール前の情報が取得できること", async function () {
    const { nftContract, addr1 } = await loadFixture(deployTokenFixture);
    await nftContract.setRevealed(false)
    await nftContract.connect(addr1).mint(1, { value: ethers.utils.parseEther("1") });
    const tokenURI = await nftContract.tokenURI(1)
    expect(tokenURI).to.equal('ipfs://notRevealedUri')
  });

  it("WL所持済みのアドレスがwlMintできること", async function () {
    const { nftContract, addr1, addr2 } = await loadFixture(deployTokenFixture);
    // WL saleにしておく
    await nftContract.setPhase(1);
    const leaves = [addr1.address, addr2.address].map((x) =>
      keccak256(x)
    )
    // WL登録
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    rootTree = tree.getRoot()
    await nftContract.setMerkleRoot(rootTree)

    await nftContract.connect(addr1).wlMint(
      1,
      /**
       * そのアドレスのproofはMerkleTreeを持った外部に問い合わせてもいいし、
       * フロント側で持っててMerkleTreeを生成して、getHexProofでやるのでも良いだろう
       */
      tree.getHexProof(keccak256(addr1.address)),
      { value: ethers.utils.parseEther("1") }
    );
    const tokenIds = await nftContract.tokensOfOwner(addr1.address);
    expect(tokenIds).to.deep.equal(
      [ ethers.BigNumber.from("1") ]
    );
  });

  it("WL未所持のアドレスがwlMintできないこと", async function () {
    const { nftContract, addr1, addr2, addr3 } = await loadFixture(deployTokenFixture);
    // WL saleにしておく
    await nftContract.setPhase(1);
    const leaves = [addr1.address, addr2.address].map((x) =>
      keccak256(x)
    )
    // WL登録
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    rootTree = tree.getRoot()
    await nftContract.setMerkleRoot(rootTree)

    await expect(
      nftContract.connect(addr3).wlMint(
        1,
        tree.getHexProof(keccak256(addr3.address)),
        { value: ethers.utils.parseEther("1") }
      )
    ).to.be.revertedWith("You don't have a whitelist!")
  });

  it("PublicSaleでない場合mint関数がエラーとなること", async function () {
    const { nftContract, addr1 } = await loadFixture(deployTokenFixture);
    // sale前にしておく
    await nftContract.setPhase(0);
    await expect(
      nftContract.connect(addr1).mint(3, { value: ethers.utils.parseEther("1") })
    ).to.revertedWith('Public mint is not active.');
  })

  it("WLSaleでない場合wlMint関数がエラーとなること", async function () {
    const { nftContract, addr1, addr2 } = await loadFixture(deployTokenFixture);
    // sale前にしておく
    await nftContract.setPhase(0);
    const leaves = [addr1.address, addr2.address].map((x) =>
      keccak256(x)
    )
    // WL登録
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true })
    rootTree = tree.getRoot()
    await nftContract.setMerkleRoot(rootTree)

    await expect(nftContract.connect(addr1).wlMint(
      1,
      tree.getHexProof(keccak256(addr1.address)),
      { value: ethers.utils.parseEther("1") }
    )).to.revertedWith('WL mint is not active.');
  })
});

describe("バーニン系機能", function () {
  async function deployTokenFixture() {
    const HollandGene = await ethers.getContractFactory("HollandGene");
    const [owner, addr1, addr2, addr3] = await ethers.getSigners();

    const nftContract = await HollandGene.deploy(
      'HollandGene',
      'HG',
      'ipfs://CID/',
      'ipfs://notRevealedUri'
    );
    await nftContract.deployed();

    // public saleにしておく
    await nftContract.setPhase(2);
    // addr1, 2, 3それぞれ10個ずつNFTをもった状態にしておく
    await nftContract.connect(addr1).mint(3, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr1).mint(3, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr1).mint(3, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr1).mint(1, { value: ethers.utils.parseEther("1") });

    await nftContract.connect(addr2).mint(3, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr2).mint(3, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr2).mint(3, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr2).mint(1, { value: ethers.utils.parseEther("1") });

    await nftContract.connect(addr3).mint(3, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr3).mint(3, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr3).mint(3, { value: ethers.utils.parseEther("1") });
    await nftContract.connect(addr3).mint(1, { value: ethers.utils.parseEther("1") });

    // BurnAndMint saleにしておく
    await nftContract.setPhase(3);

    return { HollandGene, nftContract, owner, addr1, addr2, addr3 };
  }

  it("バーニンしたらバーンしたNFTが消え新しいNFTが追加されること", async function () {
    const { nftContract, addr1 } = await loadFixture(deployTokenFixture);
    await nftContract.connect(addr1).burnAndMint([1, 2], { value: ethers.utils.parseEther("1") });
    const tokenIds = await nftContract.tokensOfOwner(addr1.address);
    expect(tokenIds).to.deep.equal(
      [
        ethers.BigNumber.from("3"),
        ethers.BigNumber.from("4"),
        ethers.BigNumber.from("5"),
        ethers.BigNumber.from("6"),
        ethers.BigNumber.from("7"),
        ethers.BigNumber.from("8"),
        ethers.BigNumber.from("9"),
        ethers.BigNumber.from("10"),
        ethers.BigNumber.from("31"),
        ethers.BigNumber.from("32"),
      ]
    );
  });

  it("BurnAndMintでない場合burnAndMint関数がエラーとなること", async function () {
    const { nftContract, addr1 } = await loadFixture(deployTokenFixture);
    // sale前にしておく
    await nftContract.setPhase(0);
    await expect(
      nftContract.connect(addr1).burnAndMint([1, 2], { value: ethers.utils.parseEther("1") })
    ).to.revertedWith('BurnAndMint mint is not active.');
  })

  it("所有していないNFTをBurnしようとした場合にエラーとなること", async function () {
    const { nftContract, addr1 } = await loadFixture(deployTokenFixture);
    await expect(
      nftContract.connect(addr1).burnAndMint([11], { value: ethers.utils.parseEther("1") })
    ).to.revertedWith('tokenId 11 is not your NFT.');
  })

  it("バーニン限度数に達した場合バーニンできないこと", async function () {
    const { nftContract, addr1 } = await loadFixture(deployTokenFixture);
    await nftContract.connect(addr1).burnAndMint([1, 2, 3], { value: ethers.utils.parseEther("1") })
    await expect(
      nftContract.connect(addr1).burnAndMint([4, 5, 6], { value: ethers.utils.parseEther("1") })
    ).to.revertedWith('Over total burn count.');
  })
});
