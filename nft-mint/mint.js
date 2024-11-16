const { exec } = require('child_process');
const axios = require('axios');
const crypto = require('crypto');

// Function to execute a PowerShell command
function runPowerShellCommand(command) {
    return new Promise((resolve, reject) => {
        exec(`powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "${command}"`, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                reject(`Stderr: ${stderr}`);
                return;
            }
            resolve(stdout);
        });
    });
}

// Function to fetch data from a URL and compute its SHA-256 hash
async function fetchAndHash(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const data = response.data;
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        console.log(`Hash for ${url}: ${hashHex}`);
        return hashHex;
    } catch (error) {
        if (error.response) {
            console.error(`Error fetching data from ${url}:`, error.response.status, error.response.statusText);
        } else if (error.request) {
            console.error(`No response received from ${url}:`, error.request);
        } else {
            console.error(`Error setting up request to ${url}:`, error.message);
        }
        return null;
    }
}

// Function to mint an NFT using a CLI command in PowerShell
async function mintNFT(walletIndex, royaltyAddress, nftAddress, nftImageUrl, nftJsonUrl, royaltyPercent, walletFingerprint, nftHash, metadataHash, fee, nftId) {
    // Construct the CLI command for minting the NFT
    const command = `chia wallet nft mint -i ${walletIndex} -ra ${royaltyAddress} -ta ${nftAddress} -u ${nftImageUrl} -nh ${nftHash} -rp ${royaltyPercent} -f ${walletFingerprint} -mh ${metadataHash} -mu ${nftJsonUrl} -lu https://raw.githubusercontent.com/Chia-Network/chia-blockchain/main/LICENSE -lh 42c1ece77fd67bf25338c1ff1a9ae0239fb3302f4a0bb0fe570b3a662e1e7cf3 -m ${fee}`;

    try {
        // Execute the CLI command to mint the NFT
        const output = await runPowerShellCommand(command);
        console.log(`Minting NFT ${nftId}`);
        console.log('Output:', output);
        console.log(`NFT ${nftId} minted successfully`);
    } catch (error) {
        console.error('Error minting NFT:', error);
    }
}

// Sample data for wallet and NFT parameters
const walletIndex = 1;  // Wallet index
const royaltyAddress = 'royaltyaddress';  // Royalty address
const nftAddress = 'nftaddress';  // NFT address
const royaltyPercent = 500;  // Royalty percent (5%)
const walletFingerprint = '12345678';  // Wallet fingerprint
const fee = "0.00000001";  // Fee for minting NFTs in mojo

// Define the loop interval (in milliseconds)
const interval = 120000;  // Interval between each NFT minting (2 minutes)

// Setup PowerShell environment and start the minting loop
async function setupEnvironmentAndStartLoop() {
    try {
        // Navigate to Chia Blockchain directory and activate the virtual environment
        await runPowerShellCommand('cd chia-blockchain');
        await runPowerShellCommand('.\\venv\\Scripts\\Activate.ps1');
        console.log('PowerShell session is ready.');

        // Define the starting and maximum NFT ID
        let nftId = 1;  // Starting NFT ID
        const maxNftId = 10;  // Maximum NFT ID

        // Start the minting loop
        const intervalId = setInterval(async () => {
            // Define NFT image and JSON URLs based on the NFT ID
            const nftImageUrl = `imageurl/${nftId}.png`;
            const nftJsonUrl = `metadataurl/${nftId}.json`;

            // Compute the SHA-256 hash of the NFT image and JSON data
            const nftImageHash = await fetchAndHash(nftImageUrl);
            const nftJsonHash = await fetchAndHash(nftJsonUrl);

            // Mint the NFT
            console.log(`Minting NFT ${nftId}...`);
            await mintNFT(walletIndex, royaltyAddress, nftAddress, nftImageUrl, nftJsonUrl, royaltyPercent, walletFingerprint, nftImageHash, nftJsonHash, fee, nftId);

            // Increment NFT ID for the next iteration, or stop the loop if max NFT ID is reached
            if (nftId === maxNftId) {
                clearInterval(intervalId);  // End the loop
            } else {
                nftId++;
            }
        }, interval);  // Mint every 'interval' milliseconds
    } catch (error) {
        console.error('Failed to setup environment and start loop:', error);
    }
}

// Call the setup function to start the minting loop
setupEnvironmentAndStartLoop();
