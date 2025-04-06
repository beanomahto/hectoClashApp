import ShuntingYardAlgorithm from "./ShuntingYardAlgorithm.js";
import HectocChallenge from "./HectocChallenge.js";

class HectocSolution {
    static ALLOWED_CHARS = new Set(['1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '*', '/', '^', '(', ')']);
    
    constructor(challenge) {
        this.challenge = challenge;
        this.result = 0;
        this.valid = false;
        
    }
    
    checkSolution(solution) {
        
        console.log(solution);
        this.checkIllegalCharacters(solution);
        this.checkFormat(solution);
        this.checkUsedNumbers(solution);
        
        const algorithm = new ShuntingYardAlgorithm(solution);
        this.result = algorithm.getSolution();
        this.valid = this.result === 100;
        return this.valid;
    }
    
    updateSolutionInCaseOfEquation(solution) {
        if (!solution || solution.trim() === "") {
            throw new Error("No equation provided. Please use +, -, *, /, (, ) and ^ along with the six digits from your Hectoc.");
        }
        if (solution.endsWith("=100")) {
            return solution.slice(0, -4);
        }
        return solution;
    }
    
    getResultOfSolution(solution) {
        this.checkIllegalCharacters(solution);
        this.checkFormat(solution);
        this.checkUsedNumbers(solution);
        
        const algorithm = new ShuntingYardAlgorithm(solution);
        return algorithm.getSolution();
    }
    
    checkIllegalCharacters(equation) {
        if (!equation || equation.trim() === "") {
            throw new Error("No equation provided. Please use only allowed operators and numbers.");
        }
        
        const illegalChars = new Set([...equation].filter(c => !HectocSolution.ALLOWED_CHARS.has(c)));
        
        if (illegalChars.size > 0) {
            if (illegalChars.has('=')) {
                throw new Error("Detected an invalid use of '='. Please use only allowed operators and numbers.");
            }
            throw new Error(`Detected invalid characters: ${[...illegalChars].join('')}. Please use only allowed operators and numbers.`);
        }
    }
    
    checkFormat(equation) {
        const pattern = /^[-\(]*[1-9]([+\-*/\^\(\)]*[1-9]){5}[\)]*$/;
        if (!pattern.test(equation)) {
            throw new Error("Invalid Hectoc solution format. Use correct syntax and include six digits in order.");
        }
    }
    
    checkUsedNumbers(equation) {
        const pattern = /^[-\(]*([1-9])[+\-*/\^\(\)]*([1-9])[+\-*/\^\(\)]*([1-9])[+\-*/\^\(\)]*([1-9])[+\-*/\^\(\)]*([1-9])[+\-*/\^\(\)]*([1-9])[\)]*$/;
        const match = equation.match(pattern);
        
        if (!match) {
            throw new Error("Invalid solution format. Ensure all six digits are used in order.");
        }
        
        const digits = [
            this.challenge.getFirstDigit(),
            this.challenge.getSecondDigit(),
            this.challenge.getThirdDigit(),
            this.challenge.getFourthDigit(),
            this.challenge.getFifthDigit(),
            this.challenge.getSixthDigit()
        ];
        
        if (
            parseInt(match[1]) !== digits[0] ||
            parseInt(match[2]) !== digits[1] ||
            parseInt(match[3]) !== digits[2] ||
            parseInt(match[4]) !== digits[3] ||
            parseInt(match[5]) !== digits[4] ||
            parseInt(match[6]) !== digits[5]
        ) {
            throw new Error("Incorrect digit placement. Use only allowed operators and numbers in order.");
        }
    }
    
    formatAndCheckSolution(solution) {
        solution = this.updateSolutionInCaseOfEquation(solution);
        return this.checkSolution(solution);
    }
}

export default HectocSolution ;