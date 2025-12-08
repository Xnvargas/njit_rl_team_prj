// main function: mine four iron ore blocks
async function mineFourIronOre(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // helper: random direction vector (components -1,0,1, not all zero)
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }
  await bot.chat("=== Goal: mine 4 iron ore ===");

  // -------------------------------------------------
  // 1) Ensure we have a stone pickaxe or better
  // -------------------------------------------------
  const pickaxeNames = ["wooden_pickaxe", "stone_pickaxe", "iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"];
  const hasPickaxe = pickaxeNames.some(name => bot.inventory.findInventoryItem(mcData.itemsByName[name].id));
  if (!hasPickaxe) {
    await bot.chat("No pickaxe found – crafting a stone pickaxe.");

    // ---- 1a) Ensure cobblestone (3) ----
    const cobId = mcData.itemsByName.cobblestone.id;
    let cobCount = bot.inventory.count(cobId);
    if (cobCount < 3) {
      const need = 3 - cobCount;
      await bot.chat(`Mining ${need} stone for cobblestone...`);
      await mineBlock(bot, "stone", need);
    }

    // ---- 1b) Ensure sticks (2) ----
    const stickId = mcData.itemsByName.stick.id;
    let stickCount = bot.inventory.count(stickId);
    if (stickCount < 2) {
      const needSticks = 2 - stickCount;

      // need planks: each craft of sticks uses 2 planks → yields 4 sticks
      const stickCrafts = Math.ceil(needSticks / 4);
      const planksNeeded = stickCrafts * 2;

      // ensure planks
      const plankId = mcData.itemsByName.oak_planks.id;
      let plankCount = bot.inventory.count(plankId);
      if (plankCount < planksNeeded) {
        const missingPlanks = planksNeeded - plankCount;
        // ensure logs
        const logId = mcData.itemsByName.oak_log.id;
        let logCount = bot.inventory.count(logId);
        const logsNeeded = Math.ceil(missingPlanks / 4);
        if (logCount < logsNeeded) {
          await bot.chat(`Mining ${logsNeeded - logCount} oak log(s) for planks...`);
          await mineBlock(bot, "oak_log", logsNeeded - logCount);
        }
        const plankBatches = Math.ceil(missingPlanks / 4);
        await bot.chat(`Crafting ${plankBatches} batch(es) of oak planks...`);
        await craftItem(bot, "oak_planks", plankBatches);
      }
      await bot.chat(`Crafting ${stickCrafts} batch(es) of sticks...`);
      await craftItem(bot, "stick", stickCrafts);
    }

    // ---- 1c) Ensure a crafting table is placed ----
    let tableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!tableBlock) {
      await bot.chat("Placing a crafting table for the pickaxe...");
      // find a solid block within 3 blocks of the bot
      const solid = bot.findBlock({
        matching: b => b.name !== "air",
        maxDistance: 3
      });
      if (!solid) throw new Error("No solid block nearby to place a crafting table.");
      const placePos = solid.position.offset(0, 1, 0); // air block above solid
      await placeItem(bot, "crafting_table", placePos);
      tableBlock = bot.blockAt(placePos);
    }
    // walk to the table so we can use it
    await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));

    // ---- 1d) Craft the stone pickaxe ----
    await bot.chat("Crafting stone pickaxe...");
    await craftItem(bot, "stone_pickaxe", 1);
    await bot.chat("Stone pickaxe ready.");
  } else {
    await bot.chat("Pickaxe already in inventory.");
  }

  // -------------------------------------------------
  // 2) Mine iron ore until we have 4 blocks
  // -------------------------------------------------
  let mined = 0;
  while (mined < 4) {
    // try to locate iron ore within 32 blocks
    let ironBlock = bot.findBlock({
      matching: mcData.blocksByName.iron_ore.id,
      maxDistance: 32
    });
    if (!ironBlock) {
      await bot.chat("Iron ore not nearby – exploring...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: mcData.blocksByName.iron_ore.id,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Could not locate iron ore after exploring. Stopping.");
        return;
      }
      continue; // after exploration loop again to find the block
    }

    // mine a single iron ore block
    await mineBlock(bot, "iron_ore", 1);
    mined++;
    await bot.chat(`Mined ${mined}/4 iron ore blocks.`);
  }
  await bot.chat("✅ Finished mining 4 iron ore blocks.");
}