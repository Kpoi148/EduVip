/**
 * Input Validation and Sanitization Utilities
 */

import { ValidationError } from './errors.js';

/**
 * Validate API Key format
 * @param {string} key - API key to validate
 * @returns {boolean} True if valid
 * @throws {ValidationError} If invalid
 */
export function validateApiKey(key) {
    if (!key || typeof key !== 'string') {
        throw new ValidationError('API Key không được để trống', 'geminiApiKey');
    }

    const trimmed = key.trim();

    if (trimmed.length < 20) {
        throw new ValidationError('API Key quá ngắn', 'geminiApiKey');
    }

    // Gemini API keys typically start with specific patterns
    // This is a basic check, adjust as needed
    if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
        throw new ValidationError('API Key chứa ký tự không hợp lệ', 'geminiApiKey');
    }

    return true;
}

/**
 * Validate rating value
 * @param {number|string} rating - Rating to validate
 * @returns {number} Validated rating
 * @throws {ValidationError} If invalid
 */
export function validateRating(rating) {
    const num = Number(rating);

    if (!Number.isFinite(num)) {
        throw new ValidationError('Rating phải là số', 'rating');
    }

    if (num < 1 || num > 5) {
        throw new ValidationError('Rating phải từ 1 đến 5', 'rating');
    }

    return Math.floor(num);
}

/**
 * Validate comment text
 * @param {string} comment - Comment to validate
 * @param {number} maxLength - Maximum length
 * @returns {string} Validated comment
 * @throws {ValidationError} If invalid
 */
export function validateComment(comment, maxLength = 5000) {
    if (!comment || typeof comment !== 'string') {
        throw new ValidationError('Comment không được để trống', 'comment');
    }

    const trimmed = comment.trim();

    if (trimmed.length === 0) {
        throw new ValidationError('Comment không được để trống', 'comment');
    }

    if (trimmed.length > maxLength) {
        throw new ValidationError(`Comment không được dài quá ${maxLength} ký tự`, 'comment');
    }

    return trimmed;
}

/**
 * Sanitize text to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
export function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    // Remove HTML tags
    let sanitized = text.replace(/<[^>]*>/g, '');

    // Encode special characters
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');

    return sanitized;
}

/**
 * Sanitize HTML but allow safe formatted text
 * Useful for AI-generated content that might have basic formatting
 * @param {string} html - HTML to sanitize
 * @returns {string} Sanitized HTML with safe tags only
 */
export function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }

    // Allow only safe tags: b, i, em, strong, br, p
    const allowedTags = ['b', 'i', 'em', 'strong', 'br', 'p'];
    const tagRegex = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi;

    let sanitized = html.replace(tagRegex, (match, tag) => {
        const lowerTag = tag.toLowerCase();
        if (allowedTags.includes(lowerTag)) {
            // Keep the tag but remove attributes
            return match.replace(/\s+[a-z-]+=["'][^"']*["']/gi, '');
        }
        // Remove disallowed tags
        return '';
    });

    // Remove script and style content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');

    return sanitized;
}

/**
 * Validate and sanitize system prompt
 * @param {string} prompt - System prompt to validate
 * @param {number} maxLength - Maximum length
 * @returns {string} Validated prompt
 */
export function validateSystemPrompt(prompt, maxLength = 2000) {
    if (!prompt || typeof prompt !== 'string') {
        return ''; // System prompt is optional
    }

    const trimmed = prompt.trim();

    if (trimmed.length > maxLength) {
        throw new ValidationError(`System prompt không được dài quá ${maxLength} ký tự`, 'systemPrompt');
    }

    return trimmed;
}

/**
 * Validate input text length
 * @param {string} text - Text to validate
 * @param {number} maxLength - Maximum length
 * @param {string} fieldName - Field name for error message
 * @returns {string} Validated text
 * @throws {ValidationError} If too long
 */
export function validateLength(text, maxLength, fieldName = 'input') {
    if (!text || typeof text !== 'string') {
        return '';
    }

    if (text.length > maxLength) {
        throw new ValidationError(
            `${fieldName} không được dài quá ${maxLength} ký tự`,
            fieldName
        );
    }

    return text;
}
