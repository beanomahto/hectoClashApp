// Use require to import the HectocChallenge class in CommonJS
const HectocChallenge = require('./HectocChallenge');

/**
 * Generates Hectoc challenges, attempting to avoid known unsolvable combinations.
 * Note: This does *not* guarantee solvability, only avoids a specific blacklist.
 */
class HectocGenerator {

    // The blacklist of known unsolvable puzzles provided by the user.
    // Each item must be a valid HectocChallenge instance.
    static UNSOLVABLE_HECTOCS = [
        new HectocChallenge({ firstDigit: 1, secondDigit: 1, thirdDigit: 2, fourthDigit: 1, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 1, thirdDigit: 4, fourthDigit: 1, fifthDigit: 2, sixthDigit: 3 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 1, thirdDigit: 5, fourthDigit: 5, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 1, thirdDigit: 5, fourthDigit: 8, fifthDigit: 2, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 1, thirdDigit: 6, fourthDigit: 5, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 2, thirdDigit: 1, fourthDigit: 1, fifthDigit: 4, sixthDigit: 3 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 2, thirdDigit: 1, fourthDigit: 5, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 3, thirdDigit: 1, fourthDigit: 1, fifthDigit: 1, sixthDigit: 6 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 4, thirdDigit: 1, fourthDigit: 1, fifthDigit: 7, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 5, thirdDigit: 6, fourthDigit: 5, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 6, thirdDigit: 7, fourthDigit: 1, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 6, thirdDigit: 7, fourthDigit: 4, fifthDigit: 5, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 7, thirdDigit: 1, fourthDigit: 7, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 7, thirdDigit: 5, fourthDigit: 1, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 7, thirdDigit: 6, fourthDigit: 6, fifthDigit: 1, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 7, thirdDigit: 8, fourthDigit: 1, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 7, thirdDigit: 8, fourthDigit: 1, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 7, thirdDigit: 8, fourthDigit: 8, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 7, thirdDigit: 8, fourthDigit: 8, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 7, thirdDigit: 8, fourthDigit: 9, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 8, thirdDigit: 4, fourthDigit: 1, fifthDigit: 5, sixthDigit: 6 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 8, thirdDigit: 5, fourthDigit: 5, fifthDigit: 7, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 8, thirdDigit: 8, fourthDigit: 7, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 1, secondDigit: 8, thirdDigit: 8, fourthDigit: 8, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 2, secondDigit: 1, thirdDigit: 1, fourthDigit: 1, fifthDigit: 4, sixthDigit: 3 }),
        new HectocChallenge({ firstDigit: 2, secondDigit: 1, thirdDigit: 1, fourthDigit: 5, fifthDigit: 3, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 3, secondDigit: 5, thirdDigit: 1, fourthDigit: 1, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 3, secondDigit: 6, thirdDigit: 1, fourthDigit: 8, fifthDigit: 6, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 3, secondDigit: 6, thirdDigit: 3, fourthDigit: 3, fifthDigit: 6, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 3, secondDigit: 6, thirdDigit: 6, fourthDigit: 3, fifthDigit: 6, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 3, secondDigit: 8, thirdDigit: 3, fourthDigit: 8, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 3, secondDigit: 8, thirdDigit: 8, fourthDigit: 8, fifthDigit: 3, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 5, secondDigit: 9, thirdDigit: 8, fourthDigit: 9, fifthDigit: 9, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 1, thirdDigit: 1, fourthDigit: 1, fifthDigit: 7, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 1, thirdDigit: 1, fourthDigit: 1, fifthDigit: 7, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 1, thirdDigit: 7, fourthDigit: 6, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 1, thirdDigit: 7, fourthDigit: 6, fifthDigit: 7, sixthDigit: 6 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 1, thirdDigit: 7, fourthDigit: 7, fifthDigit: 6, sixthDigit: 6 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 3, thirdDigit: 3, fourthDigit: 6, fifthDigit: 3, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 3, thirdDigit: 9, fourthDigit: 6, fifthDigit: 6, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 1, fourthDigit: 6, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 4, fourthDigit: 1, fifthDigit: 4, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 4, fourthDigit: 9, fifthDigit: 8, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 6, fourthDigit: 1, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 6, fourthDigit: 1, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 6, fourthDigit: 1, fifthDigit: 6, sixthDigit: 6 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 6, fourthDigit: 6, fifthDigit: 1, sixthDigit: 5 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 6, fourthDigit: 6, fifthDigit: 5, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 6, fourthDigit: 6, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 6, fourthDigit: 6, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 6, fourthDigit: 7, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 6, thirdDigit: 7, fourthDigit: 6, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 7, thirdDigit: 5, fourthDigit: 1, fifthDigit: 5, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 7, thirdDigit: 6, fourthDigit: 1, fifthDigit: 1, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 7, thirdDigit: 6, fourthDigit: 1, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 7, thirdDigit: 6, fourthDigit: 1, fifthDigit: 7, sixthDigit: 6 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 7, thirdDigit: 6, fourthDigit: 6, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 7, thirdDigit: 6, fourthDigit: 7, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 7, thirdDigit: 7, fourthDigit: 7, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 8, thirdDigit: 1, fourthDigit: 1, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 6, secondDigit: 8, thirdDigit: 1, fourthDigit: 6, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 1, thirdDigit: 1, fourthDigit: 1, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 1, thirdDigit: 1, fourthDigit: 7, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 1, thirdDigit: 7, fourthDigit: 7, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 1, thirdDigit: 8, fourthDigit: 1, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 1, thirdDigit: 8, fourthDigit: 8, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 1, thirdDigit: 8, fourthDigit: 8, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 1, thirdDigit: 9, fourthDigit: 1, fifthDigit: 7, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 1, thirdDigit: 9, fourthDigit: 8, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 4, thirdDigit: 5, fourthDigit: 1, fifthDigit: 7, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 4, thirdDigit: 7, fourthDigit: 7, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 4, thirdDigit: 7, fourthDigit: 7, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 4, thirdDigit: 7, fourthDigit: 8, fifthDigit: 7, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 4, thirdDigit: 8, fourthDigit: 7, fifthDigit: 7, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 6, thirdDigit: 1, fourthDigit: 1, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 6, thirdDigit: 1, fourthDigit: 1, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 6, thirdDigit: 1, fourthDigit: 7, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 6, thirdDigit: 6, fourthDigit: 1, fifthDigit: 1, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 6, thirdDigit: 6, fourthDigit: 8, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 6, thirdDigit: 7, fourthDigit: 7, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 6, thirdDigit: 7, fourthDigit: 7, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 7, thirdDigit: 1, fourthDigit: 8, fifthDigit: 1, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 7, thirdDigit: 3, fourthDigit: 1, fifthDigit: 6, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 7, thirdDigit: 3, fourthDigit: 7, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 7, thirdDigit: 6, fourthDigit: 7, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 7, thirdDigit: 8, fourthDigit: 1, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 7, thirdDigit: 8, fourthDigit: 4, fifthDigit: 5, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 7, thirdDigit: 8, fourthDigit: 5, fifthDigit: 5, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 7, thirdDigit: 8, fourthDigit: 9, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 8, thirdDigit: 1, fourthDigit: 1, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 8, thirdDigit: 1, fourthDigit: 1, fifthDigit: 7, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 8, thirdDigit: 1, fourthDigit: 2, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 8, thirdDigit: 1, fourthDigit: 6, fifthDigit: 7, sixthDigit: 6 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 8, thirdDigit: 1, fourthDigit: 7, fifthDigit: 1, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 9, thirdDigit: 7, fourthDigit: 8, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 7, secondDigit: 9, thirdDigit: 9, fourthDigit: 9, fifthDigit: 7, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 1, thirdDigit: 7, fourthDigit: 7, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 1, thirdDigit: 7, fourthDigit: 7, fifthDigit: 8, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 1, thirdDigit: 7, fourthDigit: 8, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 1, thirdDigit: 7, fourthDigit: 8, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 1, thirdDigit: 8, fourthDigit: 8, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 1, thirdDigit: 9, fourthDigit: 7, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 1, thirdDigit: 9, fourthDigit: 8, fifthDigit: 7, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 1, thirdDigit: 9, fourthDigit: 8, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 1, thirdDigit: 9, fourthDigit: 8, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 3, thirdDigit: 8, fourthDigit: 3, fifthDigit: 8, sixthDigit: 3 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 3, thirdDigit: 8, fourthDigit: 5, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 3, thirdDigit: 8, fourthDigit: 8, fifthDigit: 5, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 3, thirdDigit: 8, fourthDigit: 8, fifthDigit: 8, sixthDigit: 3 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 5, thirdDigit: 3, fourthDigit: 8, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 5, thirdDigit: 8, fourthDigit: 8, fifthDigit: 3, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 1, fourthDigit: 8, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 7, fourthDigit: 8, fifthDigit: 8, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 8, fourthDigit: 1, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 8, fourthDigit: 1, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 8, fourthDigit: 5, fifthDigit: 3, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 8, fourthDigit: 7, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 8, fourthDigit: 7, fifthDigit: 8, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 8, fourthDigit: 8, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 8, fourthDigit: 8, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 7, thirdDigit: 8, fourthDigit: 9, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 1, fourthDigit: 7, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 1, fourthDigit: 8, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 1, fourthDigit: 8, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 1, fourthDigit: 9, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 5, fourthDigit: 8, fifthDigit: 3, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 7, fourthDigit: 7, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 7, fourthDigit: 8, fifthDigit: 1, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 7, fourthDigit: 8, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 7, fourthDigit: 8, fifthDigit: 8, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 8, fourthDigit: 1, fifthDigit: 7, sixthDigit: 8 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 8, fourthDigit: 1, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 8, fourthDigit: 3, fifthDigit: 8, sixthDigit: 3 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 8, fourthDigit: 7, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 8, fourthDigit: 7, fifthDigit: 8, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 8, fourthDigit: 7, fifthDigit: 8, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 8, fourthDigit: 7, fifthDigit: 8, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 8, fourthDigit: 8, fifthDigit: 1, sixthDigit: 7 }),
        new HectocChallenge({ firstDigit: 8, secondDigit: 8, thirdDigit: 8, fourthDigit: 8, fifthDigit: 6, sixthDigit: 1 }),
        new HectocChallenge({ firstDigit: 9, secondDigit: 5, thirdDigit: 1, fourthDigit: 9, fifthDigit: 9, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 9, secondDigit: 5, thirdDigit: 8, fourthDigit: 9, fifthDigit: 9, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 9, secondDigit: 6, thirdDigit: 1, fourthDigit: 9, fifthDigit: 9, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 9, secondDigit: 6, thirdDigit: 9, fourthDigit: 1, fifthDigit: 9, sixthDigit: 9 }),
        new HectocChallenge({ firstDigit: 9, secondDigit: 6, thirdDigit: 9, fourthDigit: 6, fifthDigit: 5, sixthDigit: 9 })
         // Add more known unsolvable puzzles if found
    ];

    /**
     * Generates a single random digit between MIN and MAX (inclusive).
     * @returns {number}
     */
    static generateDigit() {
        // Access static properties using the class name
        return Math.floor(Math.random() * (HectocChallenge.MAX - HectocChallenge.MIN + 1)) + HectocChallenge.MIN;
    }

    /**
     * Generates a HectocChallenge, attempting to avoid known unsolvable ones.
     * Keeps generating random puzzles until one is found that is not in the UNSOLVABLE_HECTOCS list.
     * Includes a safety break to prevent potential infinite loops.
     * @returns {HectocChallenge} A HectocChallenge object representing the puzzle.
     */
    static generate() {
        let challenge;
        let isUnsolvable;
        let attempts = 0;
        const maxAttempts = 1000; // Safety limit

        do {
            attempts++;
            if (attempts > maxAttempts) {
                console.error("[HectocGenerator] Error: Exceeded max attempts trying to generate a non-blacklisted puzzle. Check the UNSOLVABLE_HECTOCS list or generation logic.");
                // Fallback to a default known *solvable* puzzle in case of generation failure
                try {
                    console.warn("[HectocGenerator] Warning: Falling back to default solvable puzzle '225577'.");
                    return new HectocChallenge("225577"); // Example known solvable
                } catch (fallbackError) {
                    console.error("[HectocGenerator] Error: Failed to create even the fallback challenge!", fallbackError);
                    // If even the fallback fails, something is fundamentally wrong with HectocChallenge
                    throw new Error("Hectoc puzzle generation failed critically.");
                }
            }

            try {
                // Generate a new random challenge object
                challenge = new HectocChallenge({
                    firstDigit: this.generateDigit(),
                    secondDigit: this.generateDigit(),
                    thirdDigit: this.generateDigit(),
                    fourthDigit: this.generateDigit(),
                    fifthDigit: this.generateDigit(),
                    sixthDigit: this.generateDigit()
                });

                // Check if the generated challenge string matches any in the blacklist
                const challengeString = challenge.toString();
                isUnsolvable = this.UNSOLVABLE_HECTOCS.some(unsolvable => {
                    // Defensive check: ensure item in list is valid before calling toString
                    if (unsolvable instanceof HectocChallenge) {
                        return unsolvable.toString() === challengeString;
                    } else {
                         console.warn("[HectocGenerator] Warning: Invalid item found in UNSOLVABLE_HECTOCS list during check.");
                         return false; // Ignore invalid items
                    }
                });

            } catch (genError) {
                console.error("[HectocGenerator] Error during challenge instantiation or check:", genError);
                // Treat generation error as needing a retry
                isUnsolvable = true; // Force retry
                challenge = null; // Ensure challenge is not accidentally returned
            }

        } while (isUnsolvable); // Loop until a challenge is generated that is NOT on the blacklist

        console.log(`[Game] Generated non-blacklisted puzzle: ${challenge.toString()} (Attempts: ${attempts})`);
        return challenge; // Return the generated HectocChallenge object
    }
}

// Export for CommonJS environment
module.exports = HectocGenerator;