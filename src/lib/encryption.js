/**
 * Zero-Trust Client-Side End-to-End Encryption (E2EE) Module
 * Uses native Web Crypto API (AES-GCM-256) with PBKDF2 key derivation.
 */

export async function encryptText(plainText, passphrase) {
  if (!passphrase || !plainText) return plainText;
  // If it's already encrypted, do not re-encrypt
  if (plainText.startsWith("CSENC:")) return plainText;
  
  try {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      enc.encode(plainText)
    );
    
    // Combine salt, iv, and ciphertext into a single binary buffer
    const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
    
    // Convert binary to Base64
    const base64 = btoa(String.fromCharCode.apply(null, combined));
    return "CSENC:" + base64;
  } catch (e) {
    console.error("[E2EE] Client-side encryption failed:", e);
    return plainText;
  }
}

export async function decryptText(encryptedText, passphrase) {
  if (!passphrase || !encryptedText || !encryptedText.startsWith("CSENC:")) return encryptedText;
  
  try {
    // Decode Base64 string
    const binaryString = atob(encryptedText.substring(6));
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const ciphertext = combined.slice(28);
    
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    
    const key = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext
    );
    
    return dec.decode(decrypted);
  } catch (e) {
    console.warn("[E2EE] Client-side decryption failed. Possibly wrong passphrase.", e);
    return "🔑 [Encrypted Record - Provide Passphrase to Decrypt]";
  }
}
