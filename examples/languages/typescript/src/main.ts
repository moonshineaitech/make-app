declare const process: { argv: string[] };
enum Marker { Sum = "APPDOCK_SUM" }
const total: number = process.argv.slice(2).map(Number).reduce((a,b)=>a+b,0);
console.log(`${Marker.Sum}=${total}`);
