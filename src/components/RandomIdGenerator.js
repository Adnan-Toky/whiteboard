export default function (digit) {
    let id = "";
    let char = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (let i = 0; i < digit; i++) {
        id += char[Math.floor(Math.random() * char.length)];
    }
    return id;
}