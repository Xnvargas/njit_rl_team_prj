// main function: craft one iron sword robustly
async function craftIronSwordRobust(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const {
    Vec3
  } = require('vec3');

  // ---------- helpers ----------
  const countItem = name => {
    const id = mcData.itemsByName[name]?.id;
    return id ? bot.inventory.count(id) : 0;
  };

  // pick a random horizontal direction (y = 0)
  const randomHorizontalDirection = () => {
    const dirs = [new Vec3(1, 0, 0), new Vec3(-1, 0, 0), new Vec3(0, 0, 1), new Vec3(0, 0, -1), new Vec3(1, 0, 1), new Vec3(-1, 0, -1), new Vec3(1, 0, -1), new Vec3(-1, 0, 1)];
    return dirs[Math.floor(Math.random() * dirs.length)];
  };

  // ensure a block of given name is placed nearby; returns the placed block or null
  async function ensurePlacedBlock(blockName) {
    // 1) already placed?
    const existing = bot.findBlock({
      matching: mcData.blocksByName[blockName].id,
      maxDistance: 32
    });
    if (existing) {
      bot.chat(`${blockName} already present.`);
      return existing;
    }

    // 2) do we have the item?
    const item = bot.inventory.findInventoryItem(mcData.itemsByName[blockName].id);
    if (!item) {
      bot.chat(`I have no ${blockName} item to place.`);
      return null;
    }

    // 3) try to find a suitable spot (up to 10 attempts)
    for (let attempt = 0; attempt < 10; attempt++) {
      const dir = randomHorizontalDirection();
      const pos = bot.entity.position.offset(dir.x, 0, dir.z);
      const target = bot.blockAt(pos);
      const below = bot.blockAt(pos.offset(0, -1, 0));
      if (target && target.name === 'air' && below && below.name !== 'air') {
        try {
          await placeItem(bot, blockName, pos);
          const placed = bot.blockAt(pos);
          if (placed && placed.name === blockName) {
            bot.chat(`Placed ${blockName} at ${pos}`);
            return placed;
          }
        } catch (e) {
          // ignore and try another spot
        }
      }
    }

    // 4) if still not placed, explore a bit more
    const foundPos = await exploreUntil(bot, randomHorizontalDirection(), 60, () => {
      const dir = randomHorizontalDirection();
      const p = bot.entity.position.offset(dir.x, 0, dir.z);
      const t = bot.blockAt(p);
      const b = bot.blockAt(p.offset(0, -1, 0));
      if (t && t.name === 'air' && b && b.name !== 'air') {
        return p;
      }
      return null;
    });
    if (foundPos) {
      try {
        await placeItem(bot, blockName, foundPos);
        const placed = bot.blockAt(foundPos);
        if (placed && placed.name === blockName) {
          bot.chat(`Placed ${blockName} at ${foundPos}`);
          return placed;
        }
      } catch (e) {
        // fall through
      }
    }
    bot.chat(`Failed to place a ${blockName}.`);
    return null;
  }

  // ---------- 1. Safety: kill nearby hostile mobs ----------
  const hostile = bot.nearestEntity(e => e.type === 'mob' && (e.name === 'creeper' || e.name === 'zombie') && e.position.distanceTo(bot.entity.position) < 10);
  if (hostile) {
    bot.chat(`Hostile ${hostile.name} nearby, attacking.`);
    // use best weapon we have (iron_pickaxe > stone_pickaxe > wooden_pickaxe)
    const weaponPriority = ['iron_pickaxe', 'stone_pickaxe', 'wooden_pickaxe'];
    let weapon = null;
    for (const w of weaponPriority) {
      const id = mcData.itemsByName[w]?.id;
      if (id && bot.inventory.findInventoryItem(id)) {
        weapon = bot.inventory.findInventoryItem(id);
        break;
      }
    }
    if (weapon) await bot.equip(weapon, 'hand');
    await killMob(bot, hostile.name, 300);
  }

  // ---------- 2. Ensure we have 2 iron ingots ----------
  let ironIngots = countItem('iron_ingot');
  if (ironIngots < 2) {
    const needed = 2 - ironIngots;
    bot.chat(`Need ${needed} more iron ingot(s).`);

    // 2a) Smelt raw iron if we have it
    const rawIron = countItem('raw_iron');
    if (rawIron > 0) {
      const toSmelt = Math.min(needed, rawIron);
      // ensure furnace
      const furnaceBlock = await ensurePlacedBlock('furnace');
      if (!furnaceBlock) return;
      // use coal as fuel (we have at least 1)
      const fuelName = countItem('coal') > 0 ? 'coal' : null;
      if (!fuelName) {
        bot.chat('No fuel (coal) to smelt raw iron.');
        return;
      }
      bot.chat(`Smelting ${toSmelt} raw iron using ${fuelName}.`);
      await smeltItem(bot, 'raw_iron', fuelName, toSmelt);
      ironIngots = countItem('iron_ingot');
    }

    // 2b) If still not enough, mine iron ore (optional)
    if (ironIngots < 2) {
      const stillNeeded = 2 - ironIngots;
      bot.chat(`Mining ${stillNeeded} iron ore.`);
      const oreBlock = await exploreUntil(bot, randomHorizontalDirection(), 60, () => {
        return bot.findBlock({
          matching: mcData.blocksByName.iron_ore.id,
          maxDistance: 32
        });
      });
      if (!oreBlock) {
        bot.chat('Could not locate iron ore.');
        return;
      }
      await mineBlock(bot, 'iron_ore', stillNeeded);
      // ensure furnace again (might already exist)
      const furnaceBlock = await ensurePlacedBlock('furnace');
      if (!furnaceBlock) return;
      const fuelName = countItem('coal') > 0 ? 'coal' : null;
      if (!fuelName) {
        bot.chat('No fuel (coal) to smelt iron ore.');
        return;
      }
      await smeltItem(bot, 'iron_ore', fuelName, stillNeeded);
      ironIngots = countItem('iron_ingot');
    }
  }
  if (countItem('iron_ingot') < 2) {
    bot.chat('Failed to obtain enough iron ingots.');
    return;
  }

  // ---------- 3. Ensure we have a crafting table ----------
  const tableBlock = await ensurePlacedBlock('crafting_table');
  if (!tableBlock) return; // cannot continue without a table

  // ---------- 4. Ensure we have a stick ----------
  if (countItem('stick') < 1) {
    bot.chat('I have no stick to craft the sword.');
    return;
  }

  // ---------- 5. Craft the iron sword ----------
  bot.chat('Crafting iron sword...');
  await craftItem(bot, 'iron_sword', 1);

  // ---------- 6. Report result ----------
  if (countItem('iron_sword') >= 1) {
    bot.chat('Successfully crafted an iron sword!');
  } else {
    bot.chat('Crafting failed – iron sword not found.');
  }
}