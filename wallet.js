import { OdinConnect } from 'odin-connect';
import { state, updateBalanceDisplay } from './game.js';

const odinConnect = new OdinConnect({ name: 'Plinko', env: 'dev' });

export let connectedUser = null;
let cachedBalances = [];

function truncatePrincipal(principal) {
  if (!principal || principal.length <= 12) return principal;
  return principal.slice(0, 5) + '...' + principal.slice(-5);
}

function populateTokenSelect(balances) {
  const select = document.getElementById('token-select');
  select.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = 'Select a token';
  select.appendChild(placeholder);

  balances.forEach(token => {
    const opt = document.createElement('option');
    opt.value = token.id;
    opt.textContent = `${token.id} ${token.ticker} `;
    select.appendChild(opt);
  });

  select.disabled = false;
}

function clearTokenSelect() {
  const select = document.getElementById('token-select');
  select.innerHTML = '<option value="" disabled selected>Connect wallet first</option>';
  select.disabled = true;
}

function applyTokenBalance(token) {
  if (!token) {
    state.balance = 0;
  } else {
    const decimals = token.decimals ?? 0;
    const divisibility = token.divisibility ?? 8;
    const divisor = Math.pow(10, divisibility + decimals);
    const computed = Number(token.balance) / divisor;
    state.balance = computed;
  }
  updateBalanceDisplay();
}

function onTokenSelected(e) {
  const tokenId = e.target.value;
  console.log('Token selected:', tokenId, 'cached:', cachedBalances.map(b => b.id));
  const token = cachedBalances.find(b => String(b.id) === String(tokenId));
  console.log('Found token:', token);
  applyTokenBalance(token || null);
}

async function fetchAndPopulateTokens() {
  if (!connectedUser) return;
  try {
    const balances = await connectedUser.getBalances({ page: 1, limit: 20 });
    cachedBalances = Array.isArray(balances) ? balances : [];
    console.log('Fetched balances:', cachedBalances);
    populateTokenSelect(cachedBalances);
  } catch (err) {
    console.error('Failed to fetch token balances:', err);
    cachedBalances = [];
    populateTokenSelect([]);
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

export async function connectWallet() {
  try {
    const user = await odinConnect.connect({
      requires_api: false,
      requires_delegation: false,
      open: {
        target: '_blank',
      }
    });
    connectedUser = user;
    updateWalletUI();
    await fetchAndPopulateTokens();
  } catch (err) {
    console.error('Wallet connection failed:', err);
  }
}

function disconnectWallet() {
  connectedUser = null;
  cachedBalances = [];
  state.balance = 0;
  updateBalanceDisplay();
  clearTokenSelect();
  updateWalletUI();
}

export function setupWalletEvents() {
  document.getElementById('btn-connect').addEventListener('click', connectWallet);
  document.getElementById('btn-disconnect').addEventListener('click', disconnectWallet);
  document.getElementById('token-select').addEventListener('change', onTokenSelected);
}
