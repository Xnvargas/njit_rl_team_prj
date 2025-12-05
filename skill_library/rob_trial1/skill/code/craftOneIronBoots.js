// main function to craft one iron boots
async function craftOneIronBoots(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // Find an air block next to a solid block (within a 2‑block radius)
  function findPlacePosition() {
    const offsets = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1), new Vec3(0, -1, 0), new Vec3(0, 1, 0)];
    const base = bot.entity.position.floored();
    for (const off of offsets) {
      const pos = base.offset(off.x, off.y, off.z);
      const block = bot.blockAt(pos);
      if (!block || block.name !== 'air') continue; // need air to place into

      // check at least one neighbor is solid (not air)
      const neighborVectors = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 1, 0), new Vec3(0, -1, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1)];
      for (const n of neighborVectors) {
        const nb = bot.blockAt(pos.plus(n));
        if (nb && nb.name !== 'air') return pos;
      }
    }
    return null; // none found
  }

  // ---------- 1. Ensure we have 4 iron ingots ----------
  const neededIngots = Math.max(0, 4 - countItem('iron_ingot'));
  if (neededIngots > 0) {
    bot.chat(`Need ${neededIngots} more iron ingot(s), attempting to smelt raw iron.`);
    if (countItem('raw_iron') < neededIngots) {
      bot.chat('Not enough raw iron to smelt the required ingots.');
      return;
    }
    // choose fuel
    let fuelName = null;
    if (countItem('coal') > 0) fuelName = 'coal';else if (countItem('stick') > 0) fuelName = 'stick';else {
      bot.chat('No fuel (coal or stick) available for smelting.');
      return;
    }
    await smeltItem(bot, 'raw_iron', fuelName, neededIngots);
    bot.chat(`Smelted ${neededIngots} iron ingot(s).`);
  } else {
    bot.chat('Already have enough iron ingots.');
  }

  // ---------- 2. Ensure a crafting table is placed ----------
  let craftingTableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!craftingTableBlock) {
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      bot.chat('No crafting table item in inventory to place.');
      return;
    }
    const placePos = findPlacePosition();
    if (!placePos) {
      bot.chat('Could not find a suitable spot to place the crafting table.');
      return;
    }
    bot.chat(`Placing crafting table at ${placePos}`);
    await placeItem(bot, 'crafting_table', placePos);
    // verify placement
    craftingTableBlock = bot.blockAt(placePos);
    if (!craftingTableBlock || craftingTableBlock.name !== 'crafting_table') {
      bot.chat('Failed to place the crafting table.');
      return;
    }
    bot.chat('Crafting table placed successfully.');
  } else {
    bot.chat('Crafting table already nearby.');
  }

  // ---------- 3. Craft the iron boots ----------
  if (countItem('iron_ingot') < 4) {
    bot.chat('Not enough iron ingots after smelting. Aborting.');
    return;
  }
  bot.chat('Crafting iron boots...');
  await craftItem(bot, 'iron_boots', 1);
  bot.chat('Crafting attempt finished.');

  // ---------- 4. Verify result ----------
  const boots = bot.inventory.findInventoryItem(mcData.itemsByName.iron_boots.id);
  if (boots) {
    bot.chat('Successfully crafted 1 iron boot(s)!');
  } else {
    bot.chat('Failed to craft iron boots.');
  }
}