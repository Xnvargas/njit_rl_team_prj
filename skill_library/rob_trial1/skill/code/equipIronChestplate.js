// main function to equip an iron chestplate
async function equipIronChestplate(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // Find or place a block (furnace or crafting table)
  async function ensureBlock(name) {
    const blockId = mcData.blocksByName[name].id;
    let block = bot.findBlock({
      matching: blockId,
      maxDistance: 32
    });
    if (block) return block;

    // need the item in inventory
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[name].id);
    if (!item) {
      bot.chat(`I have no ${name} item to place.`);
      return null;
    }

    // try a few adjacent positions
    const directions = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    for (const dir of directions) {
      const pos = bot.entity.position.offset(dir.x, 0, dir.z);
      const below = bot.blockAt(pos.offset(0, -1, 0));
      const target = bot.blockAt(pos);
      if (target && target.name === 'air' && below && below.name !== 'air') {
        try {
          await placeItem(bot, name, pos);
          const placed = bot.blockAt(pos);
          if (placed && placed.name === name) return placed;
        } catch (e) {
          // ignore and try next spot
        }
      }
    }
    bot.chat(`Failed to place a ${name}.`);
    return null;
  }

  // ---------- 1. try to equip if already have ----------
  if (countItem('iron_chestplate') > 0) {
    const chestplateItem = bot.inventory.findInventoryItem(mcData.itemsByName.iron_chestplate.id);
    await bot.equip(chestplateItem, 'torso');
    bot.chat('Equipped iron chestplate from inventory.');
    return;
  }

  // ---------- 2. try to get from chest ----------
  const chestPos = new Vec3(377, 43, 903);
  bot.chat('Looking for iron chestplate in the nearby chest...');
  await getItemFromChest(bot, chestPos, {
    iron_chestplate: 1
  });
  if (countItem('iron_chestplate') > 0) {
    const chestplateItem = bot.inventory.findInventoryItem(mcData.itemsByName.iron_chestplate.id);
    await bot.equip(chestplateItem, 'torso');
    bot.chat('Equipped iron chestplate after retrieving it from the chest.');
    return;
  }

  // ---------- 3. need to craft the chestplate ----------
  bot.chat('Iron chestplate not found, will craft one.');

  // 3a. ensure we have at least 5 iron ingots
  const neededIngot = 5;
  let ingotCount = countItem('iron_ingot');
  if (ingotCount < neededIngot) {
    const toSmelt = neededIngot - ingotCount;
    bot.chat(`Need ${toSmelt} more iron ingots, smelting raw iron...`);

    // ensure a furnace exists
    const furnaceBlock = await ensureBlock('furnace');
    if (!furnaceBlock) {
      bot.chat('Cannot continue without a furnace.');
      return;
    }

    // smelt raw iron using coal as fuel
    await smeltItem(bot, 'raw_iron', 'coal', toSmelt);
    ingotCount = countItem('iron_ingot');
    if (ingotCount < neededIngot) {
      bot.chat('Failed to obtain enough iron ingots.');
      return;
    }
  }

  // 3b. ensure a crafting table exists
  const tableBlock = await ensureBlock('crafting_table');
  if (!tableBlock) {
    bot.chat('Cannot continue without a crafting table.');
    return;
  }

  // 3c. craft the chestplate
  bot.chat('Crafting iron chestplate...');
  await craftItem(bot, 'iron_chestplate', 1);

  // ---------- 4. equip the newly crafted chestplate ----------
  if (countItem('iron_chestplate') > 0) {
    const chestplateItem = bot.inventory.findInventoryItem(mcData.itemsByName.iron_chestplate.id);
    await bot.equip(chestplateItem, 'torso');
    bot.chat('Successfully crafted and equipped iron chestplate.');
  } else {
    bot.chat('Failed to craft iron chestplate.');
  }
}