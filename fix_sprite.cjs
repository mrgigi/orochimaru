const Jimp = require('jimp');

async function removeMagenta() {
  try {
    const image = await Jimp.read('/Users/gigibante/.gemini/antigravity/brain/3bf6f3ef-c33e-4249-8762-248e4f828568/hokage_boss_sprite_v2_1779806488864.png');
    
    // We scan the image and remove all magenta pixels (r=255, g=0, b=255)
    // Actually let's do a distance threshold in case of JPEG artifacts or anti-aliasing
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      // Magenta is around 255, 0, 255
      if (r > 200 && g < 50 && b > 200) {
        this.bitmap.data[idx + 3] = 0; // alpha to 0
      }
    });
    
    await image.writeAsync('/Users/gigibante/Documents/Antigravity/Orochimaru/public/assets/hokage-boss-v2.png');
    console.log('Success!');
  } catch (err) {
    console.error(err);
  }
}

removeMagenta();
