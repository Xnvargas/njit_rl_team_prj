// main function to mine at least three coal ore blocks
async function mineThreeCoal(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  const countItem = name => {
    const itemInfo = mcData.itemsByName[name];
    if (!itemInfo) return 0;
    const invItem = bot.inventory.findInventoryItem(itemInfo.id);
    return invItem ? invItem.count : 0;
  };

  // equip a pickaxe (prefer iron, otherwise stone, then wooden)
  const equipPickaxe = async () => {
    const pickaxeNames = ['iron_pickaxe', 'stone_pickaxe', 'gold_pickaxe', 'diamond_pickaxe', 'wooden_pickaxe'];
    for (const name of pickaxeNames) {
      const info = mcData.itemsByName[name];
      const item = bot.inventory.findInventoryItem(info.id);
      if (item) {
        await bot.equip(item, 'hand');
        await bot.chat(`Equipped ${name}.`);
        return true;
      }
    }
    await bot.chat('❌ No pickaxe found in inventory.');
    return false;
  };

  // ---------- 1. ensure we have a pickaxe ----------
  const hasPickaxe = await equipPickaxe();
  if (!hasPickaxe) return; // cannot continue without a pickaxe

  // ---------- 2. mine coal until we have 3 ----------
  const maxAttempts = 10; // safety limit
  let attempts = 0;
  while (countItem('coal') < 3 && attempts < maxAttempts) {
    attempts++;

    // try to find a coal ore block nearby
    let coalBlock = bot.findBlock({
      matching: mcData.blocksByName['coal_ore'].id,
      maxDistance: 32
    });

    // if not found, explore in a random direction
    if (!coalBlock) {
      const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      await bot.chat('Exploring for coal ore...');
      coalBlock = await exploreUntil(bot, randomDir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName['coal_ore'].id,
          maxDistance: 32
        });
      });
    }
    if (!coalBlock) {
      await bot.chat('❌ Could not locate any coal ore after exploring.');
      break;
    }

    // mine one coal ore block
    await bot.chat('Mining a coal ore block...');
    await mineBlock(bot, 'coal_ore', 1);
    // give the bot a short pause for inventory update
    await bot.waitForTicks(5);
  }

  // ---------- 3. final report ----------
  const coalCount = countItem('coal');
  if (coalCount >= 3) {
    await bot.chat(`✅ Success! I now have ${coalCount} coal.`);
  } else {
    await bot.chat(`❌ Task incomplete. Coal in inventory: ${coalCount}.`);
  }
}