// main function to mine at least five copper ore (i.e., obtain 5 raw_copper)
async function mineFiveCopperOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ----- helper: count items in inventory -----
  const countItem = name => {
    const info = mcData.itemsByName[name];
    if (!info) return 0;
    const stack = bot.inventory.findInventoryItem(info.id);
    return stack ? stack.count : 0;
  };

  // ----- 1. Ensure a stone‑or‑better pickaxe is equipped -----
  const pickaxePriority = ['diamond_pickaxe', 'netherite_pickaxe', 'iron_pickaxe', 'gold_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
  let equipped = false;
  for (const name of pickaxePriority) {
    const itemInfo = mcData.itemsByName[name];
    const item = bot.inventory.findInventoryItem(itemInfo.id);
    if (item) {
      await bot.equip(item, 'hand');
      await bot.chat(`Equipped ${name}.`);
      equipped = true;
      break;
    }
  }
  if (!equipped) {
    await bot.chat('❌ No pickaxe found in inventory – cannot mine copper ore.');
    return;
  }

  // ----- 2. Mining loop -----
  const neededTotal = 5; // we need 5 raw_copper
  const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
  while (countItem('raw_copper') < neededTotal) {
    const stillNeeded = neededTotal - countItem('raw_copper');
    await bot.chat(`Need ${stillNeeded} more copper ore (raw copper). Searching...`);

    // Try to locate a copper ore block nearby
    let oreBlock = bot.findBlock({
      matching: mcData.blocksByName.copper_ore.id,
      maxDistance: 32
    });

    // If not found, explore in a random direction
    if (!oreBlock) {
      const randomDir = directions[Math.floor(Math.random() * directions.length)];
      await bot.chat('Exploring for copper ore...');
      oreBlock = await exploreUntil(bot, randomDir, 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName.copper_ore.id,
          maxDistance: 32
        });
      });
    }

    // If still not found, give up
    if (!oreBlock) {
      await bot.chat('❌ Could not locate any copper ore after exploring.');
      break;
    }

    // Mine the required amount (or as many as we can in one go)
    await bot.chat(`Found copper ore at ${oreBlock.position}. Mining ${stillNeeded} block(s)...`);
    await mineBlock(bot, 'copper_ore', stillNeeded);
    // Short pause for inventory to update
    await bot.waitForTicks(5);
  }

  // ----- 3. Final report -----
  const finalCount = countItem('raw_copper');
  if (finalCount >= neededTotal) {
    await bot.chat(`✅ Success! I now have ${finalCount} raw copper (≥ ${neededTotal}).`);
  } else {
    await bot.chat(`⚠️ Task incomplete. Raw copper in inventory: ${finalCount}.`);
  }
}