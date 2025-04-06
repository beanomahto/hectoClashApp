
import HectocTokenizer from "./HectocTokenize.js";
import Operator from "./Operator.js";
import Number from "./Number.js";
import NullElement from "./NullElement.js";



class ShuntingYardAlgorithm {
    static CONTEXT = { precision: 7 };
    static BIG_DECIMAL_100 = 100;

    constructor(equotation) {
        if (!equotation || equotation.trim() === "") {
            throw new Error("Please provide an expression");
        }
        
        this.solution = this.solution = ShuntingYardAlgorithm.calculateRpn(this.createRpn(new HectocTokenizer().tokenize(equotation)));
    }

    createRpn(tokens) {
        const operators = [];
        const output = [];
        tokens.forEach(element => {
            if (element instanceof Number) {
                output.push(element);
            } else if (element instanceof Operator) {
                switch (element) {
                    case Operator.PLUS:
                    case Operator.MINUS:
                    case Operator.MULTIPLICATION:
                    case Operator.DIVISION:
                    case Operator.POWER:
                        while (operators.length > 0 && this.shouldIPopOtherOperatorFirst(element, operators[operators.length - 1])) {
                            output.push(operators.pop());
                        }
                        operators.push(element);
                        break;
                    case Operator.LEFTPARENTHESIS:
                        operators.push(element);
                        break;
                    case Operator.RIGHTPARENTHESIS:
                        while (operators.length > 0 && operators[operators.length - 1] !== Operator.LEFTPARENTHESIS) {
                            if (operators.length === 0) {
                                throw new Error("Missing left parenthesis");
                            }
                            output.push(operators.pop());
                        }
                        
                        operators.pop(); // Discard left parenthesis
                        break;
                }
            }
        });
        
        while (operators.length > 0) {
            const operator = operators.pop();
            if (operator === Operator.LEFTPARENTHESIS || operator === Operator.RIGHTPARENTHESIS) {
                throw new Error("Found mismatched parenthesis");
            }
            output.push(operator);
        }
        
        return output;
    }

    shouldIPopOtherOperatorFirst(newOperator, oldOperator) {
        return oldOperator && oldOperator !== Operator.LEFTPARENTHESIS &&
            (oldOperator.hasGreaterPrecedenceThan(newOperator) || oldOperator.hasSamePrecedenceAs(newOperator));
    }

    static calculateRpn(rpn, context) {
        const stack = [];
        
        rpn.forEach(element => {
            // console.log(element)
            if (element instanceof Number) {
                // console.log(parseInt(element))
                stack.push(parseInt(element));
            } else if (element instanceof Operator) {
                switch (element) {
                    case Operator.PLUS:
                        var newval=stack[stack.length-1]+stack[stack.length-2];
                        stack.pop();
                        stack.pop();
                        // console.log(newval);
                        stack.push(newval);
                        break;
                    case Operator.MINUS:
                        var newval=-stack[stack.length-1]+stack[stack.length-2];
                        stack.pop();
                        stack.pop();
                        // console.log(newval);
                        stack.push(newval);
                        break;
                    case Operator.MULTIPLICATION:
                        var newval=stack[stack.length-1]*stack[stack.length-2];
                        stack.pop();
                        stack.pop();
                        // console.log(newval);
                        stack.push(newval);
                        break;
                    case Operator.DIVISION:
                        var newval=stack[stack.length-2]/stack[stack.length-1];
                        stack.pop();
                        stack.pop();
                        // console.log(newval);
                        stack.push(newval);
                        break;
                    case Operator.POWER:
                        var newval=Math.pow(stack[stack.length-2],stack[stack.length-1]);
                        stack.pop();
                        stack.pop();
                        // console.log(newval);
                        stack.push(newval);
                        break;
                    default:
                        throw new Error("Invalid operator: " + element);
                }
            }
            // console.log(stack[stack.length-1])
        });

        let result = stack.pop();
        if (result === ShuntingYardAlgorithm.BIG_DECIMAL_100) {
            result = ShuntingYardAlgorithm.BIG_DECIMAL_100;
        }
        return result;
    }

    getSolution() {
        return this.solution;
    }
}


export default ShuntingYardAlgorithm;
