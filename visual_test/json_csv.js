import { Parser } from '@json2csv/plainjs';

const data = [
  { "carModel": "Audi", "price": 0, "color": "blue" },
  { "carModel": "BMW", "price": 15000, "color": "red", "manual": true },
  { "carModel": "Mercedes", "price": 20000, "color": "yellow" },
  { "carModel": "Porsche", "price": 30000, "color": "green" }
];

const json2csvParser = new Parser();
const csv = json2csvParser.parse(data);

console.log(csv);

