import crypto from 'crypto';


const RAW_KEY = process.env.ENCRYPTION_KEY || 'your-default-fallback-secret-string';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(RAW_KEY).digest();
const algo = 'aes-256-gcm';
const IV_LENGTH = 12;

export function encryptText(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(algo, ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}


export function decryptText(encryptedData: string): string {
    try {
        const [ivHex, authTagHex, encryptedText] = encryptedData.split(':');
        if (!ivHex || !authTagHex || !encryptedText) return "[Encrypted Message Corrupted]";

        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(algo, ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (err) {
        console.error("Decryption failed:", err);
        return "[Decryption Error]";
    }
}