import { OdinConnect } from 'odin-connect';
import { state, updateBalanceDisplay } from './game.js';

const TOKEN_ID = '2jjj';

const odinConnect = new OdinConnect({ name: 'Plinko', env: 'dev' });

let connectedUser = null;

function truncatePrincipal(principal) {
  if (!principal || principal.length <= 12) return principal;
  return principal.slice(0, 5) + '...' + principal.slice(-5);
}

async function fetchTokenBalance() {
  if (!connectedUser) return;
  try {
    const balances = await connectedUser.getBalances({ page: 1, limit: 100 });
    const token = balances.find(b => b.id === TOKEN_ID);
    console.log(connectedUser)
    if (token) {
      const decimals = token.decimals  || 3;
      const divisibility = token.divisibility|| 8;
      state.balance = Number(token.balance) / Math.pow(10, decimals + divisibility);
    } else {
      state.balance = 0;
    }
    updateBalanceDisplay();
  } catch (err) {
    console.error('Failed to fetch token balance:', err);
  }
}

function updateWalletUI() {
  const connectBtn = document.getElementById('btn-connect');
  const connectedDiv = document.getElementById('wallet-connected');
  const principalSpan = document.getElementById('wallet-principal');

  if (connectedUser) {
    connectBtn.style.display = 'none';
    connectedDiv.style.display = 'flex';
    principalSpan.textContent = truncatePrincipal(connectedUser.principal || 'Unknown');
  } else {
    connectBtn.style.display = 'block';
    connectedDiv.style.display = 'none';
    principalSpan.textContent = '';
  }
}

async function connectWallet() {
  try {
    const user = await odinConnect.connect({
      requires_api: true,
      requires_delegation: false,
    });
    connectedUser = user;
    updateWalletUI();
    await fetchTokenBalance();
  } catch (err) {
    console.error('Wallet connection failed:', err);
  }
}

function disconnectWallet() {
  connectedUser = null;
  state.balance = 0;
  updateBalanceDisplay();
  updateWalletUI();
}

export function setupWalletEvents() {
  document.getElementById('btn-connect').addEventListener('click', connectWallet);
  document.getElementById('btn-disconnect').addEventListener('click', disconnectWallet);
}
