//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface IERC721 {
    function transferFrom(
        address _from,
        address _to,
        uint256 _id
    ) external;
}

contract Escrow {
    address public nftContractAddress;
    address payable public sellerAddress;
    address public inspectorAddress;
    address public lenderAddress;

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public escrowAmount;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public saleApproved;

    constructor(
        address _nftAddress,
        address payable _seller,
        address _inspector,
        address _lender
    ) {
        nftContractAddress = _nftAddress;
        sellerAddress = _seller;
        inspectorAddress = _inspector;
        lenderAddress = _lender;
    }

    modifier onlySeller() {
        require(
            msg.sender == sellerAddress,
            "Only the seller can make this call"
        );
        _;
    }

    modifier onlyBuyer(uint256 _nftID) {
        require(
            msg.sender == buyer[_nftID],
            "only an approved buyer can call this function"
        );
        _;
    }

    modifier onlyInspector() {
        require(
            msg.sender == inspectorAddress,
            "Only the inspector can call this function"
        );
        _;
    }

    modifier participantsOnly(uint256 _nftID) {
        require(
            msg.sender == lenderAddress ||
                msg.sender == buyer[_nftID] ||
                msg.sender == sellerAddress,
            "This address is not authorized to call this function"
        );
        _;
    }

    function list(
        uint256 _nftID,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _escrowAmount
    ) public payable onlySeller {
        //* contract must first be approved to transfer NFTs

        IERC721(nftContractAddress).transferFrom(
            msg.sender,
            address(this),
            _nftID
        );

        isListed[_nftID] = true;
        buyer[_nftID] = _buyer;
        purchasePrice[_nftID] = _purchasePrice;
        escrowAmount[_nftID] = _escrowAmount;
        inspectionPassed[_nftID];
    }

    // allow contract to receive funds from lender
    function depositBalance(uint256 _nftID) public payable {
        require(
            msg.sender == lenderAddress || msg.sender == buyer[_nftID],
            "Only the lender or buyer can send funds to this contract"
        );
    }

    // buyer deposits downpayment to contract
    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) {
        require(
            msg.value >= escrowAmount[_nftID],
            "you have to deposit at least the minimum requirement"
        );
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function approveInspection(uint256 _nftID) public onlyInspector {
        inspectionPassed[_nftID] = true;
    }

    function approveSale(uint256 _nftID) public participantsOnly(_nftID) {
        saleApproved[_nftID][msg.sender] = true;
    }

    function finalizeSale(uint256 _nftID) public onlySeller {
        require(inspectionPassed[_nftID], "inspection must pass first");
        require(
            saleApproved[_nftID][lenderAddress],
            "lender must approve the sale"
        );
        //buyer[_nftID] is the buyer's address
        require(
            saleApproved[_nftID][buyer[_nftID]],
            "buyer must approve the sale"
        );
        require(
            saleApproved[_nftID][sellerAddress],
            "seller must approve the sale"
        );
        // ensure contract has enough funds
        require(
            address(this).balance >= purchasePrice[_nftID],
            "not enough funds in contract"
        );

        // send purchase amount to seller from contract
        (bool success, ) = sellerAddress.call{value: purchasePrice[_nftID]}("");
        require(success, "sale failed; please check and try again");

        IERC721(nftContractAddress).transferFrom(
            address(this),
            buyer[_nftID],
            _nftID
        );
    }
}
