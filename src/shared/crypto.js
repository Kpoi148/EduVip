/**
 * Simple Encryption/Decryption Utilities
 * NOTE: This is basic obfuscation, not cryptographically secure.
 * For production, consider using Web Crypto API or a backend proxy.
 */

/**
 * Simple XOR-based encryption/decryption
 * Using a fixed key derived from extension ID
 */
const ENCRYPTION_KEY = 'EduVip-Extension-2024-Key';

/**
 * Encode string to Base64
 */
function toBase64(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode('0x' + p1);
    }));
}

/**
 * Decode Base64 to string
 */
function fromBase64(str) {
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
}

/**
 * XOR cipher
 */
function xorCipher(input, key) {
    let result = '';
    for (let i = 0; i < input.length; i++) {
        result += String.fromCharCode(
            input.charCodeAt(i) ^ key.charCodeAt(i % key.length)
        );
    }
    return result;
}

/**
 * Encrypt a string
 * @param {string} plaintext - Text to encrypt
 * @returns {string} Encrypted text (Base64 encoded)
 */
export function encrypt(plaintext) {
    if (!plaintext || typeof plaintext !== 'string') {
        return '';
    }

    try {
        const encrypted = xorCipher(plaintext, ENCRYPTION_KEY);
        return toBase64(encrypted);
    } catch (error) {
        console.error('Encryption failed:', error);
        return plaintext; // Fallback to plaintext
    }
}

/**
 * Decrypt a string
 * @param {string} ciphertext - Encrypted text (Base64 encoded)
 * @returns {string} Decrypted text
 */
export function decrypt(ciphertext) {
    if (!ciphertext || typeof ciphertext !== 'string') {
        return '';
    }

    try {
        const decoded = fromBase64(ciphertext);
        return xorCipher(decoded, ENCRYPTION_KEY);
    } catch (error) {
        console.error('Decryption failed:', error);
        // Might be plaintext (migration case)
        return ciphertext;
    }
}

/**
 * Check if a string appears to be encrypted
 * @param {string} str - String to check
 * @returns {boolean} True if likely encrypted
 */
export function isEncrypted(str) {
    if (!str || typeof str !== 'string') {
        return false;
    }

    // Check if it's valid Base64
    try {
        const decoded = fromBase64(str);
        // Encrypted strings should not be readable
        // Check for non-printable characters (heuristic)
        const hasNonPrintable = /[\x00-\x1F\x7F-\x9F]/.test(decoded);
        return hasNonPrintable;
    } catch {
        return false;
    }
}

/**
 * Safely migrate from plaintext to encrypted
 * @param {string} value - Value that might be plaintext or encrypted
 * @returns {string} Encrypted value
 */
export function migrateToEncrypted(value) {
    if (!value) return '';

    if (isEncrypted(value)) {
        return value; // Already encrypted
    }

    return encrypt(value);
}
