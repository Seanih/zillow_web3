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
    address payable public lenderAddress; //*can be buyer address if self-financed

    mapping(uint256 => bool) public isListed;
    mapping(uint256 => uint256) public purchasePrice;
    mapping(uint256 => uint256) public earnestDeposit;
    mapping(uint256 => address) public buyer;
    mapping(uint256 => bool) public inspectionPassed;
    mapping(uint256 => mapping(address => bool)) public saleApproved;
    mapping(uint256 => mapping(address => uint256)) public balanceDeposits;
    mapping(uint256 => address) public cancelledSales;

    constructor(address _nftAddress, address payable _seller) {
        nftContractAddress = _nftAddress;
        sellerAddress = _seller;
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

    modifier onlyLender() {
        require(
            msg.sender == lenderAddress,
            "only the approved lender can call this function"
        );
        _;
    }

    modifier onlyInspector() {
        require(
            msg.sender == inspectorAddress,
            "Only an approved inspector can call this function"
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

    function addInspector(address _inspector) external onlySeller {
        inspectorAddress = _inspector;
    }

    function addLender(address payable _lender) external onlySeller {
        lenderAddress = _lender;
    }

    function list(
        uint256 _nftID,
        address _buyer,
        uint256 _purchasePrice,
        uint256 _earnestDeposit
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
        earnestDeposit[_nftID] = _earnestDeposit;
        inspectionPassed[_nftID];
    }

    // allow contract to receive funds from lender
    function depositBalance(uint256 _nftID) external payable onlyLender {
        require(
            msg.sender == lenderAddress,
            "Only a lender or buyer can send funds to this contract"
        );

        require(msg.value > 0, "must send more than '0'");

        balanceDeposits[_nftID][msg.sender] = msg.value;
    }

    // buyer deposits downpayment to contract
    function depositEarnest(uint256 _nftID) public payable onlyBuyer(_nftID) {
        require(
            msg.value >= earnestDeposit[_nftID],
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

    function cancelSale(uint256 _nftID) public {
        require(
            msg.sender == buyer[_nftID] || msg.sender == sellerAddress,
            "this address is not authorized to cancel the sale"
        );

        // sale cancelled BEFORE inspection or because of a failed inspection
        if (
            ((!inspectionPassed[_nftID]) && msg.sender == buyer[_nftID]) ||
            msg.sender == sellerAddress
        ) {
            //! return escrow to buyer
            (bool saleCancelled, ) = payable(buyer[_nftID]).call{
                value: earnestDeposit[_nftID]
            }("");
            require(saleCancelled, "The sale was unable to be cancelled");

            //! return balanceDeposit to lender
            (bool returnedBalance, ) = lenderAddress.call{
                value: balanceDeposits[_nftID][lenderAddress]
            }("");
            require(returnedBalance);

            //! contract returns NFT to owner
            IERC721(nftContractAddress).transferFrom(
                address(this),
                sellerAddress,
                _nftID
            );

            cancelledSales[_nftID] = msg.sender;
        } else if (inspectionPassed[_nftID] && msg.sender == buyer[_nftID]) {
            //! seller keeps earnest deposit
            (bool sentToSeller, ) = sellerAddress.call{
                value: earnestDeposit[_nftID]
            }("");
            require(sentToSeller, "unable to send funds to seller");

            //! return balance deposit(s)
            (bool returnedBalance, ) = lenderAddress.call{
                value: balanceDeposits[_nftID][lenderAddress]
            }("");
            require(returnedBalance, "unable to send funds to lender");

            //! contract returns NFT to owner
            IERC721(nftContractAddress).transferFrom(
                address(this),
                sellerAddress,
                _nftID
            );

            cancelledSales[_nftID] = msg.sender;
        } else if (inspectionPassed[_nftID] && msg.sender == sellerAddress) {
            //! return escrow to buyer
            (bool saleCancelled, ) = payable(buyer[_nftID]).call{
                value: purchasePrice[_nftID]
            }("");
            require(saleCancelled, "The sale was unable to be cancelled");

            //! return balance deposit(s)
            (bool returnedBalance, ) = lenderAddress.call{
                value: balanceDeposits[_nftID][lenderAddress]
            }("");
            require(returnedBalance);

            //! contract returns NFT to owner
            IERC721(nftContractAddress).transferFrom(
                address(this),
                sellerAddress,
                _nftID
            );

            cancelledSales[_nftID] = msg.sender;
        }
    }

    function finalizeSale(uint256 _nftID) public onlySeller {
        //! series of checks to ensure all parties approved the sale and the inspection passed
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
        (bool paidSeller, ) = sellerAddress.call{value: purchasePrice[_nftID]}(
            ""
        );
        require(
            paidSeller,
            "sale failed; please ensure all requirements were met and try again"
        );

        isListed[_nftID] = false;

        IERC721(nftContractAddress).transferFrom(
            address(this),
            buyer[_nftID],
            _nftID
        );
    }
}
