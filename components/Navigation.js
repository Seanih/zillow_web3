import logo from '../public/logo.svg';
import { ethers } from 'ethers';
import Link from 'next/link';
import Image from 'next/image';

const Navigation = ({ account, setAccount }) => {
	const connectHandler = async () => {
		const provider = new ethers.providers.Web3Provider(window.ethereum, 'any');

		const accounts = await window.ethereum.request({
			method: 'eth_requestAccounts',
		});

		const loggedInAs = ethers.utils.getAddress(accounts[0]);

		setAccount(loggedInAs);
	};
	return (
		<nav>
			<ul className='nav__links'>
				<li>
					<Link href='#'>Buy</Link>
				</li>
				<li>
					<Link href='#'>Rent</Link>
				</li>
				<li>
					<Link href='#'>Sell</Link>
				</li>
			</ul>

			<div className='nav__brand'>
				<Image src={logo} alt='logo' priority />
				<h1>Millow</h1>
			</div>

			{account ? (
				<button type='button' className='nav__connect'>{`${account.slice(
					0,
					6
				)}...${account.slice(38)}`}</button>
			) : (
				<button type='button' className='nav__connect' onClick={connectHandler}>
					Connect
				</button>
			)}
		</nav>
	);
};

export default Navigation;
