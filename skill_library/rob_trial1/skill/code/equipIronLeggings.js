// Main function to equip iron leggings
async function equipIronLeggings(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // Helper to count items in inventory
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // 1️⃣ Find iron leggings in inventory
  let leggings = bot.inventory.findInventoryItem(mcData.itemsByName.iron_leggings.id);

  // 2️⃣ If we don't have leggings, craft them
  if (!leggings) {
    bot.chat('I have no iron leggings, preparing to craft them...');

    // ---- a) Ensure we have at least 4 iron ingots ----
    const neededIngots = Math.max(0, 4 - countItem('iron_ingot'));
    if (neededIngots > 0) {
      bot.chat(`Need ${neededIngots} iron ingots, smelting raw iron...`);
      // Ensure we have enough raw iron
      const rawNeeded = neededIngots; // 1 raw iron -> 1 ingot
      if (countItem('raw_iron') < rawNeeded) {
        bot.chat('Not enough raw iron to smelt.');
        return;
      }
      // Ensure we have fuel (coal or stick)
      if (countItem('coal') === 0 && countItem('stick') === 0) {
        bot.chat('No fuel available for smelting.');
        return;
      }
      const fuelName = countItem('coal') > 0 ? 'coal' : 'stick';
      await smeltItem(bot, 'raw_iron', fuelName, neededIngots);
    }

    // ---- b) Ensure a crafting table is nearby ----
    let craftingTableBlock = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 5
    });
    if (!craftingTableBlock) {
      // Place a crafting table from inventory
      const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
      if (!tableItem) {
        bot.chat('I have no crafting table to place.');
        return;
      }
      const placePos = bot.entity.position.offset(1, 0, 0);
      bot.chat('Placing a crafting table...');
      await placeItem(bot, 'crafting_table', placePos);
      craftingTableBlock = bot.blockAt(placePos);
    }

    // ---- c) Craft the leggings ----
    bot.chat('Crafting iron leggings...');
    await craftItem(bot, 'iron_leggings', 1);

    // Re‑search for the crafted leggings
    leggings = bot.inventory.findInventoryItem(mcData.itemsByName.iron_leggings.id);
    if (!leggings) {
      bot.chat('Failed to craft iron leggings.');
      return;
    }
  }

  // 3️⃣ Equip the leggings
  bot.chat('Equipping iron leggings...');
  await bot.equip(leggings, 'legs');
  bot.chat('Iron leggings equipped!');
}