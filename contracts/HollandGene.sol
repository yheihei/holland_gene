// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

/// @title: Holland Lop Generative
/// @author: @yhei_hei
/// @dev: This contract using HollandGene (https://github.com/yheihei/holland_gene)

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "erc721a/contracts/extensions/ERC721AQueryable.sol";
import "hardhat/console.sol";

contract HollandGene is ERC721AQueryable, Ownable {
  using Strings for uint256;

  string baseURI;
  string public baseExtension = ".json";
  uint256 public cost = 0.0005 ether;
  uint256 public maxSupply = 30;
  uint256 public maxBurnMintSupply = 5;
  uint256 public maxMintAmount = 3;
  uint256 public maxBurnMintAmount = 3;
  uint256 public burnMintCost = 0.0005 ether;
  bool public paused = false;
  bool public revealed = false;
  string public notRevealedUri;
  bytes32 public merkleRoot;

  enum Phase {
    BeforeMint,
    WLSale,
    PublicMint,
    BurnAndMint
  }
  Phase public phase = Phase.BeforeMint;

  constructor(
    string memory _name,
    string memory _symbol,
    string memory _initBaseURI,
    string memory _initNotRevealedUri
  ) ERC721A(_name, _symbol) {
    setBaseURI(_initBaseURI);
    setNotRevealedURI(_initNotRevealedUri);
  }

  // internal
  function _baseURI() internal view virtual override returns (string memory) {
    return baseURI;
  }

  function _startTokenId() internal view virtual override returns (uint256) {
    return 1;
  }

  function mint(uint256 _mintAmount) public payable {
    require(phase == Phase.PublicMint, 'Public mint is not active.');
    _mintValidate(msg.sender, _mintAmount, msg.value);
    _safeMint(msg.sender, _mintAmount);
  }

  function wlMint(uint256 _mintAmount, bytes32[] calldata _merkleProof)
    public
    payable
  {
    require(phase == Phase.WLSale, 'WL mint is not active.');
    _wlMintValidate(msg.sender, _mintAmount, _merkleProof, msg.value);
    _safeMint(msg.sender, _mintAmount);
  }

  function burnAndMint(uint256[] calldata _burnTokenIds)
    external
    payable
  {
    require(phase == Phase.BurnAndMint, 'BurnAndMint mint is not active.');
    _validateAndBurn(msg.sender, _burnTokenIds, msg.value);
    _safeMint(msg.sender, _burnTokenIds.length);
  }

  function _mintValidate(address _address, uint256 _mintAmount, uint256 _ethValue)
    private
    view
  {
    require(!paused);
    require(_mintAmount > 0);
    require(_mintAmount <= maxMintAmount);
    require(totalSupply() + _mintAmount <= maxSupply);
    if (_address != owner()) {
      require(_ethValue >= cost * _mintAmount, "eth is not enough!!");
    }
  }

  function _wlMintValidate(address _address, uint256 _mintAmount,  bytes32[] calldata _merkleProof, uint256 _ethValue)
    private
    view
  {
    _mintValidate(_address, _mintAmount, _ethValue);
    require(
      isWhiteListed(_address, _merkleProof),
      "You don't have a whitelist!"
    );
  }

  function _burnAndMintValidate(uint256[] calldata _burnTokenIds, uint256 _ethValue)
    private
    view
  {
    require(!paused);
    require(
      _burnTokenIds.length > 0,
      'Burn tokenIds count shoud be exceed 1.'
    );
    require(
      _totalBurned() + _burnTokenIds.length <= maxBurnMintSupply,
      'Over total burn count.'
    );
    require(
      _burnTokenIds.length <= maxBurnMintAmount,
      string(abi.encodePacked('Cannot above ', maxBurnMintAmount.toString(), ' burn per 1 mint.'))
    );
    require(
      _ethValue >= _burnTokenIds.length * burnMintCost,
      'eth is not enough!!'
    );
  }

  function _validateAndBurn(address _address, uint256[] calldata _burnTokenIds, uint256 _ethValue)
    private
  {
    _burnAndMintValidate(_burnTokenIds, _ethValue);
    for (uint256 i = 0; i < _burnTokenIds.length; i++) {
      uint256 tokenId = _burnTokenIds[i];
      require(
        _address == ownerOf(tokenId),
        string(abi.encodePacked('tokenId ', tokenId.toString(), ' is not your NFT.'))
      );
      _burn(tokenId);
    }
  }

  function isWhiteListed(address _address, bytes32[] calldata _merkleProof)
    public
    view
    returns (bool)
  {
    bytes32 leaf = keccak256(abi.encodePacked(_address));
    return MerkleProof.verify(_merkleProof, merkleRoot, leaf);
  }

  function reveal() public onlyOwner {
      revealed = true;
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    if (!_exists(tokenId)) revert URIQueryForNonexistentToken();

    if (!revealed) {
      return notRevealedUri;
    }

    string memory metadataPointerId = !revealed ? 'unrevealed' : _toString(tokenId);
    string memory result = string(abi.encodePacked(_baseURI(), metadataPointerId, '.json'));

    return bytes(_baseURI()).length != 0 ? result : '';
  }
  
  function setCost(uint256 _newCost) public onlyOwner {
    cost = _newCost;
  }

  function setmaxMintAmount(uint256 _newmaxMintAmount) public onlyOwner {
    maxMintAmount = _newmaxMintAmount;
  }

  function setMaxSupply(uint256 _maxSupply) public onlyOwner {
    maxSupply = _maxSupply;
  }
  
  function setNotRevealedURI(string memory _notRevealedURI) public onlyOwner {
    notRevealedUri = _notRevealedURI;
  }

  function setBaseURI(string memory _newBaseURI) public onlyOwner {
    baseURI = _newBaseURI;
  }

  function setBaseExtension(string memory _newBaseExtension) public onlyOwner {
    baseExtension = _newBaseExtension;
  }

  function setRevealed(bool _state) public onlyOwner {
    revealed = _state;
  }

  function pause(bool _state) public onlyOwner {
    paused = _state;
  }

  function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
    merkleRoot = _merkleRoot;
  }

  function setPhase(Phase _newPhase) public onlyOwner {
    phase = _newPhase;
  }

  function setMaxBurnMintSupply(uint256 _value) public onlyOwner {
    maxBurnMintSupply = _value;
  }

  function setMaxBurnMintAmount(uint256 _value) public onlyOwner {
    maxBurnMintAmount = _value;
  }

  function setBurnMintCost(uint256 _value) public onlyOwner {
    burnMintCost = _value;
  }
 
  function withdraw() public payable onlyOwner {    
    // This will payout the owner 95% of the contract balance.
    // Do not remove this otherwise you will not be able to withdraw the funds.
    // =============================================================================
    (bool os, ) = payable(owner()).call{value: address(this).balance}("");
    require(os);
    // =============================================================================
  }
}
