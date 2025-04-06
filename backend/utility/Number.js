import StackElement from "./StackElement.js";

class Number extends StackElement {
    constructor(number) {
      super();
      this.number = number;
    }
  
    static of(number) {
      return new Number(number);
    }
  
    value() {
      return this.number;
    }
  
    toString() {
      return String(this.number);
    }
  }

  export default Number;