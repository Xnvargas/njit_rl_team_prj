// main function
async function smeltEightRawIron(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  function countItem(name) {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  }

  // pick a random horizontal direction (components -1,0,1, not all zero)
  function randomHorizontalDirection() {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  // ---------- 1. ensure furnace ----------
  let furnaceBlock = bot.findBlock({
    matching: mcData.blocksByName.furnace.id,
    maxDistance: 32
  });
  if (!furnaceBlock) {
    // we have furnace items in inventory
    const furnaceItem = bot.inventory.findInventoryItem(mcData.itemsByName.furnace.id);
    if (!furnaceItem) {
      bot.chat('❌ No furnace item to place.');
      return;
    }
    // place furnace one block ahead of the bot
    const placePos = bot.entity.position.offset(1, 0, 0);
    bot.chat('Placing a furnace...');
    try {
      await placeItem(bot, 'furnace', placePos);
      furnaceBlock = bot.blockAt(placePos);
    } catch (err) {
      bot.chat(`❌ Failed to place furnace: ${err.message}`);
      return;
    }
  }
  bot.chat('✅ Furnace ready.');

  // ---------- 2. check raw iron ----------
  if (countItem('raw_iron') < 8) {
    bot.chat('❌ Not enough raw iron (need 8).');
    return;
  }

  // ---------- 3. ensure enough coal ----------
  const requiredCoal = 8;
  let coalCount = countItem('coal');
  if (coalCount < requiredCoal) {
    const need = requiredCoal - coalCount;
    bot.chat(`Need ${need} more coal. Mining coal ore...`);
    // try to mine directly
    await mineBlock(bot, 'coal_ore', need);
    // re‑count
    coalCount = countItem('coal');
    if (coalCount < requiredCoal) {
      // explore until we find more coal ore
      const missing = requiredCoal - coalCount;
      bot.chat(`Still missing ${missing} coal, exploring for more coal ore...`);
      const found = await exploreUntil(bot, randomHorizontalDirection(), 60, () => {
        const ore = bot.findBlock({
          matching: mcData.blocksByName.coal_ore.id,
          maxDistance: 32
        });
        return ore ? ore : null;
      });
      if (found) {
        await mineBlock(bot, 'coal_ore', missing);
        coalCount = countItem('coal');
      }
    }
    if (coalCount < requiredCoal) {
      bot.chat('❌ Could not obtain enough coal.');
      return;
    }
  }
  bot.chat(`✅ Have ${coalCount} coal (need ${requiredCoal}).`);

  // ---------- 4. smelt 8 raw iron ----------
  bot.chat('Smelting 8 raw iron...');
  await smeltItem(bot, 'raw_iron', 'coal', 8);

  // ---------- 5. verification ----------
  const ironIngotCount = countItem('iron_ingot');
  if (ironIngotCount >= 8) {
    bot.chat(`✅ Successfully smelted 8 iron ingots! (total iron ingots: ${ironIngotCount})`);
  } else {
    bot.chat('❌ Smelting failed – not enough iron ingots in inventory.');
  }
}