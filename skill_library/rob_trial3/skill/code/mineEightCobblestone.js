// Main function to ensure the bot ends up with at least 8 cobblestone
async function mineEightCobblestone(bot) {
  // Helper: random direction vector with components -1, 0, or 1 (not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // 1️⃣ Check how many cobblestone we already have
  const cobId = mcData.itemsByName["cobblestone"].id;
  let cobCount = bot.inventory.count(cobId);
  if (cobCount >= 8) {
    await bot.chat(`I already have ${cobCount} cobblestone. Task completed.`);
    return;
  }
  await bot.chat(`Cobblestone: ${cobCount}/8. Need to collect more.`);

  // 2️⃣ Ensure we have a pickaxe (any type)
  const pickaxeNames = ["wooden_pickaxe", "stone_pickaxe", "iron_pickaxe", "golden_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];
  const hasPickaxe = pickaxeNames.some(name => bot.inventory.findInventoryItem(mcData.itemsByName[name].id));
  if (!hasPickaxe) {
    await bot.chat("No pickaxe found. Crafting a wooden pickaxe...");

    // Ensure we have at least 3 planks
    const plankId = mcData.itemsByName["oak_planks"].id;
    let planks = bot.inventory.count(plankId);
    if (planks < 3) {
      const needed = 3 - planks;
      const craftTimes = Math.ceil(needed / 4); // 4 planks per craft
      await bot.chat(`Need ${needed} more planks. Crafting ${craftTimes} time(s).`);
      // Ensure we have logs to make planks
      const logId = mcData.itemsByName["oak_log"].id;
      let logs = bot.inventory.count(logId);
      if (logs < craftTimes) {
        const logsToMine = craftTimes - logs;
        await bot.chat(`Mining ${logsToMine} oak log(s) for planks...`);
        await mineBlock(bot, "oak_log", logsToMine);
      }
      await craftItem(bot, "oak_planks", craftTimes);
    }

    // Ensure we have at least 2 sticks
    const stickId = mcData.itemsByName["stick"].id;
    let sticks = bot.inventory.count(stickId);
    if (sticks < 2) {
      const needSticks = 2 - sticks;
      const craftTimes = Math.ceil(needSticks / 4); // 4 sticks per craft
      const planksNeeded = craftTimes * 2;
      await bot.chat(`Need ${needSticks} sticks. Crafting ${craftTimes} time(s).`);
      // Ensure enough planks for sticks
      planks = bot.inventory.count(plankId);
      if (planks < planksNeeded) {
        const extraPlankCrafts = Math.ceil((planksNeeded - planks) / 4);
        await bot.chat(`Crafting ${extraPlankCrafts} extra plank batch(es) for sticks.`);
        await craftItem(bot, "oak_planks", extraPlankCrafts);
      }
      await craftItem(bot, "stick", craftTimes);
    }

    // Craft the wooden pickaxe
    await bot.chat("Crafting wooden pickaxe...");
    await craftItem(bot, "wooden_pickaxe", 1);
    await bot.chat("Wooden pickaxe crafted.");
  } else {
    await bot.chat("Pickaxe already in inventory.");
  }

  // 3️⃣ Locate stone blocks
  let stoneBlock = bot.findBlock({
    matching: mcData.blocksByName["stone"].id,
    maxDistance: 32
  });
  if (!stoneBlock) {
    await bot.chat("No stone nearby, exploring to find stone...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName["stone"].id,
        maxDistance: 32
      });
      return blk ? true : null;
    });
    if (!found) {
      await bot.chat("❌ Could not locate any stone after exploring.");
      return;
    }
    await bot.chat("Stone found! Proceeding to mine.");
  } else {
    await bot.chat("Stone block found nearby.");
  }

  // 4️⃣ Mine stone until we have 8 cobblestone
  const neededCob = 8 - cobCount;
  await bot.chat(`Mining ${neededCob} stone block(s) to obtain cobblestone...`);
  await mineBlock(bot, "stone", neededCob);

  // 5️⃣ Final check
  cobCount = bot.inventory.count(cobId);
  if (cobCount >= 8) {
    await bot.chat(`✅ Success! I now have ${cobCount} cobblestone.`);
  } else {
    await bot.chat(`❌ Finished mining but only have ${cobCount} cobblestone.`);
  }
}