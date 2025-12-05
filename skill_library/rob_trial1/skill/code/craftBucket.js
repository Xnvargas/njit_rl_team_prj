// Main function to craft a bucket
async function craftBucket(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper: count items in inventory -----
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // ----- 1. Ensure we have at least 3 iron ingots -----
  let ironIngots = countItem('iron_ingot');
  if (ironIngots < 3) {
    const needed = 3 - ironIngots;
    bot.chat(`Need ${needed} more iron ingot(s). Smelting raw iron...`);

    // check we have enough raw iron
    if (countItem('raw_iron') < needed) {
      bot.chat('❌ Not enough raw iron to smelt the required ingots.');
      return;
    }

    // pick a fuel (coal preferred, otherwise stick)
    const fuelName = countItem('coal') > 0 ? 'coal' : countItem('stick') > 0 ? 'stick' : null;
    if (!fuelName) {
      bot.chat('❌ No fuel (coal or stick) available for smelting.');
      return;
    }
    await smeltItem(bot, 'raw_iron', fuelName, needed);
    bot.chat(`✅ Smelted ${needed} iron ingot(s).`);
    ironIngots = countItem('iron_ingot'); // update count
  } else {
    bot.chat('✅ Sufficient iron ingots already in inventory.');
  }

  // ----- 2. Ensure a crafting table is placed nearby -----
  let craftingTableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 5
  });
  if (!craftingTableBlock) {
    bot.chat('🔨 No crafting table nearby, placing one...');
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      bot.chat('❌ No crafting table item in inventory to place.');
      return;
    }

    // Find a suitable position (adjacent air block with a solid neighbor)
    const basePos = bot.entity.position.floored();
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    let placePos = null;
    for (const off of offsets) {
      const pos = basePos.offset(off.x, off.y, off.z);
      const block = bot.blockAt(pos);
      if (block && block.name === 'air') {
        // ensure at least one neighbor is solid
        const neighborDirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
        for (const nd of neighborDirs) {
          const nb = bot.blockAt(pos.plus(nd));
          if (nb && nb.name !== 'air') {
            placePos = pos;
            break;
          }
        }
      }
      if (placePos) break;
    }
    if (!placePos) {
      bot.chat('❌ Could not find a suitable spot to place the crafting table.');
      return;
    }
    await placeItem(bot, 'crafting_table', placePos);
    craftingTableBlock = bot.blockAt(placePos);
    if (!craftingTableBlock || craftingTableBlock.name !== 'crafting_table') {
      bot.chat('❌ Failed to place the crafting table.');
      return;
    }
    bot.chat('✅ Crafting table placed.');
  } else {
    bot.chat('✅ Crafting table already within reach.');
  }

  // ----- 3. Craft the bucket -----
  // Check if we already have a bucket
  if (bot.inventory.findInventoryItem(mcData.itemsByName.bucket.id)) {
    bot.chat('✅ Bucket already in inventory.');
    return;
  }
  bot.chat('🛠️ Crafting a bucket...');
  await craftItem(bot, 'bucket', 1);
  bot.chat('✅ Bucket crafted!');

  // ----- 4. Verify -----
  const bucket = bot.inventory.findInventoryItem(mcData.itemsByName.bucket.id);
  if (bucket) {
    bot.chat('✅ Verification passed: bucket is now in inventory.');
  } else {
    bot.chat('⚠️ Something went wrong: bucket not found after crafting.');
  }
}