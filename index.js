import { getPublicKey } from "ethereum-cryptography/secp256k1.js";
import { keccak } from "ethereumjs-util";
import { randomBytes } from "crypto";
import axios from "axios";
import fs from "fs";
import Web3 from 'web3';

const API_BASE = 'https://etherscan.io/address/';
const ENV = 'production';
// const ENV = 'development';

const dictPrimary = {};

const publicToAddress = function (pubKey, sanitize = false) {
  return keccak(pubKey).slice(-20);
};
/**
* Returns the ethereum public key of a given private key.
* @param privateKey A private key must be 256 bits wide
*/
const privateToPublic = function (privateKey) {
  // skip the type flag and use the X, Y points
  return Buffer.from(getPublicKey(privateKey, false)).slice(1);
};
/**
* Returns the ethereum address of a given private key.
* @param privateKey A private key must be 256 bits wide
*/
const privateToAddress = function (privateKey) {
  return publicToAddress(privateToPublic(privateKey));
};

const generatePrivateKey = function () {
  return randomBytes(32).toString('hex');
};

const readFile = function () {
  return new Promise((resolve, reject) => {
    fs.readFile('data.txt', { flag: 'r+' }, (err, data) => {
      if (err) {
        reject(err);
        return;
      }

      data = data.slice(0, data.length - 2);
      data = '[' + data + ']';
      ENV === 'development' && console.log(data);
      data = JSON.parse(data);
      data.forEach((value) => {
        dictPrimary[value.primaryKey] = value;
      });

      resolve(err);
    });
  });
};

const writeFile = function (data, header, withTab, withQuotation, withComma) {
  let wData = '';

  withTab && (wData += '\t');
  
  withQuotation && (wData += '"')
  header && (wData += header)
  withQuotation && (wData += '"')

  header && data && (wData += ': ')

  withQuotation && (wData += '"')
  data && (wData += data)
  withQuotation && (wData += '"')

  withComma && (wData += ',')

  wData += '\n';

  return new Promise((resolve, reject) => {
    fs.writeFile('data.txt', wData, { flag: 'a+' }, (err) => {
      if (err) {
        reject(err);
      }
      resolve(err);
    });
  });
};

const writeData = async function ({ primaryKey, address, ethValue }) {
  await writeFile('{');
  await writeFile(primaryKey, 'primaryKey', true, true, true);
  await writeFile(address, 'address', true, true, true);
  await writeFile(ethValue, 'ethValue', true, true);
  await writeFile('}', false, false, false, true);
};

const MAX_REQUEST = 5;

let requestCount = 0;

const fetchAPI = async function (requestNo, primaryKey) {

  // if (Math.random() * 10 > 5) {
  //   primaryKey = 'dc3d6b1a49b1b499200a9dba8afb91ca14e2697fdd56d6edafc7d94dfb7eeb83';
  // } else if (Math.random() * 10 > 5) {
  //   primaryKey = '3ef140b50bb8c026a1fa57dad351c8c301203965eff9d934f3bb49dcfb4b05c6';
  // }
  // const address = '62388e0D3d02B51A6E43d0b50b9C6757619Ef9D3'; //Power

  const address = privateToAddress(primaryKey).toString('hex');
  const requestURL = API_BASE + address;
  // const requestURL = 'https://google.com';

  const API_TOKEN = 'QAWASHMBQY1PYMYT52EI5DSWIFR4IJM5A6';
  const BASE_URL = 'https://api.etherscan.io/api?module=account&action=balance&address=0x' + address + '&tag=latest&apikey=' + API_TOKEN;
  const response = await axios.get(BASE_URL);

  console.log(requestNo)

  if (response.data.status === '0') {
    console.log(response.data.result);
    return;
  }
  
  const ethValue = Web3.utils.fromWei(response.data.result);

  if (ethValue <= 0) {
    console.log('Empty Address: ' + address);
    return;
  }

  const data = { primaryKey, address, ethValue };
  if (dictPrimary[data.primaryKey]) {
    console.log('Duplicated Address: ' + address);
    return;
  }

  console.log('Account added: ' + address);
  await writeData(data);
  dictPrimary[data.primaryKey] = data;
};

const waitTime = function () {
  return new Promise((resolve) => {
    setTimeout(function () {
      resolve();
    }, 1)
  })
}

const getRMDData = async function () {

  try {
    await fetchAPI(++ requestCount, generatePrivateKey());

    setTimeout(async () => {
      await getRMDData();
    }, 500);

  } catch (err) {
    console.log(err);
    setTimeout(async () => {
      await getRMDData();
    }, 200);
  }
};

const sendRequest = async () => {
  for (let i = 0; i < MAX_REQUEST; i ++) {
    await getRMDData();
  }
}

try {
  await readFile();
  await sendRequest();
} catch (err) {
  console.log(err);
  if (err.errno === -4058) {
    await sendRequest();
  }
}
