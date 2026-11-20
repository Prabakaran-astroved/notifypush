const fs = require('fs');
const xlsx = require('xlsx');

// Sample subscriber IDs with some valid, some duplicates, and some invalid
const data = [
  { subscriber_id: '123456' },
  { subscriber_id: '234567' },
  { subscriber_id: '345678' },
  { subscriber_id: '456789' },
  { subscriber_id: '567890' },
  { subscriber_id: '123456' }, // duplicate
  { subscriber_id: 'INVALID_ABC' }, // invalid non-numeric
  { subscriber_id: '678901' },
];

const worksheet = xlsx.utils.json_to_sheet(data);
const workbook = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(workbook, worksheet, 'Subscribers');

xlsx.writeFile(workbook, '/var/www/html/notifypush/backend/sample_subscribers.xlsx');
console.log('Sample excel created successfully at sample_subscribers.xlsx');
