
import HectocGenerator from './HectocGenerator.js';
import HectocSolution from './HectocSolution.js';
import HectocChallenge from './HectocChallenge.js';

console.log(HectocGenerator.generate().toString());


const challenge1 = new HectocChallenge("399145");
const solution1 = "3+99-1+4-5";

const hectocSolution = new HectocSolution(challenge1);

try {
    const isValid = hectocSolution.checkSolution(solution1);
    console.log(`Solution: ${solution1}`);
    console.log(`Result: ${hectocSolution.result}`);
    console.log(`Is valid: ${isValid}`);
    
} catch (error) {
    console.error("Error:", error.message);
}



// const challenge1 = new HectocChallenge("498388");
// const solution1 = "4+98-3+8/8";

// const hectocSolution1 = new HectocSolution(challenge1);

// try {
//     const isValid1 = hectocSolution1.checkSolution(solution1);
//     console.log(`Solution: ${solution1}`);
//     console.log(`Result: ${hectocSolution1.result}`);
//     console.log(`Is valid: ${isValid1}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge2 = new HectocChallenge("185552");
// const solution2 = "1^8*(5+5)*5*2";

// const hectocSolution2 = new HectocSolution(challenge2);

// try {
//     const isValid2 = hectocSolution2.checkSolution(solution2);
//     console.log(`Solution: ${solution2}`);
//     console.log(`Result: ${hectocSolution2.result}`);
//     console.log(`Is valid: ${isValid2}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge3 = new HectocChallenge("459771");
// const solution3 = "45+9*7-7-1";

// const hectocSolution3 = new HectocSolution(challenge3);

// try {
//     const isValid3 = hectocSolution3.checkSolution(solution3);
//     console.log(`Solution: ${solution3}`);
//     console.log(`Result: ${hectocSolution3.result}`);
//     console.log(`Is valid: ${isValid3}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge4 = new HectocChallenge("998926");
// const solution4 = "-9/9+89+2*6";

// const hectocSolution4 = new HectocSolution(challenge4);

// try {
//     const isValid4 = hectocSolution4.checkSolution(solution4);
//     console.log(`Solution: ${solution4}`);
//     console.log(`Result: ${hectocSolution4.result}`);
//     console.log(`Is valid: ${isValid4}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge5 = new HectocChallenge("693728");
// const solution5 = "69+37+2-8";

// const hectocSolution5 = new HectocSolution(challenge5);

// try {
//     const isValid5 = hectocSolution5.checkSolution(solution5);
//     console.log(`Solution: ${solution5}`);
//     console.log(`Result: ${hectocSolution5.result}`);
//     console.log(`Is valid: ${isValid5}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge6 = new HectocChallenge("364611");
// const solution6 = "36+4+61-1";

// const hectocSolution6 = new HectocSolution(challenge6);

// try {
//     const isValid6 = hectocSolution6.checkSolution(solution6);
//     console.log(`Solution: ${solution6}`);
//     console.log(`Result: ${hectocSolution6.result}`);
//     console.log(`Is valid: ${isValid6}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge7 = new HectocChallenge("821731");
// const solution7 = "(8+2)*1*(7+3)*1";

// const hectocSolution7 = new HectocSolution(challenge7);

// try {
//     const isValid7 = hectocSolution7.checkSolution(solution7);
//     console.log(`Solution: ${solution7}`);
//     console.log(`Result: ${hectocSolution7.result}`);
//     console.log(`Is valid: ${isValid7}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge8 = new HectocChallenge("653258");
// const solution8 = "65+32-5+8";

// const hectocSolution8 = new HectocSolution(challenge8);

// try {
//     const isValid8 = hectocSolution8.checkSolution(solution8);
//     console.log(`Solution: ${solution8}`);
//     console.log(`Result: ${hectocSolution8.result}`);
//     console.log(`Is valid: ${isValid8}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge9 = new HectocChallenge("168932");
// const solution9 = "1*6+89+3+2";

// const hectocSolution9 = new HectocSolution(challenge9);

// try {
//     const isValid9 = hectocSolution9.checkSolution(solution9);
//     console.log(`Solution: ${solution9}`);
//     console.log(`Result: ${hectocSolution9.result}`);
//     console.log(`Is valid: ${isValid9}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge10 = new HectocChallenge("264346");
// const solution10 = "(26+4)*3+4+6";

// const hectocSolution10 = new HectocSolution(challenge10);

// try {
//     const isValid10 = hectocSolution10.checkSolution(solution10);
//     console.log(`Solution: ${solution10}`);
//     console.log(`Result: ${hectocSolution10.result}`);
//     console.log(`Is valid: ${isValid10}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge11 = new HectocChallenge("283961");
// const solution11 = "2+83+9+6*1";

// const hectocSolution11 = new HectocSolution(challenge11);

// try {
//     const isValid11 = hectocSolution11.checkSolution(solution11);
//     console.log(`Solution: ${solution11}`);
//     console.log(`Result: ${hectocSolution11.result}`);
//     console.log(`Is valid: ${isValid11}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge12 = new HectocChallenge("642714");
// const solution12 = "(6+4)*(-2+7+1+4)";

// const hectocSolution12 = new HectocSolution(challenge12);

// try {
//     const isValid12 = hectocSolution12.checkSolution(solution12);
//     console.log(`Solution: ${solution12}`);
//     console.log(`Result: ${hectocSolution12.result}`);
//     console.log(`Is valid: ${isValid12}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }



// const challenge1 = new HectocChallenge("498388");
// const solution1 = "4+98-3+8/8";

// const hectocSolution1 = new HectocSolution(challenge1);

// try {
//     const isValid1 = hectocSolution1.checkSolution(solution1);
//     console.log(`Solution: ${solution1}`);
//     console.log(`Result: ${hectocSolution1.result}`);
//     console.log(`Is valid: ${isValid1}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge2 = new HectocChallenge("533111");
// const solution2 = "-5-3-3+111";

// const hectocSolution2 = new HectocSolution(challenge2);

// try {
//     const isValid2 = hectocSolution2.checkSolution(solution2);
//     console.log(`Solution: ${solution2}`);
//     console.log(`Result: ${hectocSolution2.result}`);
//     console.log(`Is valid: ${isValid2}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge3 = new HectocChallenge("997518");
// const solution3 = "99+7-5-1^8";

// const hectocSolution3 = new HectocSolution(challenge3);

// try {
//     const isValid3 = hectocSolution3.checkSolution(solution3);
//     console.log(`Solution: ${solution3}`);
//     console.log(`Result: ${hectocSolution3.result}`);
//     console.log(`Is valid: ${isValid3}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge4 = new HectocChallenge("157448");
// const solution4 = "1*5*((7-4)*4+8)";

// const hectocSolution4 = new HectocSolution(challenge4);

// try {
//     const isValid4 = hectocSolution4.checkSolution(solution4);
//     console.log(`Solution: ${solution4}`);
//     console.log(`Result: ${hectocSolution4.result}`);
//     console.log(`Is valid: ${isValid4}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge5 = new HectocChallenge("648258");
// const solution5 = "(6+4)*(8*2*5/8)";

// const hectocSolution5 = new HectocSolution(challenge5);

// try {
//     const isValid5 = hectocSolution5.checkSolution(solution5);
//     console.log(`Solution: ${solution5}`);
//     console.log(`Result: ${hectocSolution5.result}`);
//     console.log(`Is valid: ${isValid5}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// // Repeat the pattern for the rest of the arguments


// const challenge1 = new HectocChallenge("825916");
// const solution1 = "(8+2)*(5-9+16)";

// const hectocSolution1 = new HectocSolution(challenge1);

// try {
//     const isValid1 = hectocSolution1.checkSolution(solution1);
//     console.log(`Solution: ${solution1}`);
//     console.log(`Result: ${hectocSolution1.result}`);
//     console.log(`Is valid: ${isValid1}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge2 = new HectocChallenge("264346");
// const solution2 = "(26+4)*3+4*6";

// const hectocSolution2 = new HectocSolution(challenge2);

// try {
//     const isValid2 = hectocSolution2.checkSolution(solution2);
//     console.log(`Solution: ${solution2}`);
//     console.log(`Result: ${hectocSolution2.result}`);
//     console.log(`Is valid: ${isValid2}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge3 = new HectocChallenge("599342");
// const solution3 = "5+99-3-4+2";

// const hectocSolution3 = new HectocSolution(challenge3);

// try {
//     const isValid3 = hectocSolution3.checkSolution(solution3);
//     console.log(`Solution: ${solution3}`);
//     console.log(`Result: ${hectocSolution3.result}`);
//     console.log(`Is valid: ${isValid3}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }

// const challenge4 = new HectocChallenge("323457");
// const solution4 = "(3+2)*(3*4+5-7)";

// const hectocSolution4 = new HectocSolution(challenge4);

// try {
//     const isValid4 = hectocSolution4.checkSolution(solution4);
//     console.log(`Solution: ${solution4}`);
//     console.log(`Result: ${hectocSolution4.result}`);
//     console.log(`Is valid: ${isValid4}`);
// } catch (error) {
//     console.error("Error:", error.message);
// }
