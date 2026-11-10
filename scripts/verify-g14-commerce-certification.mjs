import { spawnSync } from "node:child_process";
import fs from "node:fs";
const packageJson=JSON.parse(fs.readFileSync("package.json","utf8"));
const required=[
"verify:shop-cart-end-to-end","verify:cart-stock-eligibility","verify:commerce-entrypoints-360",
"verify:commerce-fulfillment-360","verify:customer-commerce-pages","verify:ecommerce-stability",
"verify:order-payment-recovery","verify:payment-inventory-lifecycle","verify:public-order-tracking-privacy",
"verify:phase-2-product-inventory-hardening","verify:phase-3-cart-quotations-checkout",
"verify:phase-4-order-fulfillment-finance","verify:phase-11-inventory-procurement-360",
"verify:phase-16-quotation-order-project","verify:phase-19-order-confirmation-delivery"
];
const checks=[];
for(const name of required){
 const command=packageJson.scripts?.[name];
 checks.push({name,passed:typeof command==="string"&&command.length>0,detail:command||"missing npm script"});
}
const files=[
"src/lib/commerce.ts","src/lib/product-commerce.ts","src/lib/order-breakdown.ts","src/lib/checkout-key.ts",
"src/pages/cart.tsx","src/pages/track-order.tsx","src/pages/order-confirmation.tsx","src/pages/checkout-success.tsx",
"supabase/migrations/20261106140000_cart_checkout_variant_integrity.sql",
"supabase/migrations/20261107110000_payment_initiation_atomic_reservation.sql",
"supabase/migrations/20261107100000_order_fulfillment_finance_integrity.sql",
"supabase/migrations/20261107210000_phase_19_order_confirmation_delivery_reliability.sql"
];
for(const file of files) checks.push({name:`required commerce source exists: ${file}`,passed:fs.existsSync(file)});
const scripts=required.map(name=>({name,command:packageJson.scripts[name]}));
const result={certification:"G-14 Commerce source regression certification",checks_passed:checks.filter(x=>x.passed).length,checks_total:checks.length,failed:checks.filter(x=>!x.passed),regression_suite:scripts};
console.log(JSON.stringify(result,null,2));
if(result.failed.length) process.exit(1);
if(process.argv.includes("--run-suite")){
 let failures=0;
 for(const item of scripts){
  const [cmd,...args]=item.command.split(/\s+/);
  const run=spawnSync(cmd,args,{stdio:"inherit",shell:process.platform==="win32"});
  if(run.status!==0){failures++;console.error(`FAILED: ${item.name}`);}
 }
 if(failures) process.exit(1);
}
