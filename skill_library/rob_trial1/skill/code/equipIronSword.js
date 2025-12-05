// Main function: equip an iron sword (crafting it if necessary)
async function equipIronSword(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // ---------- 1. try to equip existing sword ----------
  if (countItem('iron_sword') > 0) {
    const sword = bot.inventory.findInventoryItem(mcData.itemsByName.iron_sword.id);
    if (!sword) {
      bot.chat('Iron sword found in inventory but could not locate the item object.');
      return;
    }
    try {
      await bot.equip(sword, 'hand');
      bot.chat('Equipped iron sword.');
    } catch (err) {
      bot.chat(`Failed to equip iron sword: ${err.message}`);
    }
    return;
  }

  // ---------- 2. sword missing – try to craft ----------
  bot.chat('Iron sword not in inventory, attempting to craft one.');

  // check required materials
  if (countItem('iron_ingot') < 2 || countItem('stick') < 1) {
    bot.chat('Cannot craft iron sword: need 2 iron ingots and 1 stick.');
    return;
  }

  // ensure a crafting table is reachable
  let tableBlock = bot.findBlock({
    matching: mcData.blocksByName.crafting_table.id,
    maxDistance: 32
  });
  if (!tableBlock) {
    // we have a crafting table item?
    const tableItem = bot.inventory.findInventoryItem(mcData.itemsByName.crafting_table.id);
    if (!tableItem) {
      bot.chat('No crafting table in inventory to place.');
      return;
    }

    // find a free spot adjacent to the bot
    let placePos = null;
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    for (const dir of directions) {
      const candidate = bot.entity.position.offset(dir.x, 0, dir.z);
      const block = bot.blockAt(candidate);
      const below = bot.blockAt(candidate.offset(0, -1, 0));
      if (block && block.name === 'air' && below && below.name !== 'air') {
        placePos = candidate;
        break;
      }
    }
    if (!placePos) {
      bot.chat('Could not find a suitable spot to place a crafting table.');
      return;
    }
    try {
      await placeItem(bot, 'crafting_table', placePos);
      tableBlock = bot.blockAt(placePos);
      if (!tableBlock || tableBlock.name !== 'crafting_table') {
        bot.chat('Failed to place crafting table.');
        return;
      }
      bot.chat('Placed crafting table for crafting.');
    } catch (err) {
      bot.chat(`Error placing crafting table: ${err.message}`);
      return;
    }
  }

  // craft the iron sword
  try {
    await craftItem(bot, 'iron_sword', 1);
    bot.chat('Crafted iron sword.');
  } catch (err) {
    bot.chat(`Failed to craft iron sword: ${err.message}`);
    return;
  }

  // equip the newly crafted sword
  const newSword = bot.inventory.findInventoryItem(mcData.itemsByName.iron_sword.id);
  if (!newSword) {
    bot.chat('Iron sword was crafted but not found in inventory.');
    return;
  }
  try {
    await bot.equip(newSword, 'hand');
    bot.chat('Equipped the newly crafted iron sword.');
  } catch (err) {
    bot.chat(`Failed to equip the iron sword: ${err.message}`);
  }
}