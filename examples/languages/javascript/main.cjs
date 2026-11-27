console.log("APPDOCK_SUM="+process.argv.slice(2).map(Number).reduce((a,b)=>a+b,0));
