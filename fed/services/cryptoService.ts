import { VaultData, EncryptedStorage } from '../types';

// Utils to convert between Buffers and Base64 strings
const bufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToBuffer = (base64: string): ArrayBuffer => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

// 1. Generate a Key from the Password (PBKDF2)
const getKeyMaterial = (password: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  return window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
};

const deriveKey = (keyMaterial: CryptoKey, salt: ArrayBuffer): Promise<CryptoKey> => {
  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// 2. Encrypt Data
export const encryptVault = async (data: VaultData, password: string): Promise<EncryptedStorage> => {
  try {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await getKeyMaterial(password);
    const key = await deriveKey(keyMaterial, salt);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedData = new TextEncoder().encode(JSON.stringify(data));

    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      encodedData
    );

    return {
      salt: bufferToBase64(salt.buffer),
      iv: bufferToBase64(iv.buffer),
      data: bufferToBase64(encryptedContent)
    };
  } catch (e) {
    console.error("Encryption failed", e);
    throw new Error("Failed to encrypt vault.");
  }
};

// 3. Decrypt Data
export const decryptVault = async (encryptedStore: EncryptedStorage, password: string): Promise<VaultData> => {
  try {
    const salt = base64ToBuffer(encryptedStore.salt);
    const iv = base64ToBuffer(encryptedStore.iv);
    const encryptedData = base64ToBuffer(encryptedStore.data);

    const keyMaterial = await getKeyMaterial(password);
    const key = await deriveKey(keyMaterial, salt);

    const decryptedContent = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(iv)
      },
      key,
      encryptedData
    );

    const decodedString = new TextDecoder().decode(decryptedContent);
    return JSON.parse(decodedString);
  } catch (e) {
    console.error("Decryption failed", e);
    throw new Error("Invalid password or corrupted data.");
  }
};