

// Simple client-side encryption helper to secure data in localStorage
// We use the User Token as the "Key/Salt" to encrypt the JSON data.

export const generateUserToken = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 to avoid confusion
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Simple XOR cipher with Base64 encoding for client-side obfuscation/encryption
const cipher = (text: string, salt: string) => {
    const textToChars = (text: string) => text.split('').map((c) => c.charCodeAt(0));
    const byteHex = (n: number) => ('0' + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code: number) => textToChars(salt).reduce((a, b) => a ^ b, code);

    return text
        .split('')
        .map(textToChars)
        .map((a) => applySaltToChar(a[0]))
        .map(byteHex)
        .join('');
};

const decipher = (encoded: string, salt: string) => {
    const textToChars = (text: string) => text.split('').map((c) => c.charCodeAt(0));
    const applySaltToChar = (code: number) => textToChars(salt).reduce((a, b) => a ^ b, code);
    
    return encoded
        .match(/.{1,2}/g)!
        .map((hex) => parseInt(hex, 16))
        .map(applySaltToChar)
        .map((charCode) => String.fromCharCode(charCode))
        .join('');
};

export const encryptData = (data: string, secret: string): string => {
    try {
        return cipher(data, secret);
    } catch (e) {
        console.error("Encryption failed", e);
        return "";
    }
};

export const decryptData = (encryptedData: string, secret: string): string => {
    try {
        return decipher(encryptedData, secret);
    } catch (e) {
        return "";
    }
};

// Migrate data from Old Token to New Token
export const migrateUserData = (oldToken: string, newToken: string): boolean => {
    try {
        const oldDBKey = `HABIT_USER_${oldToken}`;
        const newDBKey = `HABIT_USER_${newToken}`;
        
        // 1. Check if new token already exists
        if (localStorage.getItem(newDBKey)) {
            return false; // Token taken
        }

        // 2. Create new User DB Entry
        localStorage.setItem(newDBKey, JSON.stringify({ createdAt: new Date().toISOString() }));

        // 3. Migrate Schedule & Chat
        // We need to decrypt with OLD token and re-encrypt with NEW token
        const oldScheduleEnc = localStorage.getItem(`schedule_${oldToken}`);
        const oldChatEnc = localStorage.getItem(`chat_${oldToken}`);

        if (oldScheduleEnc) {
            const raw = decryptData(oldScheduleEnc, oldToken);
            if (raw) localStorage.setItem(`schedule_${newToken}`, encryptData(raw, newToken));
        }
        
        if (oldChatEnc) {
            const raw = decryptData(oldChatEnc, oldToken);
            if (raw) localStorage.setItem(`chat_${newToken}`, encryptData(raw, newToken));
        }

        // 4. Cleanup Old Data
        localStorage.removeItem(oldDBKey);
        localStorage.removeItem(`schedule_${oldToken}`);
        localStorage.removeItem(`chat_${oldToken}`);
        
        return true;
    } catch (e) {
        console.error("Migration failed", e);
        return false;
    }
};
