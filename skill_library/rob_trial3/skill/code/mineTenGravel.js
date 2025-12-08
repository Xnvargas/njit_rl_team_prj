// main function to mine at least 10 gravel
async function mineTenGravel(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // ---------- 1. Ensure we have a shovel ----------
  async function ensureShovel() {
    // try to find any shovel, prefer the best one
    const shovelOrder = ["netherite_shovel", "diamond_shovel", "iron_shovel", "stone_shovel", "golden_shovel", "wooden_shovel"];
    for (const name of shovelOrder) {
      const id = mcData.itemsByName[name].id;
      const item = bot.inventory.findInventoryItem(id);
      if (item) {
        await bot.equip(item, "hand");
        await bot.chat(`✅ Shovel equipped: ${name}`);
        return true;
      }
    }

    // No shovel – craft an iron shovel (needs 2 sticks + 1 iron_ingot)
    const stickId = mcData.itemsByName.stick.id;
    const ironIngotId = mcData.itemsByName.iron_ingot.id;
    if (bot.inventory.count(stickId) < 2 || bot.inventory.count(ironIngotId) < 1) {
      await bot.chat("❌ Not enough sticks or iron ingots to craft a shovel.");
      return false;
    }

    // Ensure a crafting table is present before crafting
    if (!(await ensureCraftingTable())) return false;
    await bot.chat("🔨 Crafting an iron shovel...");
    try {
      await craftItem(bot, "iron_shovel", 1);
      const shovelItem = bot.inventory.findInventoryItem(mcData.itemsByName.iron_shovel.id);
      await bot.equip(shovelItem, "hand");
      await bot.chat("✅ Iron shovel crafted and equipped.");
      return true;
    } catch (e) {
      await bot.chat(`❌ Failed to craft shovel: ${e.message}`);
      return false;
    }
  }

  // ---------- 2. Ensure a crafting table block ----------
  async function ensureCraftingTable() {
    const tableId = mcData.blocksByName.crafting_table.id;
    const nearby = bot.findBlock({
      matching: tableId,
      maxDistance: 5
    });
    if (nearby) {
      await bot.chat(`✅ Crafting table already nearby at ${nearby.position}`);
      return true;
    }

    // Need a crafting table item
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      await bot.chat("❌ No crafting table item in inventory.");
      return false;
    }

    // Find an air block adjacent to the bot to place it
    const candidates = [bot.entity.position.offset(1, 0, 0), bot.entity.position.offset(-1, 0, 0), bot.entity.position.offset(0, 0, 1), bot.entity.position.offset(0, 0, -1), bot.entity.position.offset(0, 1, 0)];
    let placePos = null;
    for (const pos of candidates) {
      const blk = bot.blockAt(pos);
      if (blk && blk.name === "air") {
        placePos = pos;
        break;
      }
    }
    if (!placePos) {
      await bot.chat("❌ No suitable spot to place a crafting table.");
      return false;
    }
    await bot.chat(`📦 Placing crafting table at ${placePos}`);
    try {
      await placeItem(bot, "crafting_table", placePos);
      await bot.chat("✅ Crafting table placed.");
      return true;
    } catch (e) {
      await bot.chat(`❌ Failed to place crafting table: ${e.message}`);
      return false;
    }
  }

  // ---------- 3. Locate gravel ----------
  async function locateGravel() {
    const gravelId = mcData.blocksByName.gravel.id;
    let gravelBlock = bot.findBlock({
      matching: gravelId,
      maxDistance: 32
    });
    if (gravelBlock) return gravelBlock;

    // Not found – explore randomly until we see one
    await bot.chat("🔎 Exploring for gravel...");
    const found = await exploreUntil(bot, randomDirection(), 60, () => {
      const blk = bot.findBlock({
        matching: gravelId,
        maxDistance: 32
      });
      return blk ? blk : null;
    });
    if (!found) {
      await bot.chat("❌ Could not find any gravel within the time limit.");
      return null;
    }
    return bot.findBlock({
      matching: gravelId,
      maxDistance: 32
    });
  }

  // ---------- 4. Mine gravel ----------
  async function mineGravel(targetCount) {
    const gravelId = mcData.itemsByName.gravel.id;
    let have = bot.inventory.count(gravelId);
    while (have < targetCount) {
      const need = targetCount - have;
      await bot.chat(`⛏️ Mining ${need} gravel...`);
      await mineBlock(bot, "gravel", need);
      // small wait for inventory update
      await bot.waitForTicks(10);
      have = bot.inventory.count(gravelId);
    }
    await bot.chat(`✅ Finished mining. Gravel count: ${have}`);
  }

  // ---------- Helper: random direction ----------
  function randomDirection() {
    const choices = [-1, 0, 1];
    let vec;
    do {
      vec = new Vec3(choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)], choices[Math.floor(Math.random() * 3)]);
    } while (vec.x === 0 && vec.y === 0 && vec.z === 0);
    return vec;
  }

  // -------------------- Execution --------------------
  // 1. Shovel
  if (!(await ensureShovel())) return;

  // 2. Find gravel block (move close to it)
  const gravelBlock = await locateGravel();
  if (!gravelBlock) return;

  // Move next to the gravel so mining works reliably
  await bot.pathfinder.goto(new GoalNear(gravelBlock.position.x, gravelBlock.position.y, gravelBlock.position.z, 1));

  // 3. Mine until we have at least 10 gravel
  await mineGravel(10);
}