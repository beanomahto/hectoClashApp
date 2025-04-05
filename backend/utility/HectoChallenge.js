class HectocChallenge {
    static MIN = 1;
    static MAX = 9;
    static ALLOWED_CHARS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9']);

    /**
     * Creates a HectocChallenge instance.
     * @param {string | {firstDigit: number, secondDigit: number, ...}} input - Either a 6-digit string or an object with digit properties.
     */
    constructor(input) {
        if (typeof input === 'string') {
            this.fromString(input);
        } else if (typeof input === 'object' && input !== null) {
            // Check if all required keys are present in the object
            if (['firstDigit', 'secondDigit', 'thirdDigit', 'fourthDigit', 'fifthDigit', 'sixthDigit'].every(key => key in input)) {
                this.fromNumbers(input);
            } else {
                throw new Error("Invalid HectocChallenge object input. Missing required digit keys (firstDigit to sixthDigit).");
            }
        } else {
            throw new Error("Invalid HectocChallenge input. Provide either a 6-digit string or an object with keys firstDigit to sixthDigit.");
        }
    }

    /**
     * Initializes from an object containing digit properties.
     * @private
     */
    fromNumbers({ firstDigit, secondDigit, thirdDigit, fourthDigit, fifthDigit, sixthDigit }) {
        this.validateDigit(firstDigit, "first");
        this.validateDigit(secondDigit, "second");
        this.validateDigit(thirdDigit, "third");
        this.validateDigit(fourthDigit, "fourth");
        this.validateDigit(fifthDigit, "fifth");
        this.validateDigit(sixthDigit, "sixth");

        this.firstDigit = firstDigit;
        this.secondDigit = secondDigit;
        this.thirdDigit = thirdDigit;
        this.fourthDigit = fourthDigit;
        this.fifthDigit = fifthDigit;
        this.sixthDigit = sixthDigit;
    }

    /**
     * Initializes from a 6-digit string.
     * @private
     */
    fromString(hectoc) {
        if (!hectoc || hectoc.length !== 6) {
            throw new Error("String is not a valid hectoc. Please provide a string with 6 numbers between 1 and 9.");
        }

        const hectocSymbols = Array.from(hectoc).map(c => {
            if (!HectocChallenge.ALLOWED_CHARS.has(c)) {
                throw new Error(`Illegal character "${c}" found in hectoc string.`);
            }
            return parseInt(c, 10);
        });

        // Assign digits after successful parsing of all characters
        [this.firstDigit, this.secondDigit, this.thirdDigit, this.fourthDigit, this.fifthDigit, this.sixthDigit] = hectocSymbols;
    }

    /**
     * Validates a single digit.
     * @private
     */
    validateDigit(digit, position) {
        if (typeof digit !== 'number' || isNaN(digit) || digit < HectocChallenge.MIN || digit > HectocChallenge.MAX) {
            throw new Error(`The ${position} digit (${digit}) is invalid. Please provide a number between ${HectocChallenge.MIN} and ${HectocChallenge.MAX}.`);
        }
    }

    getFirstDigit() { return this.firstDigit; }
    getSecondDigit() { return this.secondDigit; }
    getThirdDigit() { return this.thirdDigit; }
    getFourthDigit() { return this.fourthDigit; }
    getFifthDigit() { return this.fifthDigit; }
    getSixthDigit() { return this.sixthDigit; }

    /**
     * Returns the string representation of the puzzle (e.g., "123456").
     * @returns {string}
     */
    toString() {
        return `${this.firstDigit}${this.secondDigit}${this.thirdDigit}${this.fourthDigit}${this.fifthDigit}${this.sixthDigit}`;
    }
}

// Export for CommonJS environment (used by Node.js `require`)
module.exports = HectocChallenge;