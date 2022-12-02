/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	images: {
		dangerouslyAllowSVG: true,
		domains: ['ipfs.io'],
	},
};

module.exports = nextConfig;
