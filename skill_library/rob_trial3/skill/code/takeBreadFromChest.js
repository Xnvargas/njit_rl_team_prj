// Main function: take bread from the chest at (-11, 31, -62)
async function takeBreadFromChest(bot) {
  const {
    Vec3
  } = require('vec3'); // import Vec3
  const chestPos = new Vec3(-11, 31, -62); // chest coordinates

  // Try to move to the chest and withdraw 1 stack of bread
  try {
    await bot.chat('Going to the chest to take bread...');
    await getItemFromChest(bot, chestPos, {
      bread: 1
    });
    await bot.chat('✅ Bread has been taken from the chest.');
  } catch (err) {
    // If something goes wrong (e.g., chest not found), report it
    await bot.chat(`❌ Failed to take bread: ${err.message}`);
  }
}