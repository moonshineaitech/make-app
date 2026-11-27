declare const process: { argv: string[] };
enum Marker { Sum = 'APPDOCK_SUM' }
console.log(`${Marker.Sum}=${process.argv.slice(2).map(Number).reduce((a,b)=>a+b,0)}`);
