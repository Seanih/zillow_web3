// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require('hardhat');

const tokensInWei = num => ethers.utils.parseEther(num.toString());

async function main() {
	let [buyer, seller, lender, inspector] = await ethers.getSigners();

	// Deploy real estate NFT contract
	const reContract = await ethers.getContractFactory('RealEstate');
	const ReNftContract = await reContract.deploy();
	await ReNftContract.deployed();

	console.log(`Deployed real estate NFT contract to: ${ReNftContract.address}`);
	console.log('Minting 3 properties...');

	// mint real estate NFTs
	let mintNft;
	let numNftsMinted = 0;

	for (let i = 0; i < 3; i++) {
		mintNft = await ReNftContract.connect(seller).mint(
			`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${
				i + 1
			}.json`
		);

		await mintNft.wait();

		numNftsMinted++;
		console.log('minted NFT');
	}

	// Deploy Escrow contract
	const escrow = await ethers.getContractFactory('Escrow');
	const EscrowContract = await escrow.deploy(
		ReNftContract.address,
		seller.address
	);
	await EscrowContract.deployed();

	//! add buyer, lender and inspector to contract
	const addBuyer = await EscrowContract.connect(seller).addBuyer(buyer.address);

	const addLender = await EscrowContract.connect(buyer).addLender(
		lender.address
	);
	const addInspector = await EscrowContract.connect(buyer).addInspector(
		inspector.address
	);

	//* approve inspection and sale for each NFT minted
	for (let i = 1; i <= numNftsMinted; i++) {
		let approveNftTransfer = await ReNftContract.connect(seller).approve(
			EscrowContract.address,
			i
		);
		await approveNftTransfer.wait();

		let tx = await EscrowContract.connect(inspector).approveInspection(i);
		await tx.wait();

		tx = await EscrowContract.connect(lender).approveSale(i);
		await tx.wait();

		tx = await EscrowContract.connect(buyer).approveSale(i);
		await tx.wait();

		tx = await EscrowContract.connect(seller).approveSale(i);
		await tx.wait();
	}

	//* list properties under contract
	let listNFT = await EscrowContract.connect(seller).list(
		1,
		buyer.address,
		tokensInWei(10),
		tokensInWei(1)
	);
	await listNFT.wait();

	listNFT = await EscrowContract.connect(seller).list(
		2,
		buyer.address,
		tokensInWei(15),
		tokensInWei(3)
	);
	await listNFT.wait();

	listNFT = await EscrowContract.connect(seller).list(
		3,
		buyer.address,
		tokensInWei(9),
		tokensInWei(2.5)
	);
	await listNFT.wait();

	console.log('Finished');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
