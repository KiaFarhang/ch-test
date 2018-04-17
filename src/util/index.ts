import * as crypto from 'crypto';

export const getRandomHexString = (): string => {
    const buffer = crypto.randomBytes(8);
    return buffer.toString('hex');
}

// Borrowed from MDN
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

export const getRandomInt = (max: number): number => {
    return Math.floor(Math.random() * Math.floor(max));
}