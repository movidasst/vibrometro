const {test}=require('node:test');
const assert=require('node:assert/strict');
const m=require('../vibration-math.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('HAV: vector 3–4–0 is 5, four hours normalizes to 3.5355',()=>{
 near(m.magnitude('hav',[3,4,0]),5);
 near(m.exposure('hav',[{axes:[3,4,0],hours:4}]).total,5/Math.sqrt(2));
});
test('WBV: combine each axis before choosing daily dominant axis',()=>{
 const result=m.exposure('wbv',[{axes:[1,0,0],hours:4},{axes:[0,1,0],hours:4}]);
 near(result.total,1.4/Math.sqrt(2));
 assert.ok(result.total<1.4); // Combining per-task maxima would incorrectly produce 1.4.
});
test('energy integration retains earlier samples and weights duration',()=>{
 const acc=m.fresh();m.accumulate(acc,[3,4,0],[9,12,0],1);
 const a=m.accumulate(acc,[0,0,0],[0,0,0],3);
 near(a[0],1.5);near(a[1],2);assert.deepEqual(acc.peaks,[9,12,0]);
});
test('multiple HAV tasks add energies; zero time is zero exposure',()=>{
 near(m.exposure('hav',[{axes:[3,4,0],hours:4},{axes:[0,0,10],hours:2}]).total,Math.sqrt(37.5));
 near(m.exposure('hav',[{axes:[3,4,0],hours:0}]).total,0);
});
test('reject invalid exposure',()=>{
 for(const hours of [-1,25,NaN])assert.throws(()=>m.exposure('hav',[{axes:[1,2,3],hours}]),RangeError);
});
