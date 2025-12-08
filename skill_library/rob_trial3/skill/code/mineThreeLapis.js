// Main function: mine at least three lapis lazuli
async function mineThreeLapis(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // ---------- helper: random direction vector ----------
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // ---------- helper: ensure a placed crafting table ----------
  async function ensurePlacedCraftingTable() {
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
    await bot.chat("Placing a crafting table...");
    const solid = bot.findBlock({
      matching: b => b.name !== "air",
      maxDistance: 3
    });
    const placePos = solid.position.offset(0, 1, 0);
    await placeItem(bot, "crafting_table", placePos);
    await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
    await bot.chat("Crafting table placed.");
  }

  // ---------- helper: ensure a placed furnace ----------
  async function ensurePlacedFurnace() {
    const furnaceBlock = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (furnaceBlock) {
      await bot.pathfinder.goto(new GoalNear(furnaceBlock.position.x, furnaceBlock.position.y, furnaceBlock.position.z, 1));
      await bot.chat("Found a placed furnace.");
      return furnaceBlock;
    }
    await bot.chat("Placing a furnace...");
    // need 8 cobblestone – we already have plenty
    await ensurePlacedCraftingTable(); // needed to craft furnace
    await craftItem(bot, "furnace", 1);
    // find a free spot near the bot
    const solid = bot.findBlock({
      matching: b => b.name !== "air",
      maxDistance: 3
    });
    const placePos = solid.position.offset(0, 1, 0);
    await placeItem(bot, "furnace", placePos);
    await bot.pathfinder.goto(new GoalNear(placePos.x, placePos.y, placePos.z, 1));
    await bot.chat("Furnace placed.");
    return bot.blockAt(placePos);
  }

  // ---------- helper: ensure we have enough planks ----------
  async function ensurePlanks(target) {
    const plankId = mcData.itemsByName.oak_planks.id;
    let have = bot.inventory.count(plankId);
    if (have >= target) return;
    const need = target - have;
    const logsNeeded = Math.ceil(need / 4);
    // ensure logs
    const logId = mcData.itemsByName.oak_log.id;
    let logs = bot.inventory.count(logId);
    if (logs < logsNeeded) {
      const toMine = logsNeeded - logs;
      await bot.chat(`Mining ${toMine} oak log(s) for planks...`);
      await mineBlock(bot, "oak_log", toMine);
    }
    await ensurePlacedCraftingTable();
    const craftTimes = Math.ceil(need / 4);
    await bot.chat(`Crafting ${need} planks (${craftTimes} batch(es))...`);
    await craftItem(bot, "oak_planks", craftTimes);
  }

  // ---------- helper: ensure we have sticks ----------
  async function ensureSticks(target) {
    const stickId = mcData.itemsByName.stick.id;
    let have = bot.inventory.count(stickId);
    if (have >= target) return;
    const need = target - have;
    const crafts = Math.ceil(need / 4); // 4 sticks per craft
    const planksNeeded = crafts * 2;
    await ensurePlanks(planksNeeded);
    await ensurePlacedCraftingTable();
    await bot.chat(`Crafting ${need} sticks (${crafts} batch(es))...`);
    await craftItem(bot, "stick", crafts);
  }

  // ---------- helper: ensure iron ingots ----------
  async function ensureIronIngots(count) {
    const ironIngotId = mcData.itemsByName.iron_ingot.id;
    let have = bot.inventory.count(ironIngotId);
    if (have >= count) return;
    const need = count - have;

    // 1 raw_iron per iron ore, so need that many raw_iron
    const rawId = mcData.itemsByName.raw_iron.id;
    let rawHave = bot.inventory.count(rawId);
    const rawNeeded = need - rawHave;
    if (rawNeeded > 0) {
      // locate iron ore
      let oreBlock = bot.findBlock({
        matching: mcData.blocksByName.iron_ore.id,
        maxDistance: 32
      });
      if (!oreBlock) {
        await bot.chat("Searching for iron ore...");
        const found = await exploreUntil(bot, randomDirection(), 60, () => {
          const blk = bot.findBlock({
            matching: mcData.blocksByName.iron_ore.id,
            maxDistance: 32
          });
          return blk ? true : null;
        });
        if (!found) {
          await bot.chat("❌ Could not find iron ore.");
          return;
        }
        oreBlock = bot.findBlock({
          matching: mcData.blocksByName.iron_ore.id,
          maxDistance: 32
        });
      }
      await bot.chat(`Mining ${rawNeeded} iron ore block(s)...`);
      await mineBlock(bot, "iron_ore", rawNeeded);
    }

    // smelt raw iron
    const furnace = await ensurePlacedFurnace();
    // ensure fuel (oak planks)
    await ensurePlanks(need); // 1 plank per smelt is enough
    await bot.chat(`Smelting ${need} raw iron into ingots...`);
    await smeltItem(bot, "raw_iron", "oak_planks", need);
  }

  // ---------- Step 1: ensure iron pickaxe ----------
  const ironPickId = mcData.itemsByName.iron_pickaxe.id;
  if (!bot.inventory.findInventoryItem(ironPickId)) {
    await bot.chat("Iron pickaxe not found, crafting one...");
    // need 3 iron ingots and 2 sticks
    await ensureIronIngots(3);
    await ensureSticks(2);
    await ensurePlacedCraftingTable();
    await bot.chat("Crafting iron pickaxe...");
    await craftItem(bot, "iron_pickaxe", 1);
    await bot.chat("Iron pickaxe crafted.");
  } else {
    await bot.chat("Iron pickaxe already in inventory.");
  }

  // equip iron pickaxe (optional, but ensures correct tool)
  const ironPick = bot.inventory.findInventoryItem(ironPickId);
  if (ironPick) await bot.equip(ironPick, "hand");

  // ---------- Step 2: locate and mine lapis lazuli ----------
  const lapisName = "lapis_ore";
  let lapisBlock = bot.findBlock({
    matching: mcData.blocksByName[lapisName].id,
    maxDistance: 32
  });
  if (!lapisBlock) {
    await bot.chat("Searching for lapis lazuli ore...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: mcData.blocksByName[lapisName].id,
        maxDistance: 32
      });
      return blk ? true : null;
    });
    if (!found) {
      await bot.chat("❌ Could not find lapis lazuli ore.");
      return;
    }
    lapisBlock = bot.findBlock({
      matching: mcData.blocksByName[lapisName].id,
      maxDistance: 32
    });
  }
  await bot.chat("Mining lapis lazuli...");
  await mineBlock(bot, lapisName, 3); // mine three ore blocks to guarantee ≥3 lapis

  // ---------- Step 3: report result ----------
  const lapisId = mcData.itemsByName.lapis_lazuli.id;
  const lapisCount = bot.inventory.count(lapisId);
  if (lapisCount >= 3) {
    await bot.chat(`✅ Success! I now have ${lapisCount} lapis lazuli.`);
  } else {
    await bot.chat(`❌ Finished but only have ${lapisCount} lapis lazuli.`);
  }
}