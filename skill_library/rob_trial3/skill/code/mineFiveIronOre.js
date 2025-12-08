// -----------------------------------------------------------------------------
// Helper: returns a random Vec3 with components -1, 0 or 1 (not all zero)
function randomDirection() {
  const choices = [-1, 0, 1];
  let vec;
  do {
    vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
  } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
  return vec;
}

// Helper: ensure a placed crafting table exists (used only if we need to craft)

// Helper: ensure a placed crafting table exists (used only if we need to craft)
async function ensurePlacedCraftingTable(bot) {
  const tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (tableBlock) {
    await bot.pathfinder.goto(new GoalNear(tableBlock.position.x, tableBlock.position.y, tableBlock.position.z, 1));
    await bot.chat("Found a placed crafting table.");
    return;
  }
  // place one from inventory
  await bot.chat("Placing a crafting table for crafting...");
  const solid = bot.findBlock({
    matching: b => b.name !== "air",
    maxDistance: 3
  });
  const placePos = solid.position.offset(0, 1, 0);
  await placeItem(bot, "crafting_table", placePos);
  await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
  await bot.chat("Crafting table placed.");
}

// Helper: ensure we have a stone (or better) pickaxe

// Helper: ensure we have a stone (or better) pickaxe
async function ensurePickaxe(bot) {
  const pickaxeIds = [mcData.itemsByName.wooden_pickaxe.id, mcData.itemsByName.stone_pickaxe.id, mcData.itemsByName.iron_pickaxe.id, mcData.itemsByName.golden_pickaxe.id, mcData.itemsByName.diamond_pickaxe.id, mcData.itemsByName.netherite_pickaxe.id];
  const hasPickaxe = pickaxeIds.some(id => bot.inventory.findInventoryItem(id));
  if (hasPickaxe) {
    await bot.chat("A suitable pickaxe is already in inventory.");
    return;
  }
  await bot.chat("No pickaxe found – crafting a stone pickaxe.");

  // ---- ensure planks (3) ----
  const plankId = mcData.itemsByName.oak_planks.id;
  if (bot.inventory.count(plankId) < 3) {
    const needed = 3 - bot.inventory.count(plankId);
    const craftTimes = Math.ceil(needed / 4); // 4 planks per log
    // ensure logs
    const logId = mcData.itemsByName.oak_log.id;
    if (bot.inventory.count(logId) < craftTimes) {
      await bot.chat(`Mining ${craftTimes} oak log(s) for planks...`);
      await mineBlock(bot, "oak_log", craftTimes);
    }
    await ensurePlacedCraftingTable(bot);
    await bot.chat(`Crafting ${craftTimes} plank batch(es)...`);
    await craftItem(bot, "oak_planks", craftTimes);
  }

  // ---- ensure sticks (2) ----
  const stickId = mcData.itemsByName.stick.id;
  if (bot.inventory.count(stickId) < 2) {
    const neededSticks = 2 - bot.inventory.count(stickId);
    const craftTimes = Math.ceil(neededSticks / 4); // 4 sticks per craft
    const planksNeeded = craftTimes * 2;
    // ensure enough planks for sticks
    if (bot.inventory.count(plankId) < planksNeeded) {
      const extraPlankCrafts = Math.ceil((planksNeeded - bot.inventory.count(plankId)) / 4);
      await ensurePlacedCraftingTable(bot);
      await bot.chat(`Crafting extra ${extraPlankCrafts} plank batch(es) for sticks...`);
      await craftItem(bot, "oak_planks", extraPlankCrafts);
    }
    await ensurePlacedCraftingTable(bot);
    await bot.chat(`Crafting ${craftTimes} stick batch(es)...`);
    await craftItem(bot, "stick", craftTimes);
  }

  // ---- craft the pickaxe ----
  await ensurePlacedCraftingTable(bot);
  await bot.chat("Crafting stone pickaxe...");
  await craftItem(bot, "stone_pickaxe", 1);
  await bot.chat("Stone pickaxe crafted.");
}

// -----------------------------------------------------------------------------
// Main function: mine at least five iron ore blocks (raw iron)

// -----------------------------------------------------------------------------
// Main function: mine at least five iron ore blocks (raw iron)
async function mineFiveIronOre(bot) {
  const rawIronId = mcData.itemsByName.raw_iron.id;
  const ironOreId = mcData.blocksByName.iron_ore.id;

  // 1) How many raw iron we already have
  let have = bot.inventory.count(rawIronId);
  if (have >= 5) {
    await bot.chat(`✅ Already have ${have} raw iron, task complete.`);
    return;
  }
  const neededTotal = 5 - have;
  await bot.chat(`Need ${neededTotal} more raw iron (iron ore).`);

  // 2) Ensure we have a suitable pickaxe
  await ensurePickaxe(bot);

  // 3) Mine until we have enough
  let remaining = neededTotal;
  while (remaining > 0) {
    // try to find iron ore nearby
    let oreBlock = bot.findBlock({
      matching: ironOreId,
      maxDistance: 32
    });

    // if not found, explore
    if (!oreBlock) {
      await bot.chat("No iron ore nearby – exploring...");
      const found = await exploreUntil(bot, randomDirection(), 60, () => {
        const blk = bot.findBlock({
          matching: ironOreId,
          maxDistance: 32
        });
        return blk ? true : null;
      });
      if (!found) {
        await bot.chat("❌ Exploration failed to locate iron ore. Stopping.");
        return;
      }
      oreBlock = bot.findBlock({
        matching: ironOreId,
        maxDistance: 32
      });
    }

    // we have at least one ore block; mine the needed amount (or as many as we can find)
    const toMine = Math.min(remaining, 5); // safety cap
    await bot.chat(`Mining ${toMine} iron ore block(s)...`);
    await mineBlock(bot, "iron_ore", toMine);

    // recount
    have = bot.inventory.count(rawIronId);
    remaining = Math.max(0, 5 - have);
    await bot.chat(`Collected raw iron: ${have}/5.`);
  }

  // 4) Final report
  if (bot.inventory.count(rawIronId) >= 5) {
    await bot.chat(`✅ Success! I now have at least 5 raw iron.`);
  } else {
    await bot.chat(`❌ Finished mining but only have ${bot.inventory.count(rawIronId)} raw iron.`);
  }
}