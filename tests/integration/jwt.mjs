import crypto from 'node:crypto';
const b=(x)=>Buffer.from(JSON.stringify(x)).toString('base64url');
export function jwt(claims,secret='super-secret-jwt-token-for-local-tests-0123456789'){const h=b({alg:'HS256',typ:'JWT'}),p=b({iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+86400,...claims});const s=crypto.createHmac('sha256',secret).update(h+'.'+p).digest('base64url');return `${h}.${p}.${s}`;}
if(process.argv[2]){console.log(jwt(JSON.parse(process.argv[2])));}
