// ------------------------------------------------------------
// Helper functions (used only inside the main function)
// ------------------------------------------------------------
async function equipIronBoots(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');
  const {
    GoalPlaceBlock,
    GoalLookAtBlock,
    GoalNear
  } = require('mineflayer-pathfinder').goals;

  // ---------- utility ----------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // ---------- ensure a furnace exists ----------
  async function ensureFurnace() {
    let furnace = bot.findBlock({
      matching: mcData.blocksByName.furnace.id,
      maxDistance: 32
    });
    if (furnace) return furnace;
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      bot.chat('❌ No furnace item to place.');
      return null;
    }

    // find a place next to the bot that has a solid neighbour
    const base = bot.entity.position.floored();
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    let placePos = null;
    for (const off of offsets) {
      const pos = base.plus(off);
      const block = bot.blockAt(pos);
      if (!block || block.name !== 'air') continue;
      // need at least one solid neighbour
      const neigh = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
      for (const n of neigh) {
        const nb = bot.blockAt(pos.plus(n));
        if (nb && nb.name !== 'air') {
          placePos = pos;
          break;
        }
      }
      if (placePos) break;
    }
    if (!placePos) {
      bot.chat('❌ Could not find a suitable spot for the furnace.');
      return null;
    }
    bot.chat(`🔧 Placing furnace at ${placePos}`);
    await placeItem(bot, 'furnace', placePos);
    return bot.blockAt(placePos);
  }

  // ---------- ensure we have at least one fuel item ----------
  function getFuelName() {
    if (countItem('coal') > 0) return 'coal';
    if (countItem('stick') > 0) return 'stick';
    return null;
  }

  // ---------- ensure enough iron ingots ----------
  async function ensureIronIngots(target) {
    const have = countItem('iron_ingot');
    if (have >= target) return true;
    const need = target - have;
    // check raw iron
    const rawCount = countItem('raw_iron');
    if (rawCount < need) {
      bot.chat(`❌ Need ${need} raw iron but only have ${rawCount}.`);
      return false;
    }
    const fuelName = getFuelName();
    if (!fuelName) {
      bot.chat('❌ No fuel (coal or stick) to smelt iron.');
      return false;
    }
    const furnace = await ensureFurnace();
    if (!furnace) return false;
    bot.chat(`🔥 Smelting ${need} iron ingot(s) using ${fuelName}.`);
    await smeltItem(bot, 'raw_iron', fuelName, need);
    return countItem('iron_ingot') >= target;
  }

  // ---------- obtain iron boots ----------
  async function obtainBoots() {
    // 1) already in inventory?
    let boots = bot.inventory.findInventoryItem(mcData.itemsByName.iron_boots.id);
    if (boots) return boots;

    // 2) try to pull from nearest chest
    const chestBlock = bot.findBlock({
      matching: mcData.blocksByName.chest.id,
      maxDistance: 32
    });
    if (chestBlock) {
      bot.chat('📦 Trying to get iron boots from a nearby chest.');
      await getItemFromChest(bot, chestBlock.position, {
        iron_boots: 1
      });
      boots = bot.inventory.findInventoryItem(mcData.itemsByName.iron_boots.id);
      if (boots) return boots;
    }

    // 3) craft them
    bot.chat('🔨 Crafting iron boots because none were found.');
    // ensure 4 iron ingots
    const okIngots = await ensureIronIngots(4);
    if (!okIngots) {
      bot.chat('❌ Cannot craft boots – not enough iron ingots.');
      return null;
    }

    // ensure crafting table
    let table = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 32
    });
    if (!table) {
      const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
      if (!tableItem) {
        bot.chat('❌ No crafting table in inventory to place.');
        return null;
      }
      const placePos = bot.entity.position.offset(1, 0, 0);
      bot.chat('Placing a crafting table for the recipe.');
      await placeItem(bot, 'crafting_table', placePos);
      table = bot.blockAt(placePos);
    }

    // craft
    await craftItem(bot, 'iron_boots', 1);
    return bot.inventory.findInventoryItem(mcData.itemsByName.iron_boots.id);
  }

  // ---------- main flow ----------
  bot.chat('🚀 Starting iron boots equip routine.');
  const bootsItem = await obtainBoots();
  if (!bootsItem) {
    bot.chat('❌ Failed to obtain iron boots – cannot equip.');
    return;
  }
  await bot.equip(bootsItem, 'feet');
  bot.chat('✅ Iron boots equipped!');
}