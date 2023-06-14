const enable = true;
const level = 150;
const timeout = 600;
const test = '{"hi": []}'
var obj = JSON.parse(test)
obj.hi.push('"enable": true')
console.log(obj)
console.log(JSON.stringify(test))