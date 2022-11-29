const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicFoundation/hardhat-network-helpers');
const { expect } = require('chai');

const tokensInWei = num => ethers.utils.parseUnits(num.toString(), 'ether');

describe('Escrow', () => {
	async function deployContractFixture() {
		let [buyer, seller, inspector, lender] = await ethers.getSigners();
		// Deploy contracts
		const reContract = await ethers.getContractFactory('RealEstate');
		const reNftContract = await reContract.deploy();
		await reNftContract.deployed(1);

		const escrow = await ethers.getContractFactory('Escrow');
		const EscrowContract = await escrow.deploy(
			reNftContract.address,
			seller.address,
			inspector.address,
			lender.address
		);
		await EscrowContract.deployed();

		// mint 1st NFT
		let tx = await reNftContract
			.connect(seller)
			.mint(
				'https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/1.png'
			);
		await tx.wait();

		let escNftAdd = await EscrowContract.nftContractAddress();

		// approve NFT to be transferred
		let approveTx = await reNftContract
			.connect(seller)
			.approve(EscrowContract.address, 1);
		await approveTx.wait();

		return {
			buyer,
			seller,
			inspector,
			lender,
			reNftContract,
			EscrowContract,
			escNftAdd,
		};
	}

	async function deployWithListingFixture() {
		let [buyer, seller, inspector, lender] = await ethers.getSigners();
		// Deploy contracts
		const reContract = await ethers.getContractFactory('RealEstate');
		const reNftContract = await reContract.deploy();
		await reNftContract.deployed(1);

		const escrow = await ethers.getContractFactory('Escrow');
		const EscrowContract = await escrow.deploy(
			reNftContract.address,
			seller.address,
			inspector.address,
			lender.address
		);
		await EscrowContract.deployed();

		// mint 1st NFT
		let tx = await reNftContract
			.connect(seller)
			.mint(
				'https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/1.png'
			);
		await tx.wait();

		let escNftAdd = await EscrowContract.nftContractAddress();

		// approve NFT to be transferred
		let approveTx = await reNftContract
			.connect(seller)
			.approve(EscrowContract.address, 1);
		await approveTx.wait();

		// list reNFT
		let listNFT = await EscrowContract.connect(seller).list(
			1,
			buyer.address,
			tokensInWei(10),
			tokensInWei(5)
		);
		await listNFT.wait();

		return {
			buyer,
			seller,
			inspector,
			lender,
			reNftContract,
			EscrowContract,
			escNftAdd,
		};
	}

	async function deployWithApprovalsFixture() {
		let [buyer, seller, inspector, lender] = await ethers.getSigners();
		// Deploy contracts
		const reContract = await ethers.getContractFactory('RealEstate');
		const reNftContract = await reContract.deploy();
		await reNftContract.deployed(1);

		const escrow = await ethers.getContractFactory('Escrow');
		const EscrowContract = await escrow.deploy(
			reNftContract.address,
			seller.address,
			inspector.address,
			lender.address
		);
		await EscrowContract.deployed();

		// mint 1st NFT
		let tx = await reNftContract
			.connect(seller)
			.mint(
				'https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/1.png'
			);
		await tx.wait();

		let escNftAdd = await EscrowContract.nftContractAddress();

		// approve NFT to be transferred
		let approveTx = await reNftContract
			.connect(seller)
			.approve(EscrowContract.address, 1);
		await approveTx.wait();

		// list reNFT
		let listNFT = await EscrowContract.connect(seller).list(
			1,
			buyer.address,
			tokensInWei(10),
			tokensInWei(5)
		);
		await listNFT.wait();

		tx = await EscrowContract.connect(lender).approveSale(1);
		await tx.wait();

		tx = await EscrowContract.connect(buyer).approveSale(1);
		await tx.wait();

		tx = await EscrowContract.connect(seller).approveSale(1);
		await tx.wait();

		return {
			buyer,
			seller,
			inspector,
			lender,
			reNftContract,
			EscrowContract,
			escNftAdd,
		};
	}

	describe('Deployment', () => {
		it('returns NFT address', async () => {
			const { reNftContract, escNftAdd } = await loadFixture(
				deployContractFixture
			);

			expect(escNftAdd).to.equal(reNftContract.address);
		});

		it('returns seller address', async () => {
			const { seller, EscrowContract } = await loadFixture(
				deployContractFixture
			);

			expect(await EscrowContract.sellerAddress()).to.equal(seller.address);
		});

		it('returns inspector address', async () => {
			const { inspector, EscrowContract } = await loadFixture(
				deployContractFixture
			);

			expect(await EscrowContract.inspectorAddress()).to.equal(
				inspector.address
			);
		});

		it('returns lender address', async () => {
			const { lender, EscrowContract } = await loadFixture(
				deployContractFixture
			);

			expect(await EscrowContract.lenderAddress()).to.equal(lender.address);
		});

		it('mints NFT', async () => {
			const { seller, reNftContract } = await loadFixture(
				deployContractFixture
			);

			expect(await reNftContract.ownerOf(1)).to.equal(seller.address);
		});
	});

	describe('Listing', async () => {
		it('updates isListed mapping', async () => {
			const { EscrowContract } = await loadFixture(deployWithListingFixture);

			expect(await EscrowContract.isListed(1)).to.equal(true);
		});

		it('updates ownership', async () => {
			const { EscrowContract, reNftContract } = await loadFixture(
				deployWithListingFixture
			);

			expect(await reNftContract.ownerOf(1)).to.equal(EscrowContract.address);
		});

		it('returns buyer', async () => {
			const { EscrowContract, buyer } = await loadFixture(
				deployWithListingFixture
			);

			const result = await EscrowContract.buyer(1);
			expect(result).to.equal(buyer.address);
		});

		it('returns purchase price', async () => {
			const { EscrowContract } = await loadFixture(deployWithListingFixture);

			const result = await EscrowContract.purchasePrice(1);
			expect(result).to.equal(tokensInWei(10));
		});

		it('returns amount', async () => {
			const { EscrowContract, buyer } = await loadFixture(
				deployWithListingFixture
			);

			const result = await EscrowContract.escrowAmount(1);
			expect(result).to.equal(tokensInWei(5));
		});

		it('only allows seller to list NFT', async () => {
			const { buyer, seller, EscrowContract, reNftContract } =
				await loadFixture(deployWithListingFixture);

			// mint 2nd NFT
			let tx2 = await reNftContract
				.connect(seller)
				.mint(
					'https://ipfs.io/ipfs/QmQUozrHLAusXDxrvsESJ3PYB3rUeUuBAvVWw6nop2uu7c/1.png'
				);
			await tx2.wait();

			// approve NFT to be transferred
			let approveTx2 = await reNftContract
				.connect(seller)
				.approve(EscrowContract.address, 2);
			await approveTx2.wait();

			// try to list reNFT
			await expect(
				EscrowContract.connect(buyer).list(
					2,
					buyer.address,
					tokensInWei(8),
					tokensInWei(4)
				)
			).reverted;
		});
	});

	describe('Deposits', () => {
		it('updates contract balance', async () => {
			const { EscrowContract, buyer } = await loadFixture(
				deployWithListingFixture
			);

			let deposit = await EscrowContract.connect(buyer).depositEarnest(1, {
				value: tokensInWei(5),
			});
			await deposit.wait();

			expect(await EscrowContract.getBalance()).to.equal(tokensInWei(5));
		});
	});

	describe('Inspection', () => {
		it('updates inspection status', async () => {
			const { EscrowContract, inspector } = await loadFixture(
				deployWithListingFixture
			);

			let approveInspection = await EscrowContract.connect(
				inspector
			).approveInspection(1);
			await approveInspection.wait();

			expect(await EscrowContract.inspectionPassed(1)).to.equal(true);
		});
	});

	describe('Sale Process', () => {
		it('approves the sale', async () => {
			const { EscrowContract, lender, buyer, seller } = await loadFixture(
				deployWithApprovalsFixture
			);

			expect(await EscrowContract.saleApproved(1, lender.address)).to.equal(
				true
			);
			expect(await EscrowContract.saleApproved(1, buyer.address)).to.equal(
				true
			);
			expect(await EscrowContract.saleApproved(1, seller.address)).to.equal(
				true
			);
		});

		it('finalizes sale', async () => {
			const { EscrowContract, lender, inspector, seller, buyer } =
				await loadFixture(deployWithApprovalsFixture);

			let deposit = await EscrowContract.connect(buyer).depositEarnest(1, {
				value: tokensInWei(5),
			});
			await deposit.wait();

			let tx = await EscrowContract.connect(inspector).approveInspection(1);
			await tx.wait();

			tx = await EscrowContract.connect(lender).depositBalance(1, {
				value: tokensInWei(5),
			});
			await tx.wait();

			//----------- tests
			await expect(
				EscrowContract.connect(seller).finalizeSale(1)
			).to.changeEtherBalances(
				[EscrowContract.address, seller.address],
				[tokensInWei(-10), tokensInWei(10)]
			);
		});

		it('transfers NFT from contract to buyer', async () => {
			const { EscrowContract, reNftContract, lender, inspector, buyer, seller } =
				await loadFixture(deployWithApprovalsFixture);

			let deposit = await EscrowContract.connect(buyer).depositEarnest(1, {
				value: tokensInWei(5),
			});
			await deposit.wait();

			let tx = await EscrowContract.connect(inspector).approveInspection(1);
			await tx.wait();

			tx = await EscrowContract.connect(lender).depositBalance(1, {
				value: tokensInWei(5),
			});
			await tx.wait();

			await expect(
				EscrowContract.connect(seller).finalizeSale(1)
			).to.changeEtherBalances(
				[EscrowContract.address, seller.address],
				[tokensInWei(-10), tokensInWei(10)]
			);

			expect(await reNftContract.ownerOf(1)).to.equal(buyer.address);
		});
	});
});
