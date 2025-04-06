import StackElement from "./StackElement.js";
import Operator from "./Operator.js";
import Number from "./Number.js";

class HectocTokenizer {
    tokenize(calculation) {
       
        const tokens = [];
        [...calculation].forEach(c => {
            if (/[1-9]/.test(c)) {
                if (this.needToMergeToNumberCharacters(tokens)) {
                    const merged = this.mergeNumbers(c, tokens);
                    tokens.push(merged);
                } else if (this.isPreviousOperatorAnUnaryMinus(tokens)) {
                    tokens.pop();
                    tokens.push(Number.of(-parseInt(c, 10)));
                } else if (this.isNumberWithRightParenthesisBefore(c, tokens)) {
                    tokens.push(Operator.MULTIPLICATION);
                    tokens.push(Number.of(parseInt(c, 10)));
                } else {
                    tokens.push(Number.of(parseInt(c, 10)));
                }
            } else if (/[+\-−*x/÷^()]/.test(c)) {
                if (this.isOperatorALeftParenthesisWithUnaryMinusBefore(c, tokens)) {
                    tokens.pop();
                    tokens.push(Number.of(-1));
                    tokens.push(Operator.MULTIPLICATION);
                    tokens.push(Operator.from(c));
                } else if (this.isOperatorALeftParenthesisWithOperandWithoutOperatorBefore(c, tokens)) {
                    tokens.push(Operator.MULTIPLICATION);
                    tokens.push(Operator.from(c));
                } else {
                    tokens.push(Operator.from(c));
                }
            } else {
                throw new Error("Illegal character found.");
            }
        });
        
        return tokens;
    }

    mergeNumbers(c, tokens) {
        let lastInt = tokens.pop().value();
        let merged;
        if (lastInt < 0) {
            merged = Number.of(lastInt * 10 - parseInt(c, 10));
        } else {
            merged = Number.of(lastInt * 10 + parseInt(c, 10));
        }
        return merged;
    }

    needToMergeToNumberCharacters(tokens) {
        return tokens.length > 0 && tokens[tokens.length - 1] instanceof Number;
    }

    isPreviousOperatorAnUnaryMinus(tokens) {
        if (tokens.length === 0 || tokens[tokens.length - 1] !== Operator.MINUS) {
            return false;
        } else if (tokens.length === 1) {
            return true;
        } else {
            const minus = tokens.pop();
            const lastElement = tokens[tokens.length - 1];
            tokens.push(minus);
            if (lastElement instanceof Operator) {
                return lastElement !== Operator.RIGHTPARENTHESIS;
            } else {
                return false;
            }
        }
    }

    isPreviousOperatorAnOperandWithoutOperator(tokens) {
        if (tokens.length === 0) {
            return false;
        } else {
            return tokens[tokens.length - 1] === Operator.RIGHTPARENTHESIS || tokens[tokens.length - 1] instanceof Number;
        }
    }

    isPreviousOperatorARightParenthesis(tokens) {
        return tokens.length > 0 && tokens[tokens.length - 1] === Operator.RIGHTPARENTHESIS;
    }

    isOperatorALeftParenthesisWithUnaryMinusBefore(c, tokens) {
        return c === '(' && this.isPreviousOperatorAnUnaryMinus(tokens);
    }

    isOperatorALeftParenthesisWithOperandWithoutOperatorBefore(c, tokens) {
        return c === '(' && this.isPreviousOperatorAnOperandWithoutOperator(tokens);
    }

    isNumberWithRightParenthesisBefore(c, tokens) {
        return /[1-9]/.test(c) && this.isPreviousOperatorARightParenthesis(tokens);
    }
}

export default HectocTokenizer;
