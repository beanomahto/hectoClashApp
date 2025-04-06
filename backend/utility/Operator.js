import StackElement from "./StackElement.js";

class Operator extends StackElement {
    static PLUS = new Operator('+', 1);
    static MINUS = new Operator('-', 1);
    static MULTIPLICATION = new Operator('*', 2);
    static DIVISION = new Operator('/', 2);
    static POWER = new Operator('^', 3);
    static LEFTPARENTHESIS = new Operator('(', 4);
    static RIGHTPARENTHESIS = new Operator(')', 4);
    static NULLOPERATOR = new Operator(null, 5);
  
    constructor(symbol, precedence) {
      super();
      this.symbol = symbol;
      this.precedence = precedence;
    }
  
    static from(character) {
      switch (character) {
        case '+': return Operator.PLUS;
        case '-': return Operator.MINUS;
        case '-': return Operator.MINUS;
        case '*': return Operator.MULTIPLICATION;
        case 'x': return Operator.MULTIPLICATION;
        case '/': return Operator.DIVISION;
        case '÷': return Operator.DIVISION;
        case '^': return Operator.POWER;
        case '(': return Operator.LEFTPARENTHESIS;
        case ')': return Operator.RIGHTPARENTHESIS;
        default: throw new Error("Operator not implemented");
      }
    }
  
    hasGreaterPrecedenceThan(otherOperator) {
      return this.precedence > otherOperator.precedence;
    }
  
    hasSamePrecedenceAs(otherOperator) {
      return this.precedence === otherOperator.precedence;
    }
  }
  
  export default Operator;