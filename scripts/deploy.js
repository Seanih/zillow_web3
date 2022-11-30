// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers } = require('hardhat');

async function main() {
	let [buyer, seller, lender, inspector] = await ethers.getSigners();

	// Deploy real estate NFT contract
	const reContract = await ethers.getContractFactory('RealEstate');
	const ReNftContract = await reContract.deploy();
	await ReNftContract.deployed();

	console.log(`Deployed real estate NFT contract to: ${ReNftContract.address}`);
	console.log('Minting 3 properties...');

	let mintNft;
	for (let i = 1; i < 3; i++) {
		mintNft = await ReNftContract.connect(seller).mint(
			`https://ipfs.io/ipfs/QmQVcpsjrA6cr1iJjZAodYwmPekYgbnXGo4DFubJiLc2EB/${i}.json`
		);

		await mintNft.wait();
	}

	// Deploy Escrow contract
	const escrow = await ethers.getContractFactory('Escrow');
	const EscrowContract = await escrow.deploy(
		ReNftContract.address,
		seller.address
	);
	await EscrowContract.deployed();

	// add lender and inspector to contract
	const addLender = await EscrowContract.connect(seller).addLender(
		lender.address
	);

  
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
