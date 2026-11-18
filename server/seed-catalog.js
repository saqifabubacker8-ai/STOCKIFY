require('dotenv').config();
const mongoose = require('mongoose');
const { Brand, Category, Product } = require('./models');
const { logOpening } = require('./stock');

const rows = [
  ['Single Pullout Basket','Sleek','Kitchen Accessories','Pull-out Baskets','SL-PULL-01','Steel','Silver',2600,4200,18,5,'/images/tandem-box.svg'],
  ['Magic Corner','Sleek','Kitchen Accessories','Corner Units','SL-MCOR-02','Steel','Chrome',9200,14500,10,3,'/images/corner-unit.svg'],
  ['Pantry Unit','Sleek','Kitchen Accessories','Pantry Units','SL-PANTRY-03','Aluminium','Silver',14500,22000,6,2,'/images/cutlery-tray.svg'],
  ['Larder Pullout','Sleek','Kitchen Accessories','Pull-out Baskets','SL-LARDER-04','Steel','Silver',10500,16500,8,2,'/images/tandem-box.svg'],
  ['Swing Tray','Sleek','Kitchen Accessories','Corner Units','SL-SWING-05','Steel','Chrome',4800,7600,12,3,'/images/corner-unit.svg'],
  ['Trouser Pullout','Sleek','Wardrobe Fittings','Trouser Racks','SL-TRSR-06','Steel','Chrome',2400,3900,20,5,'/images/trouser-rack.svg'],
  ['Shoe Pullout','Sleek','Wardrobe Fittings','Shoe Racks','SL-SHOE-07','Steel','Silver',4100,6500,15,4,'/images/wardrobe-lift.svg'],
  ['Drawer Organizer','Sleek','Kitchen Hardware','Drawer Accessories','SL-DORG-08','Steel','Silver',1800,3000,24,6,'/images/cutlery-tray.svg'],
  ['Rolling Shutter','Sleek','Kitchen Hardware','Shutters','SL-RSHUT-09','Aluminium','Anthracite',6800,10500,9,3,'/images/drawer-channel.svg'],
  ['Multipurpose Pullout','Sleek','Kitchen Accessories','Pull-out Baskets','SL-MULTI-10','Steel','Chrome',5500,8800,14,4,'/images/tandem-box.svg'],
  ['Side Pullout Basket','Ebco','Kitchen Accessories','Pull-out Baskets','EBCO-SPB-11','SS304','Electropolished',2200,3800,25,8,'/images/ebco-side.jpg'],
  ['Detergent Pullout Basket','Ebco','Kitchen Accessories','Pull-out Baskets','EBCO-DTP-12','SS304','Electropolished',3200,5200,18,5,'/images/ebco-detergent.jpg'],
  ['Magic Corner Comfort','Ebco','Kitchen Accessories','Corner Units','EBCO-MCC-13','SS304','Electropolished',8800,13500,8,3,'/images/ebco-comfort.jpg'],
  ['Magic Corner Max 90 Glass','Ebco','Kitchen Accessories','Corner Units','EBCO-MCMG-14','Glass','Anthracite',12500,18500,7,2,'/images/ebco-maxglass.jpg'],
  ['Kitchen D-Tray','Ebco','Kitchen Accessories','Corner Units','EBCO-KDT-15','SS304','Electropolished',4100,6800,16,4,'/images/ebco-dtray.jpg'],
  ['Kitchen Utensil Basket','Ebco','Kitchen Accessories','Pull-out Baskets','EBCO-KUB-16','SS304','Electropolished',2800,4600,22,6,'/images/ebco-utensil.png'],
  ['Kitchen Pantry Unit','Ebco','Kitchen Accessories','Pantry Units','EBCO-KPU-17','SS304','Anthracite',14500,21500,5,2,'/images/ebco-pantry.jpg'],
  ['Bottle Pullout','Ebco','Kitchen Accessories','Pull-out Baskets','EBCO-BPO-18','SS304','Electropolished',3900,6300,15,4,'/images/ebco-bottle.jpg'],
  ['Kitchen Pulldown System','Ebco','Kitchen Accessories','Wall Units','EBCO-PUL-19','SS304','Anthracite',9800,15000,6,2,'/images/ebco-pulldown.jpg'],
  ['Pull Out Grain Drawer','Ebco','Kitchen Accessories','Drawer Systems','EBCO-POGD-20','Polymer','White / Anthracite',3500,5700,14,4,'/images/ebco-grain.webp']
];

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stockify')
  .then(async () => {
    const brands = Object.fromEntries((await Brand.find()).map(x => [x.name, x._id]));
    const categories = Object.fromEntries((await Category.find()).map(x => [x.name, x._id]));
    let added = 0;
    for (const [name,brand,cat,sub,sku,material,finish,cost,price,quantity,min,image] of rows) {
      if (await Product.findOne({ sku })) continue;
      const p = await Product.create({ name,brand:brands[brand],category:categories[cat] || categories['Kitchen Accessories'],subcategory:sub,sku,material,finish,purchasePrice:cost,sellingPrice:price,quantity,minStock:min,image });
      await logOpening(p, 'Catalogue seed');
      added++;
    }
    console.log(`Catalogue products added: ${added}`);
  })
  .catch(e => { console.error(e.message); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
