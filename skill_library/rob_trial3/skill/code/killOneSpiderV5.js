// helper: pick a random direction vector (components -1, 0, or 1, not all zero)
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// main function: kill exactly one spider

// main function: kill exactly one spider
async function killOneSpider(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;
  await bot.chat('🔎 Looking for a sword to fight the spider...');
  // 1️⃣ Ensure we have a melee weapon (prefer iron sword)
  let weaponItem = bot.inventory.findInventoryItem(mcData.itemsByName.iron_sword.id);
  if (!weaponItem) {
    await bot.chat('⚔️ No iron sword found, trying to use a bow...');
    weaponItem = bot.inventory.findInventoryItem(mcData.itemsByName.bow.id);
    if (!weaponItem) {
      await bot.chat('❌ No suitable weapon (sword or bow) in inventory. Cannot kill spider.');
      return;
    }
  }

  // 2️⃣ Equip the weapon in the hand
  try {
    await bot.equip(weaponItem, 'hand');
    await bot.chat(`✅ Equipped ${weaponItem.name} in hand.`);
  } catch (err) {
    await bot.chat(`❌ Failed to equip weapon: ${err.message}`);
    return;
  }

  // 3️⃣ Search for a spider
  await bot.chat('🔎 Searching for a spider...');
  const spiderFound = await exploreUntil(bot, randomDirection(), 60, () => {
    const spider = bot.nearestEntity(e => e.name === 'spider' && e.position.distanceTo(bot.entity.position) < 32);
    return spider ? true : null;
  });
  if (!spiderFound) {
    await bot.chat('❌ Could not locate a spider within the search time.');
    return;
  }

  // 4️⃣ Kill the spider using the helper
  await bot.chat('⚔️ Spider located! Engaging...');
  try {
    await killMob(bot, 'spider', 300);
    await bot.chat('✅ Spider has been killed.');
  } catch (err) {
    await bot.chat(`❌ Error while killing spider: ${err.message}`);
  }
}