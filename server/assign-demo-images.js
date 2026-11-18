require('dotenv').config();
const mongoose = require('mongoose');
const { Product } = require('./models');

const images = {
  'DEMO-TB': '/images/tandem-box.svg',
  'DEMO-CT': '/images/cutlery-tray.svg',
  'DEMO-CM': '/images/corner-unit.svg',
  'DEMO-TR': '/images/trouser-rack.svg',
  'DEMO-WL': '/images/wardrobe-lift.svg',
  'DEMO-HG': '/images/hinge.svg',
  'DEMO-DC': '/images/drawer-channel.svg',
  'DEMO-CW': '/images/castor-wheel.svg'
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockify')
  .then(async () => {
    let count = 0;
    for (const [prefix, image] of Object.entries(images)) {
      const result = await Product.updateMany({ sku: new RegExp('^' + prefix) }, { $set: { image } });
      count += result.modifiedCount;
    }
    console.log(`Representative product photos assigned: ${count}`);
  })
  .catch(error => { console.error(error.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
